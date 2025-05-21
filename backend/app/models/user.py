from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.sql import func
from uuid import uuid4
from enum import Enum

from app.database import Base

class EmployeeStatus(str, Enum):
    AVAILABLE = "available"  # Доступен для приема
    BUSY = "busy"            # Занят (работает с абитуриентом)
    PAUSED = "paused"        # На паузе (перерыв)
    OFFLINE = "offline"      # Не на работе

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid4())) 
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    desk = Column(String, nullable=True)
    status = Column(String, default=EmployeeStatus.OFFLINE.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())