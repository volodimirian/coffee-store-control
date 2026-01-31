"""Core config (pydantic-settings)."""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
import json

class Settings(BaseSettings):
    app_env: str = Field(..., alias="APP_ENV")
    app_title: str = Field(..., alias="APP_TITLE")
    app_version: str = Field(..., alias="APP_VERSION")
    
    # Database
    database_url: str = Field(..., alias="DATABASE_URL")
    
    # JWT
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_alg: str = Field("HS256", alias="JWT_ALG")
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=30, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # CORS
    cors_origins: List[str] = Field(..., alias="CORS_ORIGINS")
    cors_credentials: bool = Field(True, alias="CORS_CREDENTIALS")
    
    # Database debug
    db_echo: bool = Field(False, alias="DB_ECHO")
    
    # OpenAPI/Swagger settings
    docs_url: str = Field("/docs", alias="DOCS_URL")
    redoc_url: str = Field("/redoc", alias="REDOC_URL") 
    openapi_url: str = Field("/openapi.json", alias="OPENAPI_URL")
    api_prefix: str = Field("/api", alias="API_PREFIX")
    
    # Encryption for OFD API keys
    encryption_key: str = Field(..., alias="ENCRYPTION_KEY")

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # Fallback: split by comma
                return [origin.strip() for origin in v.split(',')]
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8"
    }

# Create singleton instance
settings = Settings()  # type: ignore[call-arg]