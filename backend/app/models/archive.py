from sqlalchemy import Column, Integer, String, DateTime, Enum, JSON
from sqlalchemy.sql import func
from uuid import uuid4
import enum

from app.database import Base

class ArchiveQueueStatus(str, enum.Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class ArchivedQueueEntry(Base):
    __tablename__ = "archived_queue_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    original_id = Column(String, nullable=False)  # ID из основной таблицы
    queue_number = Column(Integer, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    programs = Column(JSON, nullable=False)
    status = Column(Enum(ArchiveQueueStatus), nullable=False)
    notes = Column(String, nullable=True)
    assigned_employee_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)  # Оригинальное время создания
    updated_at = Column(DateTime(timezone=True), nullable=True)   # Оригинальное время обновления
    completed_at = Column(DateTime(timezone=True), nullable=True) # Время завершения
    processing_time = Column(Integer, nullable=True)
    form_language = Column(String, nullable=True)
    archived_at = Column(DateTime(timezone=True), server_default=func.now())  # Время архивирования
    archive_reason = Column(String, nullable=True)  # Причина архивирования (limit_reached, manual, etc.)