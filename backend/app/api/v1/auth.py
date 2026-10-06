from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.schemas.token import Token
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    try:
        user = auth_service.register_user(user_in)
        token = auth_service.generate_token(user)
        return {"access_token": token, "token_type": "bearer", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos"
        )
    token = auth_service.generate_token(user)
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

