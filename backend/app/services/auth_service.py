from typing import Optional
from sqlalchemy.orm import Session
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserLogin
from app.models.user import User
from app.core.security import verify_password, create_access_token

class AuthService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)

    def register_user(self, user_in: UserCreate) -> User:
        existing = self.user_repo.get_by_email(user_in.email)
        if existing:
            raise ValueError("El correo electrónico ya se encuentra registrado")
        return self.user_repo.create(user_in)

    def authenticate_user(self, credentials: UserLogin) -> Optional[User]:
        user = self.user_repo.get_by_email(credentials.email)
        if not user:
            return None
        if not verify_password(credentials.password, user.password_hash):
            return None
        return user

    def generate_token(self, user: User) -> str:
        return create_access_token(subject=user.id)
