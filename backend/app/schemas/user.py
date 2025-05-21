from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str
    desk: Optional[str] = None  # Добавляем поле для стола

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    role: str
    status: Optional[str] = None  # Добавляем статус
    desk: Optional[str] = None    # Добавляем стол
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None

# Admin user creation schema
class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone: str
    password: str
    desk: Optional[str] = None  # Добавляем поле для стола

# Схема для обновления пользователя
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    desk: Optional[str] = None
    status: Optional[str] = None  # Добавляем статус
    is_active: Optional[bool] = None