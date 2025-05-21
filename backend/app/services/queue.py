from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from uuid import uuid4
from app.models.queue import QueueEntry, QueueStatus
from app.models.user import User
from app.schemas.queue import QueueCreate, QueueUpdate, QueueStatusResponse, PublicQueueCreate, QueueResponse
from sqlalchemy import text
import json

def create_queue_entry(db: Session, queue: PublicQueueCreate) -> QueueResponse:
    max_queue_number = db.query(QueueEntry.queue_number).order_by(QueueEntry.queue_number.desc()).first()
    queue_number = (max_queue_number[0] + 1) if max_queue_number else 1
    db_queue = QueueEntry(
        id=str(uuid4()),
        queue_number=queue_number,
        full_name=queue.full_name,
        phone=queue.phone,
        programs=queue.programs,  # SQLAlchemy должен автоматически преобразовать это в JSON
        status=QueueStatus.WAITING,
        notes=queue.notes,
        assigned_employee_name=queue.assigned_employee_name
    )
    db.add(db_queue)
    db.commit()
    db.refresh(db_queue)
    return db_queue

def update_queue_entry(db: Session, queue_id: str, queue_update: QueueUpdate) -> QueueResponse:
    queue_entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    if not queue_entry:
        return None
    for key, value in queue_update.dict(exclude_unset=True).items():
        setattr(queue_entry, key, value)
    db.commit()
    db.refresh(queue_entry)
    return queue_entry

def get_all_queue_entries(db: Session, status: Optional[QueueStatus] = None) -> List[QueueResponse]:
    query = db.query(QueueEntry)
    if status:
        query = query.filter(QueueEntry.status == status)
    return query.all()

def get_queue_count(db: Session) -> int:
    query = text("""
    SELECT COUNT(*) FROM queue_entries 
    WHERE status::text IN ('waiting', 'in_progress')
    """)
    result = db.execute(query).scalar()
    return result or 0

def get_queue_status(db: Session, phone: str) -> Optional[QueueStatusResponse]:
    queue_entry = db.query(QueueEntry).filter(
        QueueEntry.phone == phone,
        QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS])
    ).first()
    if not queue_entry:
        return None
    return QueueStatusResponse(
        id=queue_entry.id,
        queue_number=queue_entry.queue_number,
        status=queue_entry.status,
        created_at=queue_entry.created_at
    )