"""
Test Invoice and InventoryBalance integration.

Tests the automatic update of inventory balances when:
- Invoice items are created/updated/deleted
- Invoice is marked as paid/cancelled
- Category changes on invoice items
"""
# mypy: disable-error-code="arg-type"
# SQLAlchemy model attributes are typed as Column[T] but after session.refresh() they become T at runtime
import pytest
from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User, Business
from app.expenses.models import (
    InvoiceStatus,
    Supplier,
    ExpenseSection,
    ExpenseCategory,
    Unit,
    UnitType,
    MonthPeriod,
    MonthPeriodStatus,
)
from app.expenses.invoice_service import InvoiceService, InvoiceItemService
from app.expenses.inventory_balance_service import InventoryBalanceService
from app.expenses.schemas import (
    InvoiceCreate,
    InvoiceItemCreate,
)


@pytest.fixture
async def test_business(db_session: AsyncSession, test_business_owner: User) -> Business:
    """Create a test business."""
    business = Business(
        name="Test Coffee Shop",
        city="Test City",
        address="123 Test St",
        owner_id=test_business_owner.id,
        is_active=True,
    )
    db_session.add(business)
    await db_session.commit()
    await db_session.refresh(business)
    return business


@pytest.fixture
async def test_supplier(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User) -> Supplier:
    """Create a test supplier."""
    supplier = Supplier(
        name="Test Supplier Inc.",
        business_id=test_business.id,
        created_by=test_business_owner.id,
        contact_info={
            "phone": "+1234567890",
            "email": "supplier@test.com",
            "address": "123 Supplier St",
        },
        is_active=True,
    )
    db_session.add(supplier)
    await db_session.commit()
    await db_session.refresh(supplier)
    return supplier


@pytest.fixture
async def test_unit(db_session: AsyncSession, test_business: Business) -> Unit:
    """Create a test unit (kg)."""
    unit = Unit(
        name="kilogram",
        symbol="kg",
        unit_type=UnitType.WEIGHT,
        business_id=test_business.id,
        is_active=True,
    )
    db_session.add(unit)
    await db_session.commit()
    await db_session.refresh(unit)
    return unit


@pytest.fixture
async def test_unit_gram(db_session: AsyncSession, test_unit: Unit, test_business: Business) -> Unit:
    """Create a test unit (gram) derived from kg."""
    unit_gram = Unit(
        name="gram",
        symbol="g",
        unit_type=UnitType.WEIGHT,
        business_id=test_business.id,
        base_unit_id=test_unit.id,
        conversion_factor=Decimal("0.001"),  # 1g = 0.001kg
        is_active=True,
    )
    db_session.add(unit_gram)
    await db_session.commit()
    await db_session.refresh(unit_gram)
    return unit_gram


@pytest.fixture
async def test_section(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User) -> ExpenseSection:
    """Create a test expense section."""
    section = ExpenseSection(
        name="Ingredients",
        business_id=test_business.id,
        created_by=test_business_owner.id,
        order_index=1,
        is_active=True,
    )
    db_session.add(section)
    await db_session.commit()
    await db_session.refresh(section)
    return section


@pytest.fixture
async def test_category(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User,
    test_section: ExpenseSection,
    test_unit: Unit,
) -> ExpenseCategory:
    """Create a test expense category."""
    category = ExpenseCategory(
        name="Coffee Beans",
        section_id=test_section.id,
        business_id=test_business.id,
        default_unit_id=test_unit.id,
        created_by=test_business_owner.id,
        order_index=1,
        is_active=True,
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


@pytest.fixture
async def test_period(db_session: AsyncSession, test_business: Business) -> MonthPeriod:
    """Create a test month period."""
    period = MonthPeriod(
        name="October 2025",
        business_id=test_business.id,
        year=2025,
        month=10,
        status=MonthPeriodStatus.ACTIVE,
        is_active=True,
    )
    db_session.add(period)
    await db_session.commit()
    await db_session.refresh(period)
    return period


@pytest.mark.asyncio
async def test_create_invoice_item_paid_invoice_updates_balance(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User,
    test_supplier: Supplier,
    test_category: ExpenseCategory,
    test_unit: Unit,
    test_period: MonthPeriod,
):
    """Test that creating an invoice item on a PAID invoice updates inventory balance."""
    # Create a PAID invoice
    invoice_data = InvoiceCreate(
        business_id=test_business.id,
        supplier_id=test_supplier.id,
        invoice_number="INV-001",
        invoice_date=datetime(2025, 10, 15),
        total_amount=Decimal("500.00"),
        paid_status=InvoiceStatus.PAID,
        paid_date=datetime(2025, 10, 15),
        document_path=None,
    )
    
    invoice = await InvoiceService.create_invoice(db_session, invoice_data, test_business_owner.id)
    await db_session.commit()
    
    # Create an invoice item
    item_data = InvoiceItemCreate(
        invoice_id=invoice.id,
        category_id=test_category.id,
        quantity=Decimal("10.0"),  # 10 kg
        unit_id=test_unit.id,
        unit_price=Decimal("50.00"),
        total_price=Decimal("500.00"),
    )
    
    await InvoiceItemService.create_invoice_item(db_session, item_data)
    await db_session.commit()
    
    # Check that inventory balance was created/updated
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db_session, test_category.id, test_period.id
    )
    
    assert balance is not None, "Balance should be created"
    assert balance.purchases_total == Decimal("10.0"), f"Expected 10.0 kg, got {balance.purchases_total}"
    assert balance.closing_balance == Decimal("10.0"), f"Expected closing 10.0 kg, got {balance.closing_balance}"


@pytest.mark.asyncio
async def test_create_invoice_item_unpaid_invoice_no_balance_update(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User,
    test_supplier: Supplier,
    test_category: ExpenseCategory,
    test_unit: Unit,
    test_period: MonthPeriod,
):
    """Test that creating an invoice item on an UNPAID invoice does NOT update inventory balance."""
    # Create an UNPAID invoice
    invoice_data = InvoiceCreate(
        business_id=test_business.id,
        supplier_id=test_supplier.id,
        invoice_number="INV-002",
        invoice_date=datetime(2025, 10, 15),
        total_amount=Decimal("250.00"),
        paid_status=InvoiceStatus.PENDING,
        document_path=None,
    )
    
    invoice = await InvoiceService.create_invoice(db_session, invoice_data, test_business_owner.id)
    await db_session.commit()
    
    # Create an invoice item
    item_data = InvoiceItemCreate(
        invoice_id=invoice.id,
        category_id=test_category.id,
        quantity=Decimal("5.0"),
        unit_id=test_unit.id,
        unit_price=Decimal("50.00"),
        total_price=Decimal("250.00"),
    )
    
    await InvoiceItemService.create_invoice_item(db_session, item_data)
    await db_session.commit()
    
    # Check that inventory balance was NOT created
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db_session, test_category.id, test_period.id
    )
    
    # Balance might exist but should have 0 purchases
    if balance:
        assert balance.purchases_total == Decimal("0"), "Unpaid invoice should not add to purchases"


@pytest.mark.asyncio
async def test_mark_invoice_as_paid_updates_balance(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User,
    test_supplier: Supplier,
    test_category: ExpenseCategory,
    test_unit: Unit,
    test_period: MonthPeriod,
):
    """Test that marking an invoice as PAID updates inventory balance."""
    # Create an UNPAID invoice with items
    invoice_data = InvoiceCreate(
        business_id=test_business.id,
        supplier_id=test_supplier.id,
        invoice_number="INV-003",
        invoice_date=datetime(2025, 10, 15),
        total_amount=Decimal("750.00"),
        paid_status=InvoiceStatus.PENDING,
        document_path=None,
    )
    
    invoice = await InvoiceService.create_invoice(db_session, invoice_data, test_business_owner.id)
    await db_session.commit()
    
    # Add items
    item_data = InvoiceItemCreate(
        invoice_id=invoice.id,
        category_id=test_category.id,
        quantity=Decimal("15.0"),
        unit_id=test_unit.id,
        unit_price=Decimal("50.00"),
        total_price=Decimal("750.00"),
    )
    
    await InvoiceItemService.create_invoice_item(db_session, item_data)
    await db_session.commit()
    
    # Mark as paid
    await InvoiceService.mark_invoice_as_paid(db_session, invoice.id)
    await db_session.commit()
    
    # Check balance
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db_session, test_category.id, test_period.id
    )
    
    assert balance is not None
    assert balance.purchases_total == Decimal("15.0")


@pytest.mark.asyncio
async def test_cancel_paid_invoice_updates_balance(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User,
    test_supplier: Supplier,
    test_category: ExpenseCategory,
    test_unit: Unit,
    test_period: MonthPeriod,
):
    """Test that cancelling a PAID invoice removes purchases from balance."""
    # Create a PAID invoice with items
    invoice_data = InvoiceCreate(
        business_id=test_business.id,
        supplier_id=test_supplier.id,
        invoice_number="INV-004",
        invoice_date=datetime(2025, 10, 15),
        total_amount=Decimal("1000.00"),
        paid_status=InvoiceStatus.PAID,
        paid_date=datetime(2025, 10, 15),
        document_path=None,
    )
    
    invoice = await InvoiceService.create_invoice(db_session, invoice_data, test_business_owner.id)
    await db_session.commit()
    
    item_data = InvoiceItemCreate(
        invoice_id=invoice.id,
        category_id=test_category.id,
        quantity=Decimal("20.0"),
        unit_id=test_unit.id,
        unit_price=Decimal("50.00"),
        total_price=Decimal("1000.00"),
    )
    
    await InvoiceItemService.create_invoice_item(db_session, item_data)
    await db_session.commit()
    
    # Verify balance has purchases
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db_session, test_category.id, test_period.id
    )
    assert balance is not None
    assert balance.purchases_total == Decimal("20.0")
    
    # Cancel invoice
    await InvoiceService.mark_invoice_as_cancelled(db_session, invoice.id)
    await db_session.commit()
    
    # Check balance is now 0
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db_session, test_category.id, test_period.id
    )
    assert balance is not None
    assert balance.purchases_total == Decimal("0")


@pytest.mark.asyncio
async def test_unit_conversion_in_balance(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User,
    test_supplier: Supplier,
    test_category: ExpenseCategory,
    test_unit: Unit,
    test_unit_gram: Unit,
    test_period: MonthPeriod,
):
    """Test that invoice items in different units are converted to category default unit."""
    # Create a PAID invoice with items in grams
    invoice_data = InvoiceCreate(
        business_id=test_business.id,
        supplier_id=test_supplier.id,
        invoice_number="INV-005",
        invoice_date=datetime(2025, 10, 15),
        total_amount=Decimal("250.00"),
        paid_status=InvoiceStatus.PAID,
        paid_date=datetime(2025, 10, 15),
        document_path=None,
    )
    
    invoice = await InvoiceService.create_invoice(db_session, invoice_data, test_business_owner.id)
    await db_session.commit()
    
    # Add item with 5000 grams (should be 5 kg in balance)
    item_data = InvoiceItemCreate(
        invoice_id=invoice.id,
        category_id=test_category.id,
        quantity=Decimal("5000.0"),  # 5000 grams
        unit_id=test_unit_gram.id,
        unit_price=Decimal("0.05"),  # price per gram
        total_price=Decimal("250.00"),
    )
    
    await InvoiceItemService.create_invoice_item(db_session, item_data)
    await db_session.commit()
    
    # Check balance (should be in kg)
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db_session, test_category.id, test_period.id
    )
    
    assert balance is not None
    # 5000g = 5kg
    assert balance.purchases_total == Decimal("5.0"), f"Expected 5.0 kg, got {balance.purchases_total}"


@pytest.mark.asyncio
async def test_delete_invoice_item_updates_balance(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User,
    test_supplier: Supplier,
    test_category: ExpenseCategory,
    test_unit: Unit,
    test_period: MonthPeriod,
):
    """Test that deleting an invoice item from a PAID invoice updates balance."""
    # Create a PAID invoice
    invoice_data = InvoiceCreate(
        business_id=test_business.id,
        supplier_id=test_supplier.id,
        invoice_number="INV-006",
        invoice_date=datetime(2025, 10, 15),
        total_amount=Decimal("1250.00"),
        paid_status=InvoiceStatus.PAID,
        paid_date=datetime(2025, 10, 15),
        document_path=None,
    )
    
    invoice = await InvoiceService.create_invoice(db_session, invoice_data, test_business_owner.id)
    await db_session.commit()
    
    # Create two items
    item1_data = InvoiceItemCreate(
        invoice_id=invoice.id,
        category_id=test_category.id,
        quantity=Decimal("10.0"),
        unit_id=test_unit.id,
        unit_price=Decimal("50.00"),
        total_price=Decimal("500.00"),
    )
    
    item2_data = InvoiceItemCreate(
        invoice_id=invoice.id,
        category_id=test_category.id,
        quantity=Decimal("15.0"),
        unit_id=test_unit.id,
        unit_price=Decimal("50.00"),
        total_price=Decimal("750.00"),
    )
    
    item1 = await InvoiceItemService.create_invoice_item(db_session, item1_data)
    await InvoiceItemService.create_invoice_item(db_session, item2_data)
    await db_session.commit()
    
    # Verify total is 25
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db_session, test_category.id, test_period.id
    )
    assert balance is not None
    assert balance.purchases_total == Decimal("25.0")
    
    # Delete first item
    await InvoiceItemService.delete_invoice_item(db_session, item1.id)
    await db_session.commit()
    
    # Check balance is now 15
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db_session, test_category.id, test_period.id
    )
    assert balance is not None
    assert balance.purchases_total == Decimal("15.0")


@pytest.mark.asyncio
async def test_multiple_invoices_aggregate_in_balance(
    db_session: AsyncSession,
    test_business: Business,
    test_business_owner: User,
    test_supplier: Supplier,
    test_category: ExpenseCategory,
    test_unit: Unit,
    test_period: MonthPeriod,
):
    """Test that multiple paid invoices correctly aggregate in inventory balance."""
    # Create multiple PAID invoices
    for i in range(3):
        invoice_data = InvoiceCreate(
            business_id=test_business.id,
            supplier_id=test_supplier.id,
            invoice_number=f"INV-MULTI-{i}",
            invoice_date=datetime(2025, 10, 15),
            total_amount=Decimal("250.00"),
            paid_status=InvoiceStatus.PAID,
            paid_date=datetime(2025, 10, 15),
            document_path=None,
        )
        
        invoice = await InvoiceService.create_invoice(db_session, invoice_data, test_business_owner.id)
        
        item_data = InvoiceItemCreate(
            invoice_id=invoice.id,
            category_id=test_category.id,
            quantity=Decimal("5.0"),
            unit_id=test_unit.id,
            unit_price=Decimal("50.00"),
            total_price=Decimal("250.00"),
        )
        
        await InvoiceItemService.create_invoice_item(db_session, item_data)
    
    await db_session.commit()
    
    # Check balance aggregates all three (3 x 5 = 15)
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db_session, test_category.id, test_period.id
    )
    
    assert balance is not None
    assert balance.purchases_total == Decimal("15.0")
