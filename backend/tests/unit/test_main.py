"""Tests for main FastAPI app."""
import pytest
from httpx import AsyncClient
from unittest.mock import patch
from app.main import app


class TestMainApp:
    """Test cases for main FastAPI application."""

    @pytest.mark.asyncio
    async def test_health_endpoint(self, client: AsyncClient):
        """Test health check endpoint."""
        response = await client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data == {"status": "ok"}

    @pytest.mark.asyncio 
    async def test_cors_middleware_allows_origin(self, client: AsyncClient):
        """Test that CORS middleware allows configured origin."""
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
        
        response = await client.options("/health", headers=headers)
        
        # CORS preflight should be handled
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_app_includes_auth_router(self, client: AsyncClient):
        """Test that auth routes are included."""
        # Try auth endpoint to verify router is included
        response = await client.post("/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        
        # Should get unauthorized, not 404 (which would mean router not included)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_app_includes_users_router(self, client: AsyncClient):
        """Test that users routes are included."""
        response = await client.get("/users/me")
        
        # Should get 401 (unauthorized), not 404 (which would mean router not included)
        assert response.status_code == 401

    def test_app_includes_cors_middleware(self):
        """Test that CORS middleware is configured."""
        # Test that the app has middleware configured
        assert len(app.user_middleware) > 0
        # CORS middleware should be present in the stack
        has_cors = any(str(m.cls).find('CORS') != -1 for m in app.user_middleware)
        assert has_cors

    @pytest.mark.asyncio
    async def test_shutdown_event_closes_mongo(self):
        """Test that shutdown event closes MongoDB connection."""
        from app.main import on_shutdown
        
        with patch('app.main.close_mongo_connection') as mock_close:
            await on_shutdown()
            
            # Should close MongoDB connection
            mock_close.assert_called_once()
