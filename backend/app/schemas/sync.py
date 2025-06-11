from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SyncSettingsCreate(BaseModel):
    google_sheets_id: str
    is_enabled: bool = True
    sync_mode: str = "realtime"

class SyncSettingsUpdate(BaseModel):
    google_sheets_id: Optional[str] = None
    is_enabled: Optional[bool] = None
    sync_mode: Optional[str] = None

class SyncSettingsResponse(BaseModel):
    id: int
    google_sheets_id: Optional[str]
    is_enabled: bool
    sync_mode: str
    last_sync_at: Optional[datetime]
    last_sync_status: Optional[str]
    last_sync_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SyncStatusResponse(BaseModel):
    is_enabled: bool
    last_sync_at: Optional[datetime]
    last_sync_status: str
    last_sync_message: Optional[str]
    total_entries: int
    google_sheets_id: Optional[str]

class SyncResultResponse(BaseModel):
    success: bool
    message: str
    timestamp: datetime