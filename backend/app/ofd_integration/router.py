"""API router for OFD integration endpoints."""
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

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
)
from app.ofd_integration.service import OFDConnectionService
from app.ofd_integration.product_mapping_service import ProductMappingService
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

@router.get("/connections/{connection_id}/products", response_model=List[OFDProductResponse])
async def get_ofd_products(
    connection_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.PRODUCT_MAPPINGS, Action.VIEW))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Get product nomenclature from OFD provider."""
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
    
    products = await ProductMappingService.get_products_from_ofd(
        session=session,
        connection=connection
    )
    
    return [OFDProductResponse.model_validate(p) for p in products]


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
        mapping_dict = ProductMappingResponse.model_validate(mapping).model_dump()
        mapping_dict["tech_card_item_name"] = mapping.tech_card_item.name if mapping.tech_card_item else None
        result.append(ProductMappingResponse(**mapping_dict))
    
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
    
    await session.commit()
    
    # Format response
    success_response = []
    for mapping in result["success"]:
        mapping_dict = ProductMappingResponse.model_validate(mapping).model_dump()
        mapping_dict["tech_card_item_name"] = mapping.tech_card_item.name
        success_response.append(mapping_dict)
    
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
    
    mapping_dict = ProductMappingResponse.model_validate(updated_mapping).model_dump()
    mapping_dict["tech_card_item_name"] = updated_mapping.tech_card_item.name
    
    return ProductMappingResponse(**mapping_dict)


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
