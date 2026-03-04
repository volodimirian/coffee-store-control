"""API router for OFD integration endpoints."""
from datetime import date, datetime
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import get_db_dep
from app.core.resource_permissions import (
    require_resource_permission,
    Resource,
    Action,
)
from app.ofd_integration.schemas import (
    OFDProviderResponse,
    OFDConnectionCreate,
    OFDConnectionUpdate,
    OFDConnectionResponse,
    OFDConnectionTestResponse,
    ProductMappingBulkCreate,
    ProductMappingUpdate,
    ProductMappingResponse,
    OFDProductResponse,
    SaleSyncRequest,
    SaleSyncResponse,
    SaleResponse,
    SaleDetailResponse,
)
from app.ofd_integration.service import OFDConnectionService
from app.ofd_integration.models import ProductMapping
from app.ofd_integration.product_mapping_service import ProductMappingService
from app.ofd_integration.sales_service import SalesService
from app.core.error_codes import ErrorCode, create_error_response

router = APIRouter()


@router.get("/providers", response_model=List[OFDProviderResponse])
async def get_ofd_providers(
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.VIEW))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Get list of available OFD providers."""
    providers = await OFDConnectionService.get_all_providers(
        session=session,
        only_active=True
    )
    return [OFDProviderResponse.model_validate(p) for p in providers]


@router.get("/business/{business_id}/connections", response_model=List[OFDConnectionResponse])
async def get_business_connections(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.VIEW))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Get all OFD connections for a business."""
    connections = await OFDConnectionService.get_connections_by_business(
        session=session,
        business_id=business_id,
        only_active=False
    )
    return [OFDConnectionResponse.model_validate(c) for c in connections]


@router.post("/business/{business_id}/connections", response_model=OFDConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_ofd_connection(
    business_id: int,
    connection_data: OFDConnectionCreate,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.CREATE))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Create new OFD connection for a business."""
    
    # Verify provider exists
    provider = await OFDConnectionService.get_provider_by_id(
        session=session,
        provider_id=connection_data.provider_id
    )
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="OFD provider not found"
            )
        )
    
    if not provider.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                error_code=ErrorCode.VALIDATION_ERROR,
                detail="OFD provider is not active"
            )
        )
    
    connection = await OFDConnectionService.create_connection(
        session=session,
        business_id=business_id,
        connection_data=connection_data,
        created_by_user_id=auth["user_id"]
    )
    await session.commit()
    
    return OFDConnectionResponse.model_validate(connection)


@router.get("/connections/{connection_id}", response_model=OFDConnectionResponse)
async def get_connection(
    connection_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.VIEW))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Get OFD connection by ID."""
    connection = await OFDConnectionService.get_connection_by_id(
        session=session,
        connection_id=connection_id
    )
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="OFD connection not found"
            )
        )
    
    return OFDConnectionResponse.model_validate(connection)


@router.put("/connections/{connection_id}", response_model=OFDConnectionResponse)
async def update_connection(
    connection_id: int,
    connection_data: OFDConnectionUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.EDIT))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Update OFD connection."""
    connection = await OFDConnectionService.get_connection_by_id(
        session=session,
        connection_id=connection_id
    )
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="OFD connection not found"
            )
        )
    
    updated_connection = await OFDConnectionService.update_connection(
        session=session,
        connection=connection,
        connection_data=connection_data
    )
    await session.commit()
    
    return OFDConnectionResponse.model_validate(updated_connection)


@router.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(
    connection_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.DELETE))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Delete OFD connection."""
    connection = await OFDConnectionService.get_connection_by_id(
        session=session,
        connection_id=connection_id
    )
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="OFD connection not found"
            )
        )
    
    await OFDConnectionService.delete_connection(
        session=session,
        connection=connection
    )
    await session.commit()


@router.post("/connections/{connection_id}/test", response_model=OFDConnectionTestResponse)
async def test_connection(
    connection_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.VIEW))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Test OFD connection by validating credentials with provider."""
    connection = await OFDConnectionService.get_connection_by_id(
        session=session,
        connection_id=connection_id
    )
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="OFD connection not found"
            )
        )
    
    result = await OFDConnectionService.test_connection(
        session=session,
        connection=connection
    )
    await session.commit()  # Save sync status updates
    
    return OFDConnectionTestResponse(**result)


# ==================== Product Mappings Endpoints ====================

@router.get("/connections/{connection_id}/products")
async def get_ofd_products(
    connection_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.PRODUCT_MAPPINGS, Action.VIEW))],
    page: int = 1,
    page_size: int = 25,
    filter: str = "all",  # "all", "mapped", "unmapped"
    search: str | None = None,
    session: AsyncSession = Depends(get_db_dep),
):
    """Get product nomenclature from OFD provider with pagination and filtering."""
    connection = await OFDConnectionService.get_connection_by_id(
        session=session,
        connection_id=connection_id
    )
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="OFD connection not found"
            )
        )
    
    # Validate page_size
    if page_size > 100:
        page_size = 100
    if page_size < 1:
        page_size = 25
    
    products, total = await ProductMappingService.get_products_from_ofd(
        session=session,
        connection=connection,
        page=page,
        page_size=page_size,
        filter_type=filter,
        search=search
    )
    
    return {
        "items": [OFDProductResponse.model_validate(p) for p in products],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size  # Ceiling division
    }


@router.get("/connections/{connection_id}/mappings", response_model=List[ProductMappingResponse])
async def get_product_mappings(
    connection_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.PRODUCT_MAPPINGS, Action.VIEW))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Get all product mappings for a connection."""
    mappings = await ProductMappingService.get_mappings_by_connection(
        session=session,
        connection_id=connection_id
    )
    
    # Enrich with tech_card_item name
    result = []
    for mapping in mappings:
        # Get tech_card_item name before validation (while session is active)
        tech_card_item_name = mapping.tech_card_item.name if mapping.tech_card_item else None
        
        # Build dict manually to include computed field
        result.append(ProductMappingResponse(
            id=mapping.id,
            connection_id=mapping.connection_id,
            ofd_product_id=mapping.ofd_product_id,
            ofd_product_name=mapping.ofd_product_name,
            tech_card_item_id=mapping.tech_card_item_id,
            tech_card_item_name=tech_card_item_name,
            is_active=mapping.is_active,
            created_at=mapping.created_at,
            updated_at=mapping.updated_at
        ))
    
    return result


@router.post("/connections/{connection_id}/mappings", status_code=status.HTTP_201_CREATED)
async def create_product_mappings(
    connection_id: int,
    bulk_data: ProductMappingBulkCreate,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.PRODUCT_MAPPINGS, Action.CREATE))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Create one or multiple product mappings."""
    # Verify connection exists
    connection = await OFDConnectionService.get_connection_by_id(
        session=session,
        connection_id=connection_id
    )
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="OFD connection not found"
            )
        )
    
    result = await ProductMappingService.create_mappings_bulk(
        session=session,
        connection_id=connection_id,
        mappings_data=bulk_data.mappings,
        created_by_user_id=auth["user_id"]
    )
    
    success_ids = [mapping.id for mapping in result["success"]]

    await session.commit()
    
    # Format response
    success_response = []
    if success_ids:
        mappings_result = await session.execute(
            select(ProductMapping)
            .where(ProductMapping.id.in_(success_ids))
            .options(selectinload(ProductMapping.tech_card_item))
        )
        mappings_by_id = {m.id: m for m in mappings_result.scalars().all()}

        for mapping_id in success_ids:
            mapping = mappings_by_id.get(mapping_id)
            if not mapping:
                continue
            tech_card_item_name = mapping.tech_card_item.name if mapping.tech_card_item else None
            success_response.append({
                "id": mapping.id,
                "connection_id": mapping.connection_id,
                "ofd_product_id": mapping.ofd_product_id,
                "ofd_product_name": mapping.ofd_product_name,
                "tech_card_item_id": mapping.tech_card_item_id,
                "tech_card_item_name": tech_card_item_name,
                "is_active": mapping.is_active,
                "created_at": mapping.created_at.isoformat(),
                "updated_at": mapping.updated_at.isoformat()
            })
    
    return {
        "success": success_response,
        "errors": result["errors"],
        "total": len(bulk_data.mappings),
        "created": len(result["success"]),
        "failed": len(result["errors"])
    }


@router.put("/mappings/{mapping_id}", response_model=ProductMappingResponse)
async def update_product_mapping(
    mapping_id: int,
    update_data: ProductMappingUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.PRODUCT_MAPPINGS, Action.EDIT))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Update product mapping."""
    mapping = await ProductMappingService.get_mapping_by_id(
        session=session,
        mapping_id=mapping_id
    )
    
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="Product mapping not found"
            )
        )
    
    updated_mapping = await ProductMappingService.update_mapping(
        session=session,
        mapping=mapping,
        tech_card_item_id=update_data.tech_card_item_id,
        is_active=update_data.is_active
    )
    
    await session.commit()
    
    # Get tech_card_item name before validation (while session is active)
    tech_card_item_name = updated_mapping.tech_card_item.name if updated_mapping.tech_card_item else None
    
    # Build response directly to include computed field
    return ProductMappingResponse(
        id=updated_mapping.id,
        connection_id=updated_mapping.connection_id,
        ofd_product_id=updated_mapping.ofd_product_id,
        ofd_product_name=updated_mapping.ofd_product_name,
        tech_card_item_id=updated_mapping.tech_card_item_id,
        tech_card_item_name=tech_card_item_name,
        is_active=updated_mapping.is_active,
        created_at=updated_mapping.created_at,
        updated_at=updated_mapping.updated_at
    )


@router.delete("/mappings/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_mapping(
    mapping_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.PRODUCT_MAPPINGS, Action.DELETE))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Delete product mapping."""
    mapping = await ProductMappingService.get_mapping_by_id(
        session=session,
        mapping_id=mapping_id
    )
    
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="Product mapping not found"
            )
        )
    
    await ProductMappingService.delete_mapping(
        session=session,
        mapping=mapping
    )
    await session.commit()


# ==================== Sales Sync Endpoints ====================

@router.post("/connections/{connection_id}/sync-sales", response_model=SaleSyncResponse)
async def sync_sales(
    connection_id: int,
    sync_request: SaleSyncRequest,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.EDIT))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Sync sales from OFD provider for specified date range.
    
    Dates are optional:
    - If not provided, automatically determined based on:
      1. Last sync date (if exists)
      2. Last invoice date (priority)
      3. Business creation date (fallback)
    - Provider limitations applied (e.g., max 90 days for AQSI)
    """
    connection = await OFDConnectionService.get_connection_by_id(
        session=session,
        connection_id=connection_id
    )
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="OFD connection not found"
            )
        )
    
    # Perform sync (dates will be auto-determined if not provided)
    stats = await SalesService.sync_sales(
        session=session,
        connection=connection,
        start_date=sync_request.start_date,
        end_date=sync_request.end_date,
        user_id=auth["user_id"],
    )
    
    # Update last_sync_at on connection (sync_sales already committed)
    connection.last_sync_at = datetime.utcnow()
    connection.last_sync_status = "success"
    
    await session.commit()  # Commit connection update
    
    return SaleSyncResponse(**stats)


@router.get("/business/{business_id}/sales")
async def get_business_sales(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.VIEW))],
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get sales for a business with optional date filtering."""
    sales, total = await SalesService.get_sales_by_business(
        session=session,
        business_id=business_id,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    
    return {
        "items": [SaleResponse.model_validate(sale) for sale in sales],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/sales/{sale_id}", response_model=SaleDetailResponse)
async def get_sale_detail(
    sale_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.VIEW))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Get detailed sale information with items."""
    sale = await SalesService.get_sale_by_id(
        session=session,
        sale_id=sale_id
    )
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                error_code=ErrorCode.NOT_FOUND,
                detail="Sale not found"
            )
        )
    
    return SaleDetailResponse.model_validate(sale)


@router.post("/business/{business_id}/update-sales-status")
async def update_sales_processing_status(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.EDIT))],
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Update processing_status for all Sales based on their items' processed state.
    Useful for fixing statuses after migrations or bulk processing.
    """
    updated_counts = await SalesService.update_sales_processing_status(
        session=session,
        business_id=business_id,
    )
    
    return {
        "message": "Sales processing status updated",
        "updated_counts": updated_counts,
    }


@router.get("/business/{business_id}/unmapped-items")
async def get_unmapped_sale_items(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.OFD_CONNECTIONS, Action.VIEW))],
    limit: int = Query(100, ge=1, le=1000),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get unmapped sale items that need product mapping."""
    items = await SalesService.get_unmapped_items(
        session=session,
        business_id=business_id,
        limit=limit,
    )
    
    from app.ofd_integration.schemas import SaleItemResponse
    return [SaleItemResponse.model_validate(item) for item in items]
