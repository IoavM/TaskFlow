from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from app.core.config import settings
import bcrypt

ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        try:
            from passlib.context import CryptContext
            return CryptContext(schemes=["bcrypt"], deprecated="auto").verify(plain_password, hashed_password)
        except Exception:
            return False

def get_password_hash(password: str) -> str:
    # Direct bcrypt hashing - fully compatible across all Python versions (3.10 - 3.14+)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
