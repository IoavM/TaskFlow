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

    # OWASP A02: Alerta si se utiliza la clave secreta predeterminada
    if settings.SECRET_KEY == "super-secret-key-change-this-in-production-123456789":
        logger.warning(
            "ALERTA OWASP A02: Se está utilizando la SECRET_KEY predeterminada. "
            "Para producción, configura una SECRET_KEY única en las variables de entorno."
        )
    yield

# OWASP A05: Control de exposición de documentación de API
docs_url = f"{settings.API_V1_STR}/docs" if settings.DOCS_ENABLED else None
redoc_url = f"{settings.API_V1_STR}/redoc" if settings.DOCS_ENABLED else None
openapi_url = f"{settings.API_V1_STR}/openapi.json" if settings.DOCS_ENABLED else None

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=openapi_url,
    docs_url=docs_url,
    redoc_url=redoc_url,
    lifespan=lifespan
)

import re

# Origins allowed for CORS (Local dev, Vercel frontend, and Render backend preview/prod)
ALLOWED_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.*\.vercel\.app$|^https://.*\.onrender\.com$"

def get_cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin", "")
    if origin and re.match(ALLOWED_ORIGIN_REGEX, origin):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    }

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}

# OWASP A05: Inyectar Cabeceras de Seguridad HTTP Defensivas
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# CORS configuration to restrict origins safely
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Idempotent Receiver: ensures mutation requests with X-Idempotency-Key
# are processed at most once, even if the client retries.
from app.middleware.idempotency import IdempotencyMiddleware
app.add_middleware(IdempotencyMiddleware)

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
    Global catch-all for any uncaught runtime exceptions (OWASP A04/A05).
    Logs the full traceback internally but avoids leaking internals or stack traces to the client.
    """
    logger.error(f"Error interno no controlado en {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Ha ocurrido un error interno en el servidor. Por favor intenta de nuevo más tarde."},
        headers=get_cors_headers(request)
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}
