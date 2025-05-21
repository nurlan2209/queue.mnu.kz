from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.queue import QueueStatus

class QueueBase(BaseModel):
    full_name: str
    phone: str
    programs: List[str]
    notes: Optional[str] = None
    assigned_employee_name: Optional[str] = None

class QueueCreate(QueueBase):
    programs: List[str]

class QueueUpdate(QueueBase):
    status: Optional[QueueStatus] = None

class PublicQueueCreate(BaseModel):
    full_name: str
    phone: str
    programs: List[str]
    notes: Optional[str] = None
    assigned_employee_name: Optional[str] = None  # Добавлено
    captcha_token: Optional[str] = None

class QueueResponse(QueueBase):
    id: str
    queue_number: int
    status: QueueStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    employee_desk: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: lambda v: v.isoformat()}
    )

class QueueStatusResponse(BaseModel):
    queue_position: int
    total_waiting: int
    status: QueueStatus
    estimated_wait_time: Optional[int] = None

class PublicQueueResponse(BaseModel):
    id: str
    queue_number: int
    full_name: str
    phone: str
    programs: List[str]
    status: QueueStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    position: Optional[int] = None
    people_ahead: Optional[int] = None
    estimated_time: Optional[int] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: lambda v: v.isoformat()}
    )