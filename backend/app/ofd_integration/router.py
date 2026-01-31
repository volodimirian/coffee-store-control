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
)
from app.ofd_integration.service import OFDConnectionService
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
