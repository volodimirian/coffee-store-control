#!/usr/bin/env python3
"""
Скрипт очистки данных OFD для пересинхронизации.

ВНИМАНИЕ: Этот скрипт удаляет ВСЕ чеки и расходы ингредиентов!
Связи товаров (product_mappings) и подключения (ofd_connections) сохраняются.

Используйте перед пересинхронизацией чеков из ОФД после исправления
логики конвертации единиц измерения.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.db import engine


async def cleanup_ofd_data():
    """Удаляет все чеки и расходы ингредиентов, сохраняя связи товаров."""
    
    print("=" * 60)
    print("🗑️  Очистка данных OFD")
    print("=" * 60)
    print()
    
    # Подтверждение
    print("⚠️  ВНИМАНИЕ: Будут удалены:")
    print("   - Все расходы ингредиентов (sale_ingredient_expenses)")
    print("   - Все позиции чеков (sale_items)")
    print("   - Все чеки (sales)")
    print("   - Сброшены даты последней синхронизации (last_sync_at)")
    print()
    print("✅ Будут сохранены:")
    print("   - Связи товаров с техкартами (product_mappings)")
    print("   - Подключения к ОФД (ofd_connections)")
    print()
    
    response = input("Продолжить? (yes/no): ")
    if response.lower() not in ['yes', 'y', 'да']:
        print("❌ Операция отменена")
        return
    
    print()
    print("🔄 Выполняю очистку...")
    print()
    
    async with engine.begin() as conn:
        try:
            # 1. Удаляем расходы ингредиентов
            result = await conn.execute(text("DELETE FROM sale_ingredient_expenses"))
            print(f"✅ Удалено записей из sale_ingredient_expenses: {result.rowcount}")
            
            # 2. Удаляем позиции чеков
            result = await conn.execute(text("DELETE FROM sale_items"))
            print(f"✅ Удалено записей из sale_items: {result.rowcount}")
            
            # 3. Удаляем чеки
            result = await conn.execute(text("DELETE FROM sales"))
            print(f"✅ Удалено записей из sales: {result.rowcount}")
            
            # 4. Сбрасываем last_sync_at
            result = await conn.execute(
                text("UPDATE ofd_connections SET last_sync_at = NULL")
            )
            print(f"✅ Сброшены даты синхронизации для {result.rowcount} подключений")
            
            print()
            print("=" * 60)
            print("✅ Очистка завершена успешно!")
            print("=" * 60)
            print()
            
            # Статистика оставшихся данных
            result = await conn.execute(
                text("SELECT COUNT(*) FROM product_mappings")
            )
            mappings_count = result.scalar()
            
            result = await conn.execute(
                text("SELECT COUNT(*) FROM ofd_connections")
            )
            connections_count = result.scalar()
            
            print("📊 Статистика оставшихся данных:")
            print(f"   - Связи товаров (product_mappings): {mappings_count}")
            print(f"   - Подключения ОФД (ofd_connections): {connections_count}")
            print()
            
        except Exception as e:
            print(f"❌ Ошибка при выполнении очистки: {e}")
            raise
    
    print("=" * 60)
    print("📋 СЛЕДУЮЩИЕ ШАГИ:")
    print("=" * 60)
    print()
    print("1. Откройте веб-интерфейс: Продажи → Синхронизация продаж")
    print()
    print("2. Выберите подключение ОФД")
    print()
    print("3. Укажите диапазон дат для синхронизации:")
    print("   - Начальная дата: первая дата продаж (например, 01.02.2026)")
    print("   - Конечная дата: текущая дата (или оставьте пустым)")
    print()
    print("4. Нажмите 'Синхронизировать'")
    print("   Система загрузит все чеки из ОФД")
    print()
    print("5. Нажмите кнопку с иконкой ✓ (обновить статусы)")
    print("   Чеки переключатся в статус 'Ожидает'")
    print()
    print("6. Для каждого чека со связанными товарами:")
    print("   - Откройте детали чека")
    print("   - Нажмите 'Обработать чек'")
    print("   Или используйте массовую обработку если доступна")
    print()
    print("7. Проверьте таблицу учета остатков:")
    print("   - Расходы должны быть в правильных единицах (мл, гр)")
    print("   - Цены должны быть адекватными (~15-30₽, не 15000₽)")
    print()
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(cleanup_ofd_data())
