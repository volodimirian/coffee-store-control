"""Service for managing OFD connections and operations."""
from typing import List, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.ofd_integration.models import OFDProvider, OFDConnection
from app.ofd_integration.schemas import (
    OFDConnectionCreate,
    OFDConnectionUpdate,
)
from app.ofd_integration.providers.base import OFDProviderBase
from app.ofd_integration.providers.mock import MockOFDProvider
from app.core.security import encrypt_api_key, decrypt_api_key


class OFDConnectionService:
    """Service for managing OFD connections."""

    @staticmethod
    def _get_provider_instance(
        provider_code: str,
        api_key: str,
        base_url: str
    ) -> OFDProviderBase:
        """Get OFD provider instance by code.
        
        Args:
            provider_code: Provider code ('mock', 'aqsi', etc.)
            api_key: Decrypted API key
            base_url: API URL
            
        Returns:
            Provider instance
            
        Raises:
            ValueError: If provider code is unknown
        """
        if provider_code == "mock":
            return MockOFDProvider(api_key=api_key, base_url=base_url)
        # TODO: Add AQSI provider in Stage 10
        # elif provider_code == "aqsi":
        #     return AQSIOFDProvider(api_key=api_key, base_url=base_url)
        else:
            raise ValueError(f"Unknown OFD provider: {provider_code}")

    @staticmethod
    async def get_all_providers(
        session: AsyncSession,
        only_active: bool = True
    ) -> List[OFDProvider]:
        """Get all OFD providers."""
        query = select(OFDProvider)
        if only_active:
            query = query.where(OFDProvider.is_active == True)  # noqa: E712
        query = query.order_by(OFDProvider.name)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_provider_by_id(
        session: AsyncSession,
        provider_id: int
    ) -> Optional[OFDProvider]:
        """Get provider by ID."""
        result = await session.execute(
            select(OFDProvider).where(OFDProvider.id == provider_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_connections_by_business(
        session: AsyncSession,
        business_id: int,
        only_active: bool = False
    ) -> List[OFDConnection]:
        """Get all connections for a business."""
        query = select(OFDConnection).where(
            OFDConnection.business_id == business_id
        ).options(
            selectinload(OFDConnection.provider),
            selectinload(OFDConnection.business)
        )
        
        if only_active:
            query = query.where(OFDConnection.is_active == True)  # noqa: E712
            
        query = query.order_by(OFDConnection.created_at.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_connection_by_id(
        session: AsyncSession,
        connection_id: int
    ) -> Optional[OFDConnection]:
        """Get connection by ID."""
        result = await session.execute(
            select(OFDConnection)
            .where(OFDConnection.id == connection_id)
            .options(
                selectinload(OFDConnection.provider),
                selectinload(OFDConnection.business)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_connection(
        session: AsyncSession,
        business_id: int,
        connection_data: OFDConnectionCreate,
        created_by_user_id: int
    ) -> OFDConnection:
        """Create new OFD connection."""
        # Encrypt API key before storing
        encrypted_key = encrypt_api_key(connection_data.api_key)
        
        connection = OFDConnection(
            business_id=business_id,
            provider_id=connection_data.provider_id,
            api_key_encrypted=encrypted_key,
            custom_base_url=connection_data.custom_base_url,
            is_active=True,
            created_by=created_by_user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        session.add(connection)
        await session.flush()
        await session.refresh(connection, ["provider", "business"])
        return connection

    @staticmethod
    async def update_connection(
        session: AsyncSession,
        connection: OFDConnection,
        connection_data: OFDConnectionUpdate
    ) -> OFDConnection:
        """Update existing OFD connection."""
        # Update fields if provided
        if connection_data.api_key is not None:
            connection.api_key_encrypted = encrypt_api_key(connection_data.api_key)
        
        if connection_data.custom_base_url is not None:
            connection.custom_base_url = connection_data.custom_base_url
        
        if connection_data.is_active is not None:
            connection.is_active = connection_data.is_active
        
        connection.updated_at = datetime.utcnow()
        
        await session.flush()
        await session.refresh(connection, ["provider", "business"])
        return connection

    @staticmethod
    async def delete_connection(
        session: AsyncSession,
        connection: OFDConnection
    ) -> None:
        """Delete OFD connection."""
        await session.delete(connection)
        await session.flush()

    @staticmethod
    async def test_connection(
        session: AsyncSession,
        connection: OFDConnection
    ) -> dict:
        """Test OFD connection by validating credentials.
        
        Returns:
            dict with 'success' bool and optional 'error' message
        """
        try:
            # Decrypt API key
            api_key = decrypt_api_key(connection.api_key_encrypted)
            
            # Get base URL (custom or default from provider)
            base_url = connection.custom_base_url or connection.provider.base_url
            
            # Get provider instance
            provider = OFDConnectionService._get_provider_instance(
                provider_code=connection.provider.code,
                api_key=api_key,
                base_url=base_url
            )
            
            # Test credentials
            is_valid = await provider.validate_credentials()
            
            if is_valid:
                # Update last sync status
                connection.last_sync_at = datetime.utcnow()
                connection.last_sync_status = "success"
                connection.last_sync_error = None
                await session.flush()
                
                return {"success": True}
            else:
                return {
                    "success": False,
                    "error": "Invalid credentials"
                }
                
        except Exception as e:
            # Update error status
            connection.last_sync_status = "error"
            connection.last_sync_error = str(e)
            await session.flush()
            
            return {
                "success": False,
                "error": str(e)
            }
