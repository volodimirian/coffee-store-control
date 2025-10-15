"""FastAPI entrypoint.""" 
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.core.db import engine
from app.core.config import settings
from app.users.models import Base

app = FastAPI(title=settings.app_title, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Quick table creation (for dev). In prod use Alembic migrations.
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("shutdown")
async def on_shutdown():
    # Application cleanup
    pass

@app.get("/health")
async def health():
    return {"status": "ok"}

# Authentication routes
app.include_router(auth_router)