from pydantic import BaseModel, EmailStr, field_validator
import re
from typing import Optional


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not v or len(v) < 3 or len(v) > 30:
            raise ValueError('Username must be 3-30 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must be alphanumeric with underscores')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v or len(v) > 128:
            raise ValueError('Password length invalid')
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    tenant_db_name: str
    shuake_token: Optional[str] = None
