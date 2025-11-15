"""Core config (pydantic-settings)."""
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
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
    
    # CORS
    cors_origins: Union[str, List[str]] = Field(..., alias="CORS_ORIGINS")
    cors_credentials: bool = Field(True, alias="CORS_CREDENTIALS")
    
    # Database debug
    db_echo: bool = Field(False, alias="DB_ECHO")
    
    # OpenAPI/Swagger settings
    docs_url: str = Field("/docs", alias="DOCS_URL")
    redoc_url: str = Field("/redoc", alias="REDOC_URL") 
    openapi_url: str = Field("/openapi.json", alias="OPENAPI_URL")
    api_prefix: str = Field("/api", alias="API_PREFIX")

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v) -> List[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            # Remove any extra quotes or whitespace
            v = v.strip().strip('"').strip("'")
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            # Fallback: split by comma
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        json_schema_extra={
            "env_parse_none_str": None
        }
    )

# Create singleton instance
settings = Settings()  # type: ignore[call-arg]