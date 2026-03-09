"""FastAPI entrypoint.""" 
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse

from app.auth.router import router as auth_router
from app.businesses.router import router as businesses_router
from app.expenses.supplier_router import router as suppliers_router
from app.expenses.unit_router import router as units_router
from app.expenses.month_period_router import router as periods_router
from app.expenses.expense_section_router import router as sections_router
from app.expenses.expense_category_router import router as categories_router
from app.expenses.invoice_router import router as invoices_router
from app.expenses.inventory_balance_router import router as inventory_balance_router
from app.expenses.inventory_tracking_router import router as inventory_tracking_router
from app.tech_cards.router import router as tech_cards_router
from app.ofd_integration.router import router as ofd_router
from app.core.db import engine
from app.core.config import settings
from app.core_models import Base

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description="Business Control API - expense tracking system for businesses with period-based expense management, employee management and analytics",
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
    openapi_url=settings.openapi_url,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handler to flatten error response structure
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handle HTTPException to ensure consistent error response format.
    
    If detail is a dict with error_code and detail keys, return them at top level.
    Otherwise, return detail as-is.
    """
    detail = exc.detail
    
    # If detail is a dict with our error format, flatten it
    if isinstance(detail, dict) and "error_code" in detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": detail.get("error_code"),
                "detail": detail.get("detail", detail.get("error_code"))
            }
        )
    
    # Otherwise return as-is (for backward compatibility)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail}
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
app.include_router(auth_router, prefix=settings.api_prefix)

# Business management routes
app.include_router(businesses_router, prefix=f"{settings.api_prefix}/businesses", tags=["businesses"])

# Expense tracking routes
app.include_router(suppliers_router, prefix=f"{settings.api_prefix}/expenses/suppliers", tags=["expenses", "suppliers"])
app.include_router(units_router, prefix=f"{settings.api_prefix}/expenses/units", tags=["expenses", "units"])
app.include_router(periods_router, prefix=f"{settings.api_prefix}/expenses/periods", tags=["expenses", "periods"])
app.include_router(sections_router, prefix=f"{settings.api_prefix}/expenses/sections", tags=["expenses", "sections"])
app.include_router(categories_router, prefix=f"{settings.api_prefix}/expenses/categories", tags=["expenses", "categories"])
app.include_router(invoices_router, prefix=f"{settings.api_prefix}/expenses/invoices", tags=["expenses", "invoices"])
app.include_router(inventory_balance_router, prefix=f"{settings.api_prefix}/expenses", tags=["expenses", "inventory-balance"])
app.include_router(inventory_tracking_router, prefix=f"{settings.api_prefix}/expenses", tags=["expenses", "inventory-tracking"])

# Technology cards routes
app.include_router(tech_cards_router, prefix=f"{settings.api_prefix}/tech-cards", tags=["tech-cards"])

# OFD Integration routes
app.include_router(ofd_router, prefix=f"{settings.api_prefix}/ofd", tags=["ofd-integration"])
