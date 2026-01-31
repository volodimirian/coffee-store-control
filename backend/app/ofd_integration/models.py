"""OFD Integration database models."""

from datetime import datetime, date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Text,
    Numeric,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.core_models import Business, User
    from app.expenses.models import ExpenseCategory, Unit
    from app.tech_cards.models import TechCardItem


class OFDProvider(Base):
    """Справочник ОФД провайдеров."""

    __tablename__ = "ofd_providers"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    base_url: Mapped[str] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    # Relationships
    connections: Mapped[list["OFDConnection"]] = relationship(
        "OFDConnection", back_populates="provider"
    )


class OFDConnection(Base):
    """Подключения бизнеса к ОФД провайдерам."""

    __tablename__ = "ofd_connections"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"))
    provider_id: Mapped[int] = mapped_column(ForeignKey("ofd_providers.id"))
    api_key_encrypted: Mapped[str] = mapped_column(Text)
    custom_base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_sync_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_import_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_imported_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business")
    provider: Mapped["OFDProvider"] = relationship(
        "OFDProvider", back_populates="connections"
    )
    creator: Mapped["User"] = relationship("User")
    product_mappings: Mapped[list["ProductMapping"]] = relationship(
        "ProductMapping", back_populates="connection"
    )
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="connection")

    __table_args__ = (
        UniqueConstraint("business_id", "provider_id", name="uq_business_provider"),
    )


class ProductMapping(Base):
    """Маппинг ОФД товаров на tech_card_items."""

    __tablename__ = "product_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    connection_id: Mapped[int] = mapped_column(ForeignKey("ofd_connections.id"))
    ofd_product_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ofd_product_name: Mapped[str] = mapped_column(String(500))
    tech_card_item_id: Mapped[int] = mapped_column(ForeignKey("tech_card_items.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    connection: Mapped["OFDConnection"] = relationship(
        "OFDConnection", back_populates="product_mappings"
    )
    tech_card_item: Mapped["TechCardItem"] = relationship("TechCardItem")
    creator: Mapped["User"] = relationship("User")
    sale_items: Mapped[list["SaleItem"]] = relationship(
        "SaleItem", back_populates="product_mapping"
    )

    __table_args__ = (
        UniqueConstraint(
            "connection_id",
            "ofd_product_id",
            "ofd_product_name",
            name="uq_connection_product",
        ),
        Index("ix_product_mappings_tech_card_item_id", "tech_card_item_id"),
    )


class Sale(Base):
    """Чеки/Продажи из ОФД."""

    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"))
    connection_id: Mapped[int] = mapped_column(ForeignKey("ofd_connections.id"))
    ofd_receipt_id: Mapped[str] = mapped_column(String(200))
    receipt_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    fiscal_document_number: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    fiscal_sign: Mapped[str | None] = mapped_column(String(200), nullable=True)
    raw_data: Mapped[dict] = mapped_column(JSONB)
    processing_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending, processed, error
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    imported_by: Mapped[int] = mapped_column(ForeignKey("users.id"))

    # Relationships
    business: Mapped["Business"] = relationship("Business")
    connection: Mapped["OFDConnection"] = relationship(
        "OFDConnection", back_populates="sales"
    )
    importer: Mapped["User"] = relationship("User")
    items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="sale")

    __table_args__ = (
        UniqueConstraint(
            "connection_id", "ofd_receipt_id", name="uq_connection_receipt"
        ),
        Index("ix_sales_receipt_datetime_business", "receipt_datetime", "business_id"),
    )


class SaleItem(Base):
    """Позиции в чеке."""

    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"))
    product_mapping_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_mappings.id"), nullable=True
    )
    tech_card_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("tech_card_items.id"), nullable=True
    )
    ofd_product_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ofd_product_name: Mapped[str] = mapped_column(String(500))
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    is_mapped: Mapped[bool] = mapped_column(Boolean, default=False)
    processed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    product_mapping: Mapped["ProductMapping | None"] = relationship(
        "ProductMapping", back_populates="sale_items"
    )
    tech_card_item: Mapped["TechCardItem | None"] = relationship("TechCardItem")
    ingredient_expenses: Mapped[list["SaleIngredientExpense"]] = relationship(
        "SaleIngredientExpense", back_populates="sale_item"
    )

    __table_args__ = (
        Index("ix_sale_items_sale_id", "sale_id"),
        Index("ix_sale_items_product_mapping_id", "product_mapping_id"),
        Index("ix_sale_items_tech_card_item_id", "tech_card_item_id"),
    )


class SaleIngredientExpense(Base):
    """Списание ингредиентов от продаж."""

    __tablename__ = "sale_ingredient_expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_item_id: Mapped[int] = mapped_column(ForeignKey("sale_items.id"))
    tech_card_item_id: Mapped[int] = mapped_column(ForeignKey("tech_card_items.id"))
    category_id: Mapped[int] = mapped_column(ForeignKey("expense_categories.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3))
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"))
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    # Relationships
    sale_item: Mapped["SaleItem"] = relationship(
        "SaleItem", back_populates="ingredient_expenses"
    )
    tech_card_item: Mapped["TechCardItem"] = relationship("TechCardItem")
    category: Mapped["ExpenseCategory"] = relationship("ExpenseCategory")
    unit: Mapped["Unit"] = relationship("Unit")

    __table_args__ = (
        Index("ix_sale_ingredient_expenses_sale_item_id", "sale_item_id"),
        Index(
            "ix_sale_ingredient_expenses_category_created",
            "category_id",
            "created_at",
        ),
    )
