import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.schemas.token import Token
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User
from app.core.rate_limiter import rate_limit, get_client_ip

logger = logging.getLogger("taskflow.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit(max_requests=10, window_seconds=300))])
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    try:
        user = auth_service.register_user(user_in)
        token = auth_service.generate_token(user)
        client_ip = get_client_ip(request)
        logger.info(f"Nuevo usuario registrado con éxito: ID {user.id} ({user.email}) desde IP {client_ip}")
        return {"access_token": token, "token_type": "bearer", "user": user}
    except ValueError as e:
        client_ip = get_client_ip(request)
        logger.warning(f"Intento de registro fallido para '{user_in.email}' desde IP {client_ip}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/login", response_model=Token, dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))])
def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(credentials)
    if not user:
        client_ip = get_client_ip(request)
        logger.warning(f"Intento fallido de inicio de sesión para '{credentials.email}' desde IP {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos"
        )
    token = auth_service.generate_token(user)
    client_ip = get_client_ip(request)
    logger.info(f"Inicio de sesión exitoso para usuario ID {user.id} ({user.email}) desde IP {client_ip}")
    return {"access_token": token, "token_type": "bearer", "user": user}

from pydantic import BaseModel

class GoogleLoginRequest(BaseModel):
    credential: str

@router.post("/google", response_model=Token)
def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        from app.core.config import settings

        configured_client_id = (settings.GOOGLE_CLIENT_ID or "").strip()
        default_client_id = "809547812717-qjoafrr77qjmrr7qimt9o8m7t9q9lqiq.apps.googleusercontent.com"
        valid_audiences = [cid for cid in {configured_client_id, default_client_id} if cid]
        target_audience = valid_audiences[0] if len(valid_audiences) == 1 else valid_audiences

        idinfo = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            audience=target_audience
        )

        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Token de Google no contiene correo electrónico")

        first_name = idinfo.get("given_name")
        last_name = idinfo.get("family_name")

        user = auth_service.authenticate_or_create_google_user(
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        token = auth_service.generate_token(user)
        return {"access_token": token, "token_type": "bearer", "user": user}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Token de Google inválido: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al autenticar con Google: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

