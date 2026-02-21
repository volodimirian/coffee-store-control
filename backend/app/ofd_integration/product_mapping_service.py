"""Service for managing OFD product mappings."""
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, case

from app.ofd_integration.models import ProductMapping, OFDConnection, Sale, SaleItem
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
                normalized_name = (mapping_data.ofd_product_name or "").strip()

                # Check if mapping already exists (prefer OFD product ID)
                if mapping_data.ofd_product_id:
                    existing = await session.execute(
                        select(ProductMapping).where(
                            ProductMapping.connection_id == connection_id,
                            ProductMapping.ofd_product_id == mapping_data.ofd_product_id
                        )
                    )
                else:
                    existing = await session.execute(
                        select(ProductMapping).where(
                            ProductMapping.connection_id == connection_id,
                            ProductMapping.ofd_product_name == normalized_name
                        )
                    )
                
                existing_mapping = existing.scalars().first()
                if existing_mapping:
                    mapping = existing_mapping

                    if normalized_name and mapping.ofd_product_name != normalized_name:
                        mapping.ofd_product_name = normalized_name
                    if mapping_data.ofd_product_id and mapping.ofd_product_id != mapping_data.ofd_product_id:
                        mapping.ofd_product_id = mapping_data.ofd_product_id
                    if mapping.tech_card_item_id != mapping_data.tech_card_item_id:
                        mapping.tech_card_item_id = mapping_data.tech_card_item_id

                    # Update existing sale items for this OFD product
                    if mapping_data.ofd_product_id:
                        items_result = await session.execute(
                            select(SaleItem)
                            .join(Sale, Sale.id == SaleItem.sale_id)
                            .where(
                                Sale.connection_id == connection_id,
                                SaleItem.ofd_product_id == mapping_data.ofd_product_id
                            )
                        )
                    else:
                        items_result = await session.execute(
                            select(SaleItem)
                            .join(Sale, Sale.id == SaleItem.sale_id)
                            .where(
                                Sale.connection_id == connection_id,
                                func.trim(SaleItem.ofd_product_name) == normalized_name
                            )
                        )
                    sale_items = list(items_result.scalars().all())
                    if not sale_items:
                        if not mapping_data.ofd_product_id:
                            items_result = await session.execute(
                                select(SaleItem)
                                .join(Sale, Sale.id == SaleItem.sale_id)
                                .where(
                                    Sale.connection_id == connection_id,
                                    func.trim(SaleItem.ofd_product_name) == normalized_name
                                )
                            )
                            sale_items = list(items_result.scalars().all())
                    sale_ids = {item.sale_id for item in sale_items}
                    for item in sale_items:
                        item.product_mapping_id = mapping.id
                        item.tech_card_item_id = mapping.tech_card_item_id
                        item.is_mapped = True

                    if sale_ids:
                        counts_result = await session.execute(
                            select(
                                SaleItem.sale_id,
                                func.count(SaleItem.id).label("items_count"),
                                func.sum(
                                    case((SaleItem.is_mapped == False, 1), else_=0)
                                ).label("unmapped_items_count"),
                            )
                            .where(SaleItem.sale_id.in_(sale_ids))
                            .group_by(SaleItem.sale_id)
                        )
                        for row in counts_result:
                            sale_obj = await session.get(Sale, row.sale_id)
                            if sale_obj:
                                sale_obj.items_count = int(row.items_count or 0)
                                sale_obj.unmapped_items_count = int(row.unmapped_items_count or 0)
                    success.append(mapping)
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
                    ofd_product_name=normalized_name,
                    tech_card_item_id=mapping_data.tech_card_item_id,
                    is_active=True,
                    created_by=created_by_user_id
                )
                
                session.add(mapping)
                await session.flush()
                await session.refresh(mapping, ["tech_card_item"])

                # Update existing sale items for this OFD product
                if mapping_data.ofd_product_id:
                    items_result = await session.execute(
                        select(SaleItem)
                        .join(Sale, Sale.id == SaleItem.sale_id)
                        .where(
                            Sale.connection_id == connection_id,
                            SaleItem.ofd_product_id == mapping_data.ofd_product_id
                        )
                    )
                else:
                    items_result = await session.execute(
                        select(SaleItem)
                        .join(Sale, Sale.id == SaleItem.sale_id)
                        .where(
                            Sale.connection_id == connection_id,
                            func.trim(SaleItem.ofd_product_name) == normalized_name
                        )
                    )
                sale_items = list(items_result.scalars().all())
                if not sale_items:
                    if not mapping_data.ofd_product_id:
                        items_result = await session.execute(
                            select(SaleItem)
                            .join(Sale, Sale.id == SaleItem.sale_id)
                            .where(
                                Sale.connection_id == connection_id,
                                func.trim(SaleItem.ofd_product_name) == normalized_name
                            )
                        )
                        sale_items = list(items_result.scalars().all())
                sale_ids = {item.sale_id for item in sale_items}
                for item in sale_items:
                    item.product_mapping_id = mapping.id
                    item.tech_card_item_id = mapping_data.tech_card_item_id
                    item.is_mapped = True

                if sale_ids:
                    counts_result = await session.execute(
                        select(
                            SaleItem.sale_id,
                            func.count(SaleItem.id).label("items_count"),
                            func.sum(
                                case((SaleItem.is_mapped == False, 1), else_=0)
                            ).label("unmapped_items_count"),
                        )
                        .where(SaleItem.sale_id.in_(sale_ids))
                        .group_by(SaleItem.sale_id)
                    )
                    for row in counts_result:
                        sale_obj = await session.get(Sale, row.sale_id)
                        if sale_obj:
                            sale_obj.items_count = int(row.items_count or 0)
                            sale_obj.unmapped_items_count = int(row.unmapped_items_count or 0)
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
        connection: OFDConnection,
        page: int = 1,
        page_size: int = 25,
        filter_type: str = "all",  # "all", "mapped", "unmapped"
        search: str | None = None
    ) -> tuple[list, int]:
        """Fetch products from OFD provider with filtering and pagination.
        
        Returns:
            Tuple of (products_list, total_count)
        """
        from app.ofd_integration.service import OFDConnectionService
        from app.core.security import decrypt_api_key
        from sqlalchemy import select

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
        
        # Fetch ALL products from OFD (cache this in production!)
        all_products = await provider.get_products()
        
        # Get existing mappings for filtering
        stmt = select(ProductMapping).where(
            ProductMapping.connection_id == connection.id,
            ProductMapping.is_active
        )
        result = await session.execute(stmt)
        existing_mappings = result.scalars().all()
        
        # Create set of mapped product keys for quick lookup
        mapped_keys = {
            f"{m.ofd_product_id}_{m.ofd_product_name}" 
            for m in existing_mappings
        }
        
        # Filter products
        filtered = []
        for product in all_products:
            product_key = f"{product.product_id}_{product.product_name}"
            is_mapped = product_key in mapped_keys
            
            # Apply mapping filter
            if filter_type == "mapped" and not is_mapped:
                continue
            if filter_type == "unmapped" and is_mapped:
                continue
            
            # Apply search filter
            if search and search.lower() not in product.product_name.lower():
                continue
            
            filtered.append(product)
        
        # Calculate pagination
        total = len(filtered)
        start = (page - 1) * page_size
        end = start + page_size
        paginated = filtered[start:end]
        
        return paginated, total
