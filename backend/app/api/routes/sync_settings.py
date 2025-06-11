from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func

from app.database import Base

class SyncSettings(Base):
    __tablename__ = "sync_settings"

    id = Column(Integer, primary_key=True, index=True)
    google_sheets_id = Column(String(100), nullable=False)
    sheet_name = Column(String(50), default="Sheet1")
    is_enabled = Column(Boolean, default=True)
    sync_mode = Column(String(20), default="realtime")  # realtime, manual, scheduled
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_status = Column(String(20), default="pending")  # success, error, pending
    last_sync_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    operation = Column(String(20), nullable=False)  # full_sync, add, update
    entry_id = Column(String, nullable=True)  # ID записи из архива
    status = Column(String(20), nullable=False)  # success, error
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())