from sqlalchemy import Column, Integer, String, DateTime, Enum, JSON
from sqlalchemy.sql import func
from uuid import uuid4
import enum

from app.database import Base

class QueueStatus(str, enum.Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PAUSED = "paused"

class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    queue_number = Column(Integer, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    programs = Column(JSON, nullable=False)  # Изменено с ARRAY(String) на JSON
    status = Column(Enum(QueueStatus), nullable=False)
    notes = Column(String, nullable=True)
    assigned_employee_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    processing_time = Column(Integer, nullable=True)