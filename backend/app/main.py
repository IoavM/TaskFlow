import sys
import os
import logging
import traceback

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
import app.models  # Ensures all ORM models are registered
from app.api.router import api_router

logger = logging.getLogger("taskflow.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (works on both Neon PostgreSQL and SQLite fallback)
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables verified successfully.")
    except Exception as e:
        print(f"Warning: Database table auto-creation skipped or delayed: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Standard CORS headers to ensure browsers never see opaque CORS errors on error responses
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": "true",
}

# CORS configuration to allow local React frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# --- Structured Exception Handlers ---

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Translates Pydantic schema validation errors into clear, actionable Spanish messages.
    """
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []) if loc != "body")
        msg = err.get("msg", "Dato inválido")
        errors.append(f"{field}: {msg}" if field else msg)
    
    friendly_msg = "Error de validación en la solicitud: " + ("; ".join(errors) if errors else "Datos con formato inválido")
    return JSONResponse(
        status_code=422,
        content={
            "detail": friendly_msg,
            "errors": exc.errors(),
        },
        headers=CORS_HEADERS
    )

@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=CORS_HEADERS
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=CORS_HEADERS
    )

@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    """
    Handles database constraint errors such as duplicate keys or invalid foreign references.
    """
    error_str = str(exc.orig) if hasattr(exc, "orig") else str(exc)
    detail = "Conflicto con los datos existentes en la base de datos."
    if "unique constraint" in error_str.lower() or "duplicate key" in error_str.lower():
        detail = "El registro o correo electrónico ya existe en el sistema."
    elif "foreign key constraint" in error_str.lower():
        detail = "Referencia a un recurso inexistente en la base de datos."
        
    return JSONResponse(
        status_code=409,
        content={"detail": detail},
        headers=CORS_HEADERS
    )

@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Handles unexpected database driver or connection issues.
    """
    logger.error(f"Database error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error en la base de datos. Por favor intenta de nuevo en unos momentos."},
        headers=CORS_HEADERS
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global catch-all for any uncaught runtime exceptions.
    Prevents raw crashes and guarantees CORS headers so frontend doesn't mask as 'Failed to fetch'.
    """
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error en el servidor: {str(exc)}"},
        headers=CORS_HEADERS
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}
