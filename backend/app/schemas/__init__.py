# app/schemas/__init__.py

from app.schemas.user import (
    UserBase, 
    UserCreate, 
    UserLogin, 
    UserResponse, 
    Token, 
    TokenData, 
    AdminUserCreate,
    UserUpdate  # Добавьте эту строку
)

from app.schemas.queue import (
    QueueCreate,
    QueueUpdate,
    QueueResponse,
    QueueStatusResponse,
    PublicQueueCreate,
    PublicQueueResponse
)

__all__ = [
    'UserBase',
    'UserCreate',
    'UserLogin',
    'UserResponse',
    'Token',
    'TokenData',
    'AdminUserCreate',
    'UserUpdate',  # Добавьте эту строку
    'QueueCreate',
    'QueueUpdate',
    'QueueResponse',
    'QueueStatusResponse',
    'PublicQueueCreate',
    'PublicQueueResponse'
]