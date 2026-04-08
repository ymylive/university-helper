from pydantic_settings import BaseSettings
from typing import Optional

PUBLIC_ROUTES = [
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/docs",
    "/openapi.json",
    "/",
    "/health",
]


class Settings(BaseSettings):
    # Database
    MAIN_DB_HOST: str = "localhost"
    MAIN_DB_NAME: str = "main_db"
    MAIN_DB_USER: str = "postgres"
    MAIN_DB_PASSWORD: str = "postgres"
    MAIN_DB_PORT: int = 5432

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    CORS_ORIGINS: list = []

    # Security
    ENFORCE_HTTPS: bool = True

    BAIDU_MAP_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY must be set in environment variables")
        if not self.CORS_ORIGINS:
            raise ValueError("CORS_ORIGINS must be set in environment variables")


settings = Settings()
