from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.archive import ArchiveQueueStatus

class ArchivedQueueResponse(BaseModel):
    id: str
    original_id: str
    queue_number: int
    full_name: str
    phone: str
    programs: List[str]
    status: ArchiveQueueStatus
    notes: Optional[str] = None
    assigned_employee_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time: Optional[int] = None
    form_language: Optional[str] = None
    archived_at: datetime
    archive_reason: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: lambda v: v.isoformat()}
    )

class ArchiveStatistics(BaseModel):
    total_archived: int
    by_reason: dict
    by_status: dict
    current_queue_size: int
    queue_limit: int

class CleanupResponse(BaseModel):
    success: bool
    message: str
    archived_count: int

class ArchiveEntriesResponse(BaseModel):
    entries: List[ArchivedQueueResponse]
    total: int
    limit: int
    offset: int