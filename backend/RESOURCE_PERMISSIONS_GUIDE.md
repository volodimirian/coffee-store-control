# Resource-Based Permission Middleware

## Обзор

Создана система middleware для автоматической проверки прав доступа на основе ресурса и операции. Это исключает необходимость дублировать проверки прав в каждом endpoint.

## Основные компоненты

### 1. Файл: `app/core/resource_permissions.py`

Содержит:

- **Resource** - константы типов ресурсов (SUPPLIERS, INVOICES, CATEGORIES, и т.д.)
- **Action** - константы типов операций (VIEW, CREATE, EDIT, DELETE, ACTIVATE_DEACTIVATE, APPROVE, REJECT)
- **ResourcePermissionChecker** - класс dependency для проверки прав
- **require_resource_permission()** - функция для создания dependency
- **Extractors** - функции для извлечения business_id из различных источников

### 2. Архитектура

```
Request → Dependency → ResourcePermissionChecker
                          ↓
                    1. Extract business_id
                    2. Check business membership
                    3. Check resource permission
                    4. Return {"user_id": int, "business_id": int}
                          ↓
                    Endpoint logic
```

## Использование

### Базовый пример

```python
from app.core.resource_permissions import require_resource_permission, Resource, Action
from fastapi import Depends, APIRouter
from typing import Annotated

router = APIRouter()

@router.get("/suppliers/{supplier_id}")
async def get_supplier(
    supplier_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUPPLIERS,
        Action.VIEW
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    # auth = {"user_id": int, "business_id": Optional[int]}
    # Все проверки уже выполнены!
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    return supplier
```

### С custom extractor

Когда business_id нужно извлечь из связанного ресурса:

```python
@router.put("/{supplier_id}")
async def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUPPLIERS,
        Action.EDIT,
        business_id_extractor=extract_business_id_from_supplier  # <-- custom extractor
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    # business_id был извлечен из supplier по supplier_id
    ...
```

### Для CREATE операций

```python
@router.post("/")
async def create_supplier(
    supplier_data: SupplierCreate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUPPLIERS,
        Action.CREATE
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    # business_id извлечен из supplier_data.business_id автоматически
    supplier = await SupplierService.create_supplier(
        session=session,
        supplier_data=supplier_data,
        created_by_user_id=auth["user_id"],  # <-- user_id из auth
    )
    return supplier
```

## Автоматическое извлечение business_id

Middleware автоматически извлекает business_id из:

1. **Path parameters**: `business_id` в URL
2. **Request body**: `business_id` в JSON для CREATE
3. **Custom extractors**: для сложных случаев

### Встроенные extractors:

- `extract_business_id_from_supplier(request, db)` - из supplier_id
- `extract_business_id_from_invoice(request, db)` - из invoice_id
- `extract_business_id_from_category(request, db)` - из category_id/section_id
- `extract_business_id_from_unit(request, db)` - из unit_id

## Преимущества нового подхода

### ❌ Старый способ (ручные проверки в каждом endpoint):

```python
@router.put("/{supplier_id}")
async def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(404, "Supplier not found")

    # Проверка доступа к бизнесу
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=supplier.business_id,
    )
    if not has_access:
        raise HTTPException(403, create_error_response(
            ErrorCode.BUSINESS_ACCESS_DENIED,
            "Access denied"
        ))

    # Проверка прав
    has_permission = await check_user_permission(
        user_id=current_user.id,
        permission_name="edit_supplier",
        db=session,
        business_id=supplier.business_id
    )
    if not has_permission:
        raise HTTPException(403, create_error_response(
            ErrorCode.PERMISSION_EDIT_DENIED,
            "No permission"
        ))

    # Наконец, бизнес-логика
    updated = await SupplierService.update_supplier(...)
    return updated
```

### ✅ Новый способ (middleware):

```python
@router.put("/{supplier_id}")
async def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUPPLIERS,
        Action.EDIT,
        business_id_extractor=extract_business_id_from_supplier
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    # Все проверки уже сделаны! Сразу бизнес-логика:
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(404, "Supplier not found")

    updated = await SupplierService.update_supplier(...)
    return updated
```

## Сокращение кода

- **~20-30 строк** проверок на каждый endpoint → **1 строка** dependency
- Централизованная обработка ошибок
- Единообразный формат ответов при ошибках доступа
- Легко тестировать
- Легко расширять новыми ресурсами

## Mapping прав доступа

Права генерируются автоматически по формуле:

```
{action}_{resource_singular}
```

Примеры:

- `Resource.SUPPLIERS` + `Action.VIEW` → `view_supplier`
- `Resource.INVOICES` + `Action.CREATE` → `create_invoice`
- `Resource.CATEGORIES` + `Action.DELETE` → `delete_category`
- `Resource.INVOICES` + `Action.APPROVE` → `approve_invoice`

## Error Codes

Middleware автоматически возвращает правильные error codes:

| Action              | Error Code                            |
| ------------------- | ------------------------------------- |
| VIEW                | PERMISSION_VIEW_DENIED                |
| CREATE              | PERMISSION_CREATE_DENIED              |
| EDIT                | PERMISSION_EDIT_DENIED                |
| DELETE              | PERMISSION_DELETE_DENIED              |
| ACTIVATE_DEACTIVATE | PERMISSION_ACTIVATE_DEACTIVATE_DENIED |
| Others              | PERMISSION_DENIED                     |

## Пример миграции роутера

См. файл `supplier_router_v2.py` - полностью рефакторенный пример с использованием middleware.

### Сравнение размера кода:

- **Старый supplier_router.py**: ~300 строк
- **Новый supplier_router_v2.py**: ~250 строк (-17%)
- И это с улучшенной функциональностью!

## Следующие шаги

1. Постепенно мигрировать все роутеры на новый подход
2. Добавить extractors для остальных ресурсов (sections, month_periods, etc.)
3. Расширить при необходимости для более сложных сценариев

## FAQ

**Q: Что если мне нужен custom logic для проверки прав?**  
A: Создайте свой extractor или используйте `skip_business_check=True` и добавьте custom проверки в endpoint.

**Q: Как обрабатываются вложенные ресурсы (invoice_items)?**  
A: Используйте extractor который извлекает business_id через parent ресурс (invoice).

**Q: Можно ли использовать несколько permission checks?**  
A: Да, просто добавьте несколько dependencies с разными правами.
