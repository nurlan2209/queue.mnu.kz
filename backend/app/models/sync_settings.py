from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class SyncSettings(Base):
    __tablename__ = "sync_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    google_sheets_id = Column(String, nullable=True)
    is_enabled = Column(Boolean, default=False)
    sync_mode = Column(String, default="realtime")  # realtime, manual, scheduled
    last_sync_at = Column(DateTime, nullable=True)
    last_sync_status = Column(String, nullable=True)  # success, error
    last_sync_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class SyncLog(Base):
    __tablename__ = "sync_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    operation = Column(String, nullable=False)  # add, update, delete, full_sync
    entry_id = Column(String, nullable=True)  # ID записи архива
    status = Column(String, nullable=False)  # success, error
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())