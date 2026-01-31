"""Service for managing OFD product mappings."""
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from app.ofd_integration.models import ProductMapping, OFDConnection
from app.ofd_integration.schemas import ProductMappingCreate
from app.tech_cards.models import TechCardItem


class ProductMappingService:
    """Service for managing OFD product mappings."""

    @staticmethod
    async def get_mappings_by_connection(
        session: AsyncSession,
        connection_id: int
    ) -> List[ProductMapping]:
        """Get all product mappings for a connection."""
        result = await session.execute(
            select(ProductMapping)
            .where(ProductMapping.connection_id == connection_id)
            .options(selectinload(ProductMapping.tech_card_item))
            .order_by(ProductMapping.ofd_product_name)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_mapping_by_id(
        session: AsyncSession,
        mapping_id: int
    ) -> ProductMapping | None:
        """Get product mapping by ID."""
        result = await session.execute(
            select(ProductMapping)
            .where(ProductMapping.id == mapping_id)
            .options(selectinload(ProductMapping.tech_card_item))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_mappings_bulk(
        session: AsyncSession,
        connection_id: int,
        mappings_data: List[ProductMappingCreate],
        created_by_user_id: int
    ) -> dict:
        """Create multiple product mappings in one transaction.
        
        Returns dict with:
        - success: list of created mappings
        - errors: list of errors for duplicates
        """
        success = []
        errors = []

        for mapping_data in mappings_data:
            try:
                # Check if mapping already exists
                existing = await session.execute(
                    select(ProductMapping).where(
                        ProductMapping.connection_id == connection_id,
                        ProductMapping.ofd_product_id == mapping_data.ofd_product_id,
                        ProductMapping.ofd_product_name == mapping_data.ofd_product_name
                    )
                )
                
                if existing.scalar_one_or_none():
                    errors.append({
                        "ofd_product_name": mapping_data.ofd_product_name,
                        "error": "Mapping already exists"
                    })
                    continue

                # Verify tech_card_item exists
                tech_card_item = await session.get(TechCardItem, mapping_data.tech_card_item_id)
                if not tech_card_item:
                    errors.append({
                        "ofd_product_name": mapping_data.ofd_product_name,
                        "error": f"Tech card item {mapping_data.tech_card_item_id} not found"
                    })
                    continue

                # Create mapping
                mapping = ProductMapping(
                    connection_id=connection_id,
                    ofd_product_id=mapping_data.ofd_product_id,
                    ofd_product_name=mapping_data.ofd_product_name,
                    tech_card_item_id=mapping_data.tech_card_item_id,
                    is_active=True,
                    created_by=created_by_user_id
                )
                
                session.add(mapping)
                await session.flush()
                await session.refresh(mapping, ["tech_card_item"])
                success.append(mapping)

            except IntegrityError as e:
                await session.rollback()
                errors.append({
                    "ofd_product_name": mapping_data.ofd_product_name,
                    "error": f"Database constraint violation: {str(e)}"
                })
            except Exception as e:
                errors.append({
                    "ofd_product_name": mapping_data.ofd_product_name,
                    "error": str(e)
                })

        return {
            "success": success,
            "errors": errors
        }

    @staticmethod
    async def update_mapping(
        session: AsyncSession,
        mapping: ProductMapping,
        tech_card_item_id: int | None = None,
        is_active: bool | None = None
    ) -> ProductMapping:
        """Update product mapping."""
        if tech_card_item_id is not None:
            # Verify tech_card_item exists
            tech_card_item = await session.get(TechCardItem, tech_card_item_id)
            if not tech_card_item:
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tech card item {tech_card_item_id} not found"
                )
            mapping.tech_card_item_id = tech_card_item_id
        
        if is_active is not None:
            mapping.is_active = is_active

        await session.flush()
        await session.refresh(mapping, ["tech_card_item"])
        return mapping

    @staticmethod
    async def delete_mapping(
        session: AsyncSession,
        mapping: ProductMapping
    ) -> None:
        """Delete product mapping."""
        await session.delete(mapping)
        await session.flush()

    @staticmethod
    async def get_products_from_ofd(
        session: AsyncSession,
        connection: OFDConnection
    ) -> list:
        """Fetch products from OFD provider."""
        from app.ofd_integration.service import OFDConnectionService
        from app.core.security import decrypt_api_key

        # Decrypt API key
        api_key = decrypt_api_key(connection.api_key_encrypted)
        
        # Get base URL
        base_url = connection.custom_base_url or connection.provider.base_url
        
        # Get provider instance
        provider = OFDConnectionService._get_provider_instance(
            provider_code=connection.provider.code,
            api_key=api_key,
            base_url=base_url
        )
        
        # Fetch products
        products = await provider.get_products()
        
        return products
