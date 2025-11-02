# Coffee Control - Updated Comprehensive Task List

## 📋 Project Overview

**Coffee Control** - веб-приложение системы учета расходов для кофеен с возможностью управления несколькими филиалами, детализированной ролевой системой и табличным учетом закупок по месяцам (аналог замены Excel-учета).

**Ключевые особенности системы:**

- Помесячный табличный учет расходов (как Excel, но в веб)
- Автоматическая конвертация единиц измерения и расчет средних цен
- Гибкая система ролей и прав доступа по филиалам
- Автоматизация создания новых периодов учета (15-го числа каждого месяца)
- Экспорт данных в Excel/PDF для бухгалтерии
- Журнал всех изменений для контроля финансовых операций

**🚀 Current Development Session: Expense Tracking Foundation**

### ✅ **COMPLETED - Expense Tracking Backend Foundation (Group 5) - Core Foundation 80%**

**📋 Session Achievements:**

- ✅ **Navigation Enhancement**: Grouped menu sections with collapsible business/account areas
- ✅ **Expense Page Foundation**: Basic expense tracking page with dashboard layout
- ✅ **Backend Database Design**: Comprehensive schema for expense tracking, suppliers, and inventory
- ✅ **Unit Management System**: Complete CRUD operations with conversion factors and business context
- ✅ **Supplier Management**: Complete CRUD operations with business-specific access control
- ✅ **Month Period Management**: Accounting periods with status management (ACTIVE, CLOSED)
- ✅ **Expense Categories System**: Hierarchical organization with sections and categories
- ✅ **Audit Trail Implementation**: Consistent created_by fields across all expense entities

**💡 Core Systems Implemented:**

- **Units API**: Weight/volume/count types with conversion factors, business isolation
- **Suppliers API**: Contact management, search functionality, business access control
- **Month Periods API**: Period lifecycle management with status transitions
- **Expense Structure API**: Hierarchical sections and categories with ordering support
- **Database Migrations**: All tables created with proper Foreign Keys and constraints
- **Service Layer**: Complete business logic with validation and error handling
- **API Routers**: Full REST endpoints with authentication and authorization

**🗃️ Database Schema Completed:**

1. ✅ `units` - measurement units with conversion factors and business context
2. ✅ `suppliers` - supplier management per business with audit trails
3. ✅ `month_periods` - monthly accounting periods with status management
4. ✅ `expense_sections` and `expense_categories` - hierarchical product organization
5. 🔄 `invoices` and `invoice_items` - purchase documentation (NEXT PRIORITY)
6. 🔄 `expense_records` - daily usage tracking
7. 🔄 `inventory_balances` - calculated balances and remainders

---

**🎉 Previous Achievements (Business Management System)**

### ✅ **FULLY COMPLETED - Business Management System (Group 3) - 100%**

**🏢 Complete Business Management Backend + Frontend with Full UI/UX**

- ✅ **SQLAlchemy models**: Business and UserBusiness with composite primary key
- ✅ **Database migrations**: Tables businesses and user_businesses with proper constraints
- ✅ **Pydantic schemas**: BusinessCreate, BusinessUpdate, BusinessOut for API validation
- ✅ **Business service**: Full CRUD operations with permission checking
- ✅ **REST API endpoints**: Complete business management API (/api/businesses)
- ✅ **Permission integration**: Business context in permission system
- ✅ **Auto business creation**: Owner automatically added when creating business
- ✅ **Frontend LocationSelector**: Smart dropdown with role-based access control
- ✅ **Frontend LocationModal**: Universal modal for create/edit (replaced duplicate AddLocationModal)
- ✅ **Frontend ConfirmDeleteModal**: Beautiful delete confirmation with translucent backdrop
- ✅ **Frontend Locations Page**: Complete location management interface with grid layout
- ✅ **AppContext integration**: Reactive state management for locations
- ✅ **UI/UX improvements**: Click outside to close, scroll optimizations, constants usage
- ✅ **Internationalization**: All location UI text properly localized (en/ru)
- ✅ **Translucent overlays**: Proper alpha channel usage (bg-black/50) for all modals
- ✅ **API filtering fix**: Soft-deleted locations properly filtered from frontend
- ✅ **Location Context Management**: Complete AppContext with localStorage persistence
- ✅ **Interactive Location Switching**: Dropdown selector with seamless switching
- ✅ **Location Indicator**: Header component showing current active location
- ✅ **Auto-Selection Logic**: Automatic first location selection for new users
- ✅ **State Synchronization**: Real-time updates between CRUD operations and context

**📊 API Endpoints Tested**

- POST /api/businesses/ - Create business ✅ WORKING
- GET /api/businesses/my - Get user businesses ✅ WORKING
- GET /api/businesses/owned - Get owned businesses ✅ WORKING
- GET /api/businesses/{id} - Get specific business ✅ WORKING
- PUT /api/businesses/{id} - Update business ✅ WORKING
- GET /api/businesses/{id}/members - Get business members ✅ WORKING
- All endpoints with proper authentication and authorization ✅ WORKING

**🧪 Testing Results**

- All core business operations tested via curl
- Permission system integration verified
- Database relationships working correctly
- Auto-assignment of business owner confirmed
- Business context in permissions functional

---

## 📋 Previous Achievements

### ✅ **Completed - Advanced Permission System (Group 2)**

**🔐 Comprehensive Role-Based Permission System**

- ✅ **Priority-based permissions**: User permissions override role permissions
- ✅ **Business-specific contexts**: Multi-location coffee shop support
- ✅ **Active/inactive states**: Flexible permission control
- ✅ **Optimized SQL queries**: ~70% performance improvement over Python filtering
- ✅ **Full test coverage**: 45/45 core tests passing (permissions + dependencies + security)
- ✅ **API integration**: FastAPI dependencies for route protection
- ✅ **Database migrations**: Production-ready permission tables

**📊 Performance Metrics**

- Database queries reduced by ~70% through SQL optimization
- Memory usage significantly lower (targeted data fetching)
- Scalable O(1) permission checking with proper indexes
- Comprehensive error handling and edge case coverage

**🧪 Testing Excellence**

- 18/18 permission system tests passing
- 18/18 dependency management tests passing
- 9/9 security and authentication tests passing
- Integration tests via API endpoints
- Edge case coverage (nonexistent users, permissions, etc.)

**🎨 UI/UX Improvements**

- ✅ **Responsive design**: Mobile-first sidebar with collapsible states
- ✅ **Internationalization**: Full i18n integration (en/ru) with LanguageSelector
- ✅ **Registration fix**: Removed role tabs, fixed to business_owner only
- ✅ **Component architecture**: Reusable Sidebar, Layout, and page components
- ✅ **Brand consistency**: Coffee Control branding throughout the application

---

## 🏗️ ГРУППА 1: АРХИТЕКТУРА И БАЗОВАЯ НАСТРОЙКА

### ✅ Завершенные задачи

- [x] **Backend**: Настройка FastAPI проекта с SQLAlchemy и Alembic
- [x] **Backend**: Подключение PostgreSQL базы данных
- [x] **Backend**: Базовая система миграций Alembic
- [x] **Backend**: Настройка Docker контейнеров для разработки
- [x] **Backend**: Настройка OpenAPI/Swagger документации с API префиксом `/api/`
- [x] **Backend**: Comprehensive unit testing setup (pytest + 45/45 core tests passing)
- [x] **Backend**: Code quality improvements (Ruff linting, type hints)
- [x] **Backend**: Model consolidation (app.users.models → app.core_models)
- [x] **Frontend**: Создание React приложения с Vite
- [x] **Frontend**: Настройка TypeScript и Tailwind CSS
- [x] **Frontend**: Интеграция с i18next для мультиязычности (en/ru)
- [x] **Frontend**: Установка и настройка Heroicons
- [x] **Frontend**: Настройка React Router для маршрутизации

### 📝 Задачи в разработке

- [ ] **Backend**: Защищенная документация API (доступ только для администраторов)
- [ ] **Backend**: Настройка PWA манифеста для установки на телефон
- [ ] **Frontend**: Настройка автоматических тестов (React Testing Library)
- [ ] **Backend**: Система логирования изменений (audit trails)
- [ ] **DevOps**: Настройка cron-задач для автоматизации периодов

---

## 🔐 ГРУППА 2: РАСШИРЕННАЯ СИСТЕМА РОЛЕЙ И ПРАВ

### ✅ Завершенные задачи

- [x] **Backend**: Базовые модели User и Role
- [x] **Backend**: JWT токенизация для аутентификации
- [x] **Backend**: Эндпоинты регистрации и входа
- [x] **Backend**: Comprehensive permission system with priority logic (user > role permissions)
- [x] **Backend**: Database schema for permissions, role_permissions, user_permissions
- [x] **Backend**: Business-specific permissions support (business_id context)
- [x] **Backend**: Optimized SQL queries for permission checking (~70% performance improvement)
- [x] **Backend**: Permission management functions (grant, revoke, check)
- [x] **Backend**: FastAPI dependencies for route protection (@require_permission)
- [x] **Backend**: Full test coverage (18/18 permission tests + 18/18 dependency tests)
- [x] **Frontend**: Базовые формы логина и регистрации
- [x] **Frontend**: Управление токенами в localStorage
- [x] **Frontend**: Защищенные маршруты (ProtectedRoute)
- [x] **Frontend**: Registration role fixed to business_owner only (no role tabs)

### 📝 Задачи в разработке

#### Backend: Детализированная ролевая система

- [x] **Backend**: Создать таблицу `permissions` (id, name, description, resource, action, is_active, created_at)
- [x] **Backend**: Создать таблицу `role_permissions` (role_id, permission_id, is_active, created_at, updated_at)
- [x] **Backend**: Создать таблицу `user_permissions` (user_id, permission_id, business_id, is_active, created_at, updated_at)
- [x] **Backend**: Реализовать 3 основные роли: admin, business_owner, employee,
- [x] **Backend**: Создать детальные права для модуля "Учёт расходов":
  - MANAGE_USERS (управление пользователями)
  - MANAGE_MONTHS (управление месяцами)
  - VIEW_DATA (просмотр данных)
  - ADD_DATA (добавление данных)
  - EDIT_DATA (редактирование данных)
  - MANAGE_SECTIONS (управление разделами)
  - VIEW_TOTALS (просмотр итогов)
  - EXPORT_DATA (выгрузка данных)
- [x] **Backend**: Система проверки прав `check_user_permission()` с приоритетами
- [x] **Backend**: Управление правами `grant_user_permission()` и `revoke_user_permission()`
- [x] **Backend**: Middleware `PermissionChecker` и `@require_permission` для проверки прав
- [x] **Backend**: Контекст филиала в правах доступа (business_id поддержка)
- [x] **Backend**: Оптимизированные SQL запросы для проверки прав
- [x] **Backend**: Comprehensive testing (18/18 permission tests passing)
- [ ] **Backend**: Эндпоинты настройки прав `/api/access-control`

#### Frontend: Интерфейс управления правами

- [x] **Frontend**: Убрать табы ролей из регистрации (только business_owner)
- [ ] **Frontend**: Раздел "Настройки доступа" для управления правами
- [ ] **Frontend**: Интерфейс назначения прав с галочками/переключателями
- [ ] **Frontend**: Всплывающие окна при наведении на пользователя с правами
- [ ] **Frontend**: Индикатор текущей роли пользователя
- [ ] **Frontend**: Скрытие функций на основе прав доступа

---

## 🏢 ГРУППА 3: УПРАВЛЕНИЕ КОФЕЙНЯМИ И НАВИГАЦИЯ

### ✅ Завершенные задачи

- [x] **Backend**: Создать таблицу `businesses` (id, name, city, address, owner_id) ✅ ПРОТЕСТИРОВАНО
- [x] **Backend**: Связь пользователя с несколькими кофейнями через отдельную таблицу связей юзеров и бизнеса ✅ ПРОТЕСТИРОВАНО
- [x] **Backend**: Эндпоинты CRUD для кофеен `/api/businesses` ✅ ПРОТЕСТИРОВАНО
- [x] **Backend**: Контроль доступа по филиалам для каждого модуля ✅ ПРОТЕСТИРОВАНО
- [x] **Backend**: Автоматическое создание первой кофейни при регистрации ✅ ПРОТЕСТИРОВАНО
- [x] **Backend**: SQLAlchemy модели Business и UserBusiness с составным primary key ✅ ПРОТЕСТИРОВАНО
- [x] **Backend**: Pydantic схемы для валидации данных бизнес API ✅ ПРОТЕСТИРОВАНО
- [x] **Backend**: Бизнес-сервис с CRUD операциями и проверкой прав ✅ ПРОТЕСТИРОВАНО
- [x] **Backend**: Миграции базы данных для таблиц businesses и user_businesses ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: LocationSelector - дропдаун "Мои локации" в sidebar с role-based контролем ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: AddLocationModal - форма добавления новой локации с валидацией ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: AppContext интеграция - реактивное управление состоянием локаций ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: UX улучшения - click outside to close, scroll optimization ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: Internationalization - полная локализация UI (en/ru) ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: Constants usage - замена magic strings на централизованные константы ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: LocationModal - универсальное модальное окно для создания и редактирования локаций ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: ConfirmDeleteModal - модальное окно подтверждения удаления с полупрозрачным фоном ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: Страница управления локациями - полный UI со списком локаций и действиями ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: Исправление soft delete - фильтрация неактивных локаций в API запросах ✅ ПРОТЕСТИРОВАНО
- [x] **Frontend**: UI отступы - правильные отступы для активного лейбла и названия локации ✅ ИСПРАВЛЕНО
- [x] **Frontend**: Переключение между кофейнями с сохранением контекста в localStorage ✅ COMPLETED
- [x] **Frontend**: Индикатор текущей активной кофейни в header/navigation или sidebar ✅ COMPLETED

### ✅ Завершенные задачи (Навигация по кофейням)

- [x] **Frontend**: LocationSelector - выпадающее меню "Мои локации" в sidebar ✅ COMPLETED
- [x] **Frontend**: AddLocationModal - форма добавления новой кофейни (название, город, адрес) ✅ COMPLETED
- [x] **Frontend**: AppContext интеграция - централизованное управление состоянием локаций ✅ COMPLETED
- [x] **Frontend**: Role-based access control - показ функций в зависимости от роли ✅ COMPLETED
- [x] **Frontend**: UI/UX оптимизации - click outside, scroll, constants ✅ COMPLETED
- [x] **Frontend**: LocationModal - универсальное модальное окно для создания и редактирования ✅ COMPLETED
- [x] **Frontend**: ConfirmDeleteModal - модальное окно подтверждения удаления ✅ COMPLETED
- [x] **Frontend**: Страница управления локациями со списком и действиями ✅ COMPLETED
- [x] **Frontend**: Исправление API для фильтрации удаленных локаций ✅ COMPLETED
- [x] **Frontend**: Интерактивное переключение между локациями с dropdown в LocationSelector ✅ COMPLETED
- [x] **Frontend**: Сохранение выбранной локации в localStorage с автовосстановлением ✅ COMPLETED
- [x] **Frontend**: LocationIndicator в header - индикатор текущей активной локации ✅ COMPLETED
- [x] **Frontend**: Автоматический выбор первой локации при отсутствии выбранной ✅ COMPLETED
- [x] **Frontend**: Синхронизация состояния локаций с CRUD операциями ✅ COMPLETED

---

## 👥 ГРУППА 4: УПРАВЛЕНИЕ СОТРУДНИКАМИ

### ✅ Завершенные задачи

#### Backend: Система пользователей и сотрудников

- [x] **Backend**: Расширить модель User для сотрудников (связь с кофейнями через UserBusiness) ✅ COMPLETED
- [x] **Backend**: Эндпоинты добавления сотрудников `/api/businesses/{id}/employees` ✅ COMPLETED
- [x] **Backend**: CRUD операции для сотрудников (create, get, update role, deactivate, reactivate) ✅ COMPLETED
- [x] **Backend**: Система прав доступа для сотрудников (grant/revoke permissions single/batch) ✅ COMPLETED
- [x] **Backend**: Валидация ролей (employee, manager, owner) ✅ COMPLETED
- [x] **Backend**: Soft delete для сотрудников (is_active поле) ✅ COMPLETED
- [x] **Backend**: Хэширование паролей (bcrypt) ✅ COMPLETED

#### Frontend: Управление пользователями

- [x] **Frontend**: Страница управления сотрудниками `/employees` с навигацией ✅ COMPLETED
- [x] **Frontend**: EmployeeModal для создания и редактирования сотрудников ✅ COMPLETED
- [x] **Frontend**: PermissionModal для управления правами доступа ✅ COMPLETED
- [x] **Frontend**: Карточки сотрудников с role badges и permission badges ✅ COMPLETED
- [x] **Frontend**: Деактивация/реактивация сотрудников ✅ COMPLETED
- [x] **Frontend**: Редактирование роли сотрудника (только роль, email/username неизменяемы) ✅ COMPLETED
- [x] **Frontend**: Checkbox grid для управления правами (группировка по resource) ✅ COMPLETED
- [x] **Frontend**: Валидация форм (email format, password min 6, username min 3) ✅ COMPLETED
- [x] **Frontend**: Интернационализация (employees._ и permissions._ namespaces) ✅ COMPLETED
- [x] **Frontend**: Управление активностью сотрудников (активные/неактивные секции) ✅ COMPLETED

### 📝 Задачи в разработке (Future enhancements)

- [ ] **Backend**: Система email приглашений сотрудников
- [ ] **Backend**: Подтверждение регистрации через email/SMS
- [ ] **Backend**: Восстановление паролей
- [ ] **Frontend**: Форма подтверждения регистрации (ввод кода)
- [ ] **Frontend**: Личная информация в профиле (смена пароля, фото)
- [ ] **Frontend**: Форма восстановления пароля
- [ ] **Frontend**: Batch permission management (multiple users at once)

---

## 📊 ГРУППА 5: МОДУЛЬ "УЧЁТ РАСХОДОВ" (ОСНОВНОЙ)

### 📝 Задачи в разработке - это ядро системы

#### Backend: Основные справочники и единицы измерения

- [x] **Backend**: Создать таблицу `units` (id, name, symbol, unit_type, base_unit_id, conversion_factor, business_id, description, is_active, created_at, updated_at) ✅ COMPLETED

  - Единицы измерения: граммы (г), килограммы (кг), миллилитры (мл), литры (л), штуки (шт), бутылки, упаковки и т.д.
  - `unit_type` - тип единицы: weight, volume, count
  - `base_unit_id` - ссылка на базовую единицу (г для веса, мл для объема, шт для количества)
  - `conversion_factor` - коэффициент конвертации в базовую единицу (1кг = 1000г, 1л = 1000мл)
  - `business_id` - привязка к филиалу, `description` - дополнительное описание единицы

- [x] **Backend**: Создать таблицу `suppliers` (id, name, contact_info, business_id, created_by, is_active, created_at, updated_at) ✅ COMPLETED
  - Поставщики для каждого бизнеса
  - `contact_info` - JSON поле с телефоном, email, адресом, ИНН и т.д.
  - `created_by` - пользователь, создавший поставщика (audit trail)

#### Backend: Структура данных для табличного учета

- [x] настроить translation file для английского языка & удалить ненужные ключи по активации не активации и т.д.
- [x] при не активных секциях (категориях) не отображаются категории (подкатегории)
- [x] **НОВОЕ**: Добавить функциональность редактирования категорий и секций через универсальные модальные окна
- [x] **НОВОЕ**: Создать универсальные компоненты CategoryModal и SectionModal для создания/редактирования
- [x] **НОВОЕ**: Добавить ConfirmDeleteModal для подтверждения удаления категорий и секций
- [x] **НОВОЕ**: Исправить логику деактивации - при деактивации секции автоматически деактивируются все её категории
- [x] **НОВОЕ**: Скрыть кнопки редактирования для неактивных секций
- [x] **НОВОЕ**: Полная локализация всех модальных окон (ru/en)
- [ ] если категорию делать не активной то основная таблица не загружается
- [ ] если деактивировать подкатегорию то она продолжает отображаться в таблице.

**🔄 Unit Conversion in Inventory Tracking (In Progress)**

- [ ] **Backend**: Extend invoice_items endpoint to support unit conversion to category default unit
  - Add `convert_to_category_unit` query parameter to `/api/expenses/invoices/{invoice_id}/items`
  - Return additional fields: `converted_quantity`, `original_unit_id`, `original_quantity`
  - Reuse existing `_convert_quantity_to_target_unit` from InventoryBalanceService
  - All conversions happen on backend, return ready-to-display values
- [ ] **Frontend**: Update InventoryTrackingTab to use converted quantities
  - Call API with `convert_to_category_unit=true` parameter
  - Display `converted_quantity` in table cells
  - Add tooltip showing original quantity, unit, and invoice number
  - Format: "Originally: 5000 г (Invoice #1234)" → "Converted: 5 кг"
- [ ] **Future Optimization**: Create batch endpoint for better performance

  - Create `/api/expenses/inventory-tracking/monthly-data` endpoint
  - Accept: business_id, year, month
  - Return: pre-calculated and converted data for all categories/days
  - Reduces N+1 queries and improves performance for 100+ invoices
  - Use Decimal.js on frontend for precise calculations if needed

- [x] **Backend**: Создать таблицу `month_periods` (id, name, business_id, year, month, status, is_active, created_at, updated_at) ✅ COMPLETED

  - `status` - enum: active, closed, archived
  - Активный период для ввода данных по месяцам

- [x] **Backend**: Создать таблицу `expense_sections` (id, name, business_id, month_period_id, order_index, created_by, is_active, created_at, updated_at) ✅ COMPLETED

  - Разделы расходов: "Кофе и зерно", "Молочные продукты", "Расходники", etc.
  - Привязка к бизнесу и периоду месяца
  - `created_by` - пользователь, создавший раздел (audit trail)

- [x] **Backend**: Создать таблицу `expense_categories` (id, name, section_id, default_unit_id, order_index, created_by, is_active, created_at, updated_at) ✅ COMPLETED
  - Категории товаров внутри разделов: "Кофе арабика", "Молоко 3.2%", "Стаканы 250мл"
  - `default_unit_id` - единица измерения по умолчанию
  - `created_by` - пользователь, создавший категорию (audit trail)

#### Backend: Накладные и документооборот

- [ ] **Backend**: Создать таблицу `invoices` (id, business_id, supplier_id, invoice_number, invoice_date, total_amount, paid_status, paid_date, document_path, created_by, created_at, updated_at)

  - Накладные от поставщиков
  - `paid_status` - enum: pending, paid, cancelled
  - `document_path` - путь к файлу накладной (PDF/изображение)

- [ ] **Backend**: Создать таблицу `invoice_items` (id, invoice_id, category_id, quantity, unit_id, unit_price, total_price, created_at, updated_at)
  - Позиции в накладной
  - Привязка к категории товара и единице измерения

#### Backend: Записи расходов и остатки

- [ ] **Backend**: Создать таблицу `expense_records` (id, category_id, month_period_id, date, quantity_used, unit_id, invoice_item_id, created_by, created_at, updated_at)

  - Записи использования товаров по дням
  - `invoice_item_id` - связь с позицией накладной (откуда взяли товар)

- [ ] **Backend**: Создать таблицу `inventory_balances` (id, category_id, month_period_id, opening_balance, purchases_total, usage_total, closing_balance, unit_id, last_calculated, created_at, updated_at)
  - Остатки товаров на начало/конец месяца
  - `opening_balance` - остаток на начало месяца (перенос с предыдущего)
  - `purchases_total` - закуплено за месяц
  - `usage_total` - использовано за месяц
  - `closing_balance` - остаток на конец месяца

#### Backend: Аудит и история изменений

- [ ] **Backend**: Создать таблицу `audit_trail` (id, table_name, record_id, action, old_value, new_value, user_id, business_id, timestamp)
  - `action` - enum: CREATE, UPDATE, DELETE
  - Полная история изменений всех финансовых операций

#### Backend: Бизнес-логика расчетов и остатков

**Псевдокод для расчета остатков:**

```python
def calculate_inventory_balance(category_id, month_period_id):
    """
    Расчет остатков товара на конец месяца
    """
    # 1. Получить остаток на начало месяца
    opening_balance = get_previous_month_closing_balance(category_id)

    # 2. Посчитать все закупки за месяц (из оплаченных накладных)
    purchases = sum(
        invoice_items.quantity
        for invoice_item in get_paid_invoice_items(category_id, month_period_id)
    )

    # 3. Посчитать все использование за месяц
    usage = sum(
        expense_record.quantity_used
        for expense_record in get_expense_records(category_id, month_period_id)
    )

    # 4. Рассчитать остаток на конец месяца
    closing_balance = opening_balance + purchases - usage

    # 5. Обновить inventory_balances
    update_inventory_balance(category_id, month_period_id, {
        'opening_balance': opening_balance,
        'purchases_total': purchases,
        'usage_total': usage,
        'closing_balance': closing_balance,
        'last_calculated': datetime.now()
    })

    return closing_balance

def calculate_average_unit_price(category_id, month_period_id):
    """
    Средневзвешенная цена единицы товара
    """
    # Получить все покупки товара за период с ценами
    purchases = get_paid_invoice_items_with_prices(category_id, month_period_id)

    total_quantity = sum(p.quantity for p in purchases)
    total_cost = sum(p.quantity * p.unit_price for p in purchases)

    if total_quantity > 0:
        return total_cost / total_quantity
    return 0

def transfer_closing_balances_to_next_month(business_id, current_month, next_month):
    """
    Перенос остатков в следующий месяц (автоматически 15 числа)
    """
    balances = get_closing_balances(business_id, current_month)

    for balance in balances:
        create_opening_balance_for_next_month(
            category_id=balance.category_id,
            month_period_id=next_month.id,
            opening_balance=balance.closing_balance,
            unit_id=balance.unit_id
        )
```

#### Backend: API эндпоинты

- [x] **Backend**: API управления справочниками `/api/expenses/units` (CRUD единиц измерения) ✅ COMPLETED
- [x] **Backend**: API управления поставщиками `/api/expenses/suppliers` (CRUD поставщиков) ✅ COMPLETED
- [x] **Backend**: API управления структурой `/api/expenses/sections` и `/api/expenses/categories` ✅ COMPLETED
- [x] **Backend**: API для периодов `/api/expenses/periods` (переключение месяцев, создание нового) ✅ COMPLETED
- [ ] **Backend**: API для накладных `/api/expenses/invoices` (создание, оплата, просмотр)
- [ ] **Backend**: API для записей расходов `/api/expenses/records` (ввод данных по дням)
- [ ] **Backend**: API для остатков `/api/expenses/balances` (просмотр остатков, пересчет)

#### Backend: Автоматизация и cron-задачи

- [ ] **Backend**: Автоматическое создание нового месяца 15-го числа (cron-задача)
- [ ] **Backend**: Копирование структуры разделов/категорий при создании месяца
- [ ] **Backend**: Перенос остатков товаров в новый месяц
- [ ] **Backend**: Связывание текущего и будущего месяца до 1-го числа
- [ ] **Backend**: Автоматический пересчет остатков при изменении записей

#### Frontend: Табличный интерфейс (как Excel)

- [ ] **Frontend**: Компонент таблицы с днями месяца как колонки (1-31)
- [ ] **Frontend**: Отображение разделов и товаров как строки
- [ ] **Frontend**: Редактирование ячеек (количество/сумма) прямо в таблице
- [ ] **Frontend**: Итоговые колонки (кол-во, сумма, средняя цена за единицу)
- [ ] **Frontend**: Выделение текущего дня и выходных дней
- [ ] **Frontend**: Вкладки месяцев под таблицей для переключения

#### Frontend: Управление структурой таблицы

- [ ] **Frontend**: Кнопка "Добавить раздел" с диалогом ввода названия
- [ ] **Frontend**: Кнопка "Добавить товар" с выбором раздела
- [ ] **Frontend**: Редактирование названий разделов/товаров (двойной клик)
- [ ] **Frontend**: Удаление разделов/товаров с подтверждением
- [ ] **Frontend**: Drag-and-drop сортировка разделов и товаров
- [ ] **Frontend**: Отдельная панель сортировки списком

#### Frontend: Дополнительные функции

- [ ] **Frontend**: Фильтр и поиск по товарам с детализацией
- [ ] **Frontend**: Экспорт таблицы в Excel/PDF
- [ ] **Frontend**: Экспорт истории по конкретному товару
- [ ] **Frontend**: Всплывающие подсказки с историей изменений ячейки
- [ ] **Frontend**: Отображение средней стоимости единицы товара
- [ ] **Frontend**: Скрытие итогов для пользователей без прав

---

## 💰 ГРУППА 6: МОДУЛЬ "РАСШИРЕННЫЕ ОПЛАТЫ И ФИНАНСЫ"

### 📝 Задачи в разработке (после основного модуля учета)

#### Backend: Расширенная финансовая отчетность

- [x] **Backend**: ~~Создать таблицу `suppliers`~~ ✅ ПЕРЕНЕСЕНО В ГРУППУ 5
- [x] **Backend**: ~~Создать таблицу `invoices`~~ ✅ ПЕРЕНЕСЕНО В ГРУППУ 5
- [x] **Backend**: ~~Создать таблицу `invoice_items`~~ ✅ ПЕРЕНЕСЕНО В ГРУППУ 5
- [ ] **Backend**: Создать таблицу `payment_methods` (id, name, is_active) - Способы оплаты (наличные, карта, перевод)
- [ ] **Backend**: Создать таблицу `invoice_payments` (id, invoice_id, payment_method_id, amount, payment_date, created_by)
- [ ] **Backend**: Логика частичных оплат накладных
- [ ] **Backend**: API расширенной финансовой отчетности `/api/finances/reports`
- [ ] **Backend**: API управления способами оплаты `/api/finances/payment-methods`

#### Frontend: Интерфейс расширенных финансов

- [ ] **Frontend**: Список поставщиков с возможностью добавления/редактирования
- [ ] **Frontend**: Форма создания накладной с привязкой к поставщику
- [ ] **Frontend**: Интерфейс частичных оплат накладных
- [ ] **Frontend**: Финансовые отчеты по поставщикам и оплатам
- [ ] **Frontend**: Календарь платежей и задолженностей

---

## 📈 ГРУППА 7: МОДУЛЬ "СТАТИСТИКА" И ОТЧЕТНОСТЬ

### 📝 Задачи в разработке

#### Backend: Аналитические данные

- [ ] **Backend**: API для сводных отчетов по расходам `/api/reports/expenses`
- [ ] **Backend**: API для финансовых итогов по месяцам `/api/reports/financial`
- [ ] **Backend**: Расчет общих объемов по категориям единиц (кг, л, шт)
- [ ] **Backend**: API для сравнительной аналитики по месяцам
- [ ] **Backend**: Экспорт отчетов в различных форматах

#### Frontend: Аналитические дашборды

- [ ] **Frontend**: Дашборд для business_owner с КПИ и общими показателями
- [ ] **Frontend**: Итоговая страница закупов с финансовыми метриками
- [ ] **Frontend**: Графики динамики расходов по месяцам
- [ ] **Frontend**: Топ-товары по затратам за период
- [ ] **Frontend**: Сравнение показателей между филиалами

---

## 🛠️ ГРУППА 8: МОДУЛИ СПРАВОЧНИКОВ

### 📝 Задачи в разработке

#### Backend и Frontend: Модуль "ТОВАРЫ"

- [ ] **Backend**: Справочник товаров с единицами измерения
- [ ] **Backend**: Конвертационные коэффициенты для единиц
- [ ] **Frontend**: Управление справочником товаров
- [ ] **Frontend**: Настройка единиц измерения и коэффициентов

#### Backend и Frontend: Модуль "ГРАФИК РАБОТЫ"

- [ ] **Backend**: Система смен и рабочего времени сотрудников
- [ ] **Frontend**: Табель учета рабочего времени
- [ ] **Frontend**: График смен для менеджеров

#### Backend и Frontend: Служебные разделы

- [ ] **Frontend**: Раздел "История изменений" с фильтрацией
- [ ] **Frontend**: Раздел "Чат поддержки" (заглушка)
- [ ] **Frontend**: Раздел "Регламент" (статическая информация)
- [ ] **Frontend**: Раздел "Тех. карты" (заглушка для рецептур)

---

## 🎨 ГРУППА 9: UI/UX КОМПОНЕНТЫ

### ✅ Завершенные задачи

- [x] **Frontend**: Ребрендинг с LatAm Crypto на Coffee Control
- [x] **Frontend**: Создание компонента Sidebar с collapsible функциональностью
- [x] **Frontend**: Обновление Layout.tsx с новой структурой
- [x] **Frontend**: Создание базовых страниц (Products, Orders, Analytics, Settings)
- [x] **Frontend**: Настройка маршрутизации для новых страниц
- [x] **Frontend**: Полный перевод на систему i18n (удаление хардкоженных строк)
- [x] **Frontend**: Responsive sidebar с mobile overlay и collapsible состоянием
- [x] **Frontend**: LanguageSelector компонент с dropdown интерфейсом
- [x] **Frontend**: Финальное тестирование responsive поведения (sidebar, mobile, desktop)

### 📝 Задачи в разработке

- [ ] **Frontend**: Компонент табличного редактора с Excel-подобным интерфейсом
- [ ] **Frontend**: Система всплывающих подсказок (tooltips)
- [ ] **Frontend**: Модальные окна для форм и подтверждений
- [ ] **Frontend**: Система уведомлений и алертов
- [ ] **Frontend**: Индикаторы загрузки для всех операций
- [ ] **Frontend**: Навигация клавишами в таблице (стрелки, Enter)
- [ ] **Frontend**: Выделение текущего дня и выходных в таблице

---

## 🔧 ГРУППА 10: ТЕХНИЧЕСКАЯ ИНФРАСТРУКТУРА

### 📝 Задачи в разработке

#### Backend: Системные функции

- [ ] **Backend**: Защищенная документация API с авторизацией
  - Создать middleware для проверки прав доступа к `/docs` и `/redoc`
  - Доступ только для пользователей с ролью `admin` или специальным правом `api_docs_read`
  - Редирект на страницу входа для неавторизованных пользователей
  - Настройка условного отключения документации в production
- [ ] **Backend**: Cron-задачи автоматического создания месяцев
- [ ] **Backend**: Система email уведомлений (или упрощенная)
- [ ] **Backend**: Валидация бизнес-правил (уникальность товаров и т.д.)
- [ ] **Backend**: Обработка плавающих чисел в копейках
- [ ] **Backend**: Система бэкапов и восстановления
- [ ] **Backend**: Индексы БД для оптимизации табличных запросов

#### DevOps и деплой

- [ ] **DevOps**: Docker-контейнеры для всех компонентов
- [ ] **DevOps**: CI/CD пайплайн для автоматического деплоя
- [ ] **DevOps**: HTTPS и безопасность передачи данных
- [ ] **DevOps**: Мониторинг и логирование системы
- [ ] **DevOps**: Backup стратегия для PostgreSQL

---

## ❓ ВОПРОСЫ ДЛЯ УТОЧНЕНИЯ (обновленные)

### 🔍 **Детали реализации системы учета:**

1. **Автоматизация периодов**: Подтвердить точный алгоритм создания месяца 15-го числа и синхронизации структуры

2. **Конвертация единиц**: Список конкретных единиц измерения и коэффициентов конверсии (кг→г, л→мл, ящик→шт)

3. **Остатки товаров**: Как именно реализовать перенос остатков между месяцами? Отдельный модуль или в рамках учета расходов?

4. **Система оплат**: Степень интеграции между модулем "Расходы" и "Оплаты" - автоматическое создание накладных?

5. **Email/SMS**: Реализовать полноценную интеграцию или упрощенную систему подтверждений?

6. **Экспорт**: Точные требования к формату Excel/PDF файлов, какие данные включать

7. **История изменений**: Уровень детализации логирования - все поля или только ключевые операции?

8. **Производительность**: Ожидаемое количество филиалов, пользователей и объем данных за год

### 🎯 **Бизнес-логика:**

9. **Права доступа**: Матрица прав по модулям (не только "Учет расходов")

10. **Мульти-филиальность**: Могут ли сотрудники работать в нескольких филиалах одновременно?

11. **Архивация**: Срок хранения данных, нужна ли архивация старых месяцев?

12. **Валидация**: Бизнес-правила для проверки корректности данных (лимиты, ограничения)

---

## 📋 ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### ✅ **Завершенные приоритеты:**

1. ~~**Группа 2**: Система ролей и прав доступа~~ **✅ COMPLETED**
   - Comprehensive permission system with priority logic
   - Optimized database queries (~70% performance improvement)
   - Full test coverage (45/45 tests passing)
   - API integration with FastAPI dependencies

### 🎯 **MVP Фаза (Критично для запуска):**

2. ~~**Группа 3**: Управление кофейнями и навигация~~ **✅ FULLY COMPLETED - 100%**
   - Complete backend API for business management
   - Frontend LocationSelector with role-based access control
   - AddLocationModal with form validation and error handling
   - AppContext integration for reactive state management
   - UI/UX optimizations and internationalization
   - Interactive location switching with localStorage persistence
   - LocationIndicator in header with responsive design
   - Auto-selection and state synchronization logic
3. ~~**Группа 5**: Модуль "Учёт расходов" (базовый табличный ввод)~~ **✅ CORE FOUNDATION COMPLETED - 80%**
   - Complete Units Management API with conversion factors and business context
   - Complete Suppliers Management API with search and business access control
   - Complete Month Periods API with status management (ACTIVE, CLOSED)
   - Complete Expense Categories System with hierarchical sections and categories
   - All database migrations applied with proper Foreign Keys and audit trails
   - Next: Invoice Management System for purchase documentation
4. **Группа 4**: Базовое управление пользователями

### 🚀 **Основной функционал:**

4. **Группа 4**: Базовое управление пользователями
5. **Группа 5**: Invoice Management System (накладные и документооборот) - NEXT PRIORITY
6. **Группа 5**: Автоматизация периодов и расчеты остатков (продвинутые функции)
7. **Группа 6**: Модуль "Оплаты" (расширенные платежи)
8. **Группа 7**: Базовая отчетность и экспорт
9. **Группа 9**: Доработка UI/UX компонентов

### 🔧 **Техническая стабилизация:**

9. **Группа 10**: Техническая инфраструктура и DevOps
10. **Группа 8**: Справочники и служебные модули
11. **Группа 1**: Оптимизация и тесты

### 💫 **Расширенные возможности:**

12. **Группа 7**: Продвинутая аналитика и дашборды
13. **Группа 8**: Интеграции и дополнительные модули
14. PWA функции и мобильная оптимизация

---

## 📝 ЗАМЕТКИ ПО РЕАЛИЗАЦИИ

### 🔐 **Безопасность:**

- Все API эндпоинты должны включать проверку прав по филиалам
- Backend валидация критичнее frontend скрытия функций
- История изменений должна быть неизменяемой
- Финансовые данные в копейках для точности

### 🎯 **UX Принципы:**

- Интерфейс максимально близкий к Excel для легкого перехода
- Минимизация кликов при вводе данных
- Мгновенное обновление итогов при изменениях
- Четкое разделение прав в интерфейсе

### 🏗️ **Архитектурные решения:**

- Помесячное создание копий структуры для сохранения истории
- Cron-задачи для автоматизации критичных операций
- REST API с четким разделением контекста филиалов
- Компонентная архитектура React для переиспользования

### 📊 **Структура данных:**

- Гибкое хранение прав с контекстом филиала/модуля
- Нормализованная структура с учетом мульти-филиальности
- Эффективные индексы для табличных выборок по датам
- Audit trail для всех критичных операций

---

## 🌐 ПЕРСПЕКТИВНЫЕ ЗАДАЧИ

### 🗺️ **Интеграция с картами (на перспективу)**

- [ ] **Frontend**: Интеграция с картами для отображения локаций
- [ ] **Frontend**: Выбор адреса через карту при создании/редактировании кофейни
- [ ] **Frontend**: Отображение всех филиалов на карте
- [ ] **Backend**: Геокодирование адресов для получения координат
- [ ] **Backend**: API для работы с координатами локаций

### Парвки

[ ] для каждого поставщика должна быть своя дата отсрочки
[ ] поставщики название, инн, ндс, отсрочка
[ ] должна быть кнопочка копировать ИНН
[ ] напоминание об оплате при отсрочке (предстоящие счета на оплату)
[ ] отмененых счетов нет
[ ] НЕ КРИТИЧНО: сделать частичную оплату и перенос даты на другой день оставшейся суммы
[ ] сделать месячный вью со списком поставщиков и счетов
[ ] помечать просроченную оплату счетов
[-] дата создания, дата оплаты, поставщик, номер счета, сумма, статус и действия (порадок колонок)
[ ] отступы побольше в таблице между столбцами и группами
[ ] сдлеать поиск по категориям в создании счета
[ ] средняя цена закупки товара за единицу измерения (г, кг, и т.д.)
[x] счета вынести в одльный меню оплаты
главная страница
[x] категории убрать
[x] дней до конца месяца убрать
[ ] расходы в месяц только оплаченные счета
[x] остатки убрать тоже
