from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from uuid import uuid4
import logging
import random
from app.models.queue import QueueEntry, QueueStatus
from app.models.user import User, EmployeeStatus
from app.schemas.queue import QueueCreate, QueueUpdate, QueueStatusResponse, PublicQueueCreate, QueueResponse
from app.services.archive import enforce_queue_limit, cleanup_old_completed_entries
from sqlalchemy import text
import json

logger = logging.getLogger(__name__)

def select_employee_automatically(db: Session) -> Optional[str]:
    """
    Автоматически выбирает сотрудника для новой заявки
    
    Алгоритм:
    1. Находит всех доступных сотрудников (available, busy)
    2. Считает количество активных заявок у каждого
    3. Выбирает сотрудника с минимальным количеством заявок
    4. При равенстве - случайный выбор
    """
    try:
        # Получаем всех доступных сотрудников (не offline, не paused)
        available_employees = db.query(User).filter(
            User.role == "admission",
            User.status.in_([EmployeeStatus.AVAILABLE.value, EmployeeStatus.BUSY.value])
        ).all()
        
        if not available_employees:
            logger.warning("No available employees found for auto-assignment")
            return None
        
        # Считаем количество активных заявок для каждого сотрудника
        employee_workload = []
        
        for employee in available_employees:
            # Считаем заявки со статусом WAITING и IN_PROGRESS
            active_count = db.query(QueueEntry).filter(
                QueueEntry.assigned_employee_name == employee.full_name,
                QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS])
            ).count()
            
            employee_workload.append({
                'employee': employee,
                'count': active_count
            })
            
            logger.info(f"Employee {employee.full_name}: {active_count} active entries")
        
        # Находим минимальное количество заявок
        min_count = min(emp['count'] for emp in employee_workload)
        
        # Находим всех сотрудников с минимальным количеством заявок
        employees_with_min_count = [
            emp['employee'] for emp in employee_workload 
            if emp['count'] == min_count
        ]
        
        # Если несколько сотрудников с одинаковым минимумом - выбираем случайно
        selected_employee = random.choice(employees_with_min_count)
        
        logger.info(f"Auto-selected employee: {selected_employee.full_name} (workload: {min_count} entries)")
        
        return selected_employee.full_name
        
    except Exception as e:
        logger.error(f"Error in automatic employee selection: {e}")
        return None

def create_queue_entry(db: Session, queue: PublicQueueCreate) -> QueueResponse:
    """Создать новую заявку с автоматическим распределением сотрудника"""
    try:
        # АВТОМАТИЧЕСКИ ВЫБИРАЕМ СОТРУДНИКА если не указан
        if not queue.assigned_employee_name:
            queue.assigned_employee_name = select_employee_automatically(db)
            
            if not queue.assigned_employee_name:
                logger.error("No employees available for assignment")
                raise Exception("В данный момент нет доступных сотрудников для обработки заявки")
        
        # Остальная логика остается прежней
        total_count = db.query(QueueEntry).count()
        
        if total_count >= 99:  # Если достигли лимита
            logger.info(f"Queue limit reached ({total_count}/99). Auto-cleaning old completed entries...")
            
            # Удаляем ТОЛЬКО completed заявки (НЕ трогаем WAITING/IN_PROGRESS)
            completed_entries = db.query(QueueEntry).filter(
                QueueEntry.status == QueueStatus.COMPLETED
            ).order_by(QueueEntry.updated_at.asc()).all()  # Сначала самые старые
            
            if completed_entries:
                archived_count = 0
                for entry in completed_entries:
                    try:
                        from app.services.archive import archive_queue_entry
                        archive_queue_entry(db, entry, reason="auto_cleanup")
                        db.delete(entry)
                        archived_count += 1
                    except Exception as e:
                        logger.error(f"Error archiving entry {entry.id}: {e}")
                        continue
                
                db.commit()
                logger.info(f"Auto-cleaned {archived_count} COMPLETED entries")
                
                # Перенумеровываем ОСТАВШИЕСЯ заявки (WAITING/IN_PROGRESS/PAUSED)
                remaining_entries = db.query(QueueEntry).order_by(QueueEntry.created_at.asc()).all()
                
                for i, entry in enumerate(remaining_entries, 1):
                    entry.queue_number = i
                    db.add(entry)
                
                db.commit()
                logger.info(f"Re-numbered {len(remaining_entries)} remaining entries")
            else:
                logger.warning("Queue is full but no COMPLETED entries to clean!")
                raise Exception("Queue is full and no completed entries available for cleanup")
        
        # Получаем следующий номер для новой заявки
        max_queue_number = db.query(QueueEntry.queue_number).order_by(QueueEntry.queue_number.desc()).first()
        queue_number = (max_queue_number[0] + 1) if max_queue_number else 1
        
        # Создаем новую заявку в основной таблице
        db_queue = QueueEntry(
            id=str(uuid4()),
            queue_number=queue_number,
            full_name=queue.full_name,
            phone=queue.phone,
            programs=queue.programs,
            status=QueueStatus.WAITING,
            notes=queue.notes,
            assigned_employee_name=queue.assigned_employee_name,  # Теперь автоматически назначенный
            form_language=queue.form_language 
        )
        
        db.add(db_queue)
        db.flush()  # Чтобы получить ID
        
        # ОДНОВРЕМЕННО создаем копию в архиве
        from app.models.archive import ArchivedQueueEntry, ArchiveQueueStatus
        
        archived_entry = ArchivedQueueEntry(
            original_id=db_queue.id,
            queue_number=db_queue.queue_number,
            full_name=db_queue.full_name,
            phone=db_queue.phone,
            programs=db_queue.programs,
            status=ArchiveQueueStatus.WAITING,
            notes=db_queue.notes,
            assigned_employee_name=db_queue.assigned_employee_name,
            created_at=db_queue.created_at,
            updated_at=None,
            completed_at=None,
            processing_time=None,
            form_language=db_queue.form_language,
            archive_reason="auto_backup"
        )
        
        db.add(archived_entry)
        db.commit()
        db.refresh(db_queue)
        
        logger.info(f"Created new queue entry {db_queue.id} with number {queue_number} assigned to {queue.assigned_employee_name}")
        
        return db_queue
        
    except Exception as e:
        logger.error(f"Error creating queue entry: {e}")
        db.rollback()
        raise

def update_archive_status(db: Session, queue_entry: QueueEntry):
    """Обновить статус в архиве при изменении в основной таблице"""
    try:
        from app.models.archive import ArchivedQueueEntry, ArchiveQueueStatus
        
        archived_entry = db.query(ArchivedQueueEntry).filter(
            ArchivedQueueEntry.original_id == queue_entry.id
        ).first()
        
        if archived_entry:
            archived_entry.status = ArchiveQueueStatus(queue_entry.status.value)
            archived_entry.updated_at = queue_entry.updated_at
            archived_entry.processing_time = queue_entry.processing_time
            
            if queue_entry.status == QueueStatus.COMPLETED:
                archived_entry.completed_at = queue_entry.updated_at
            
            db.add(archived_entry)
            logger.info(f"Updated archive status for entry {queue_entry.id}")
        
    except Exception as e:
        logger.warning(f"Failed to update archive status for {queue_entry.id}: {e}")

def update_queue_entry(db: Session, queue_id: str, queue_update: QueueUpdate) -> QueueResponse:
    queue_entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    if not queue_entry:
        return None
    for key, value in queue_update.dict(exclude_unset=True).items():
        setattr(queue_entry, key, value)
    
    # Обновляем архив тоже
    update_archive_status(db, queue_entry)
    
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

def start_processing_time(db: Session, queue_id: str):
    """Start processing time for a queue entry"""
    queue_entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    if not queue_entry:
        return None
    
    queue_entry.status = QueueStatus.IN_PROGRESS
    queue_entry.updated_at = func.now()
    db.commit()
    db.refresh(queue_entry)
    return queue_entry

def end_processing_time(db: Session, queue_id: str):
    """End processing time and calculate the duration"""
    queue_entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    if not queue_entry:
        return None
    
    # Calculate processing time in seconds
    if queue_entry.updated_at:
        # Получаем текущее время
        current_time = db.query(func.now()).scalar()
        # Вычисляем разницу в секундах
        processing_time = int((current_time - queue_entry.updated_at).total_seconds())
        queue_entry.processing_time = processing_time
    
    queue_entry.status = QueueStatus.COMPLETED
    db.commit()
    db.refresh(queue_entry)
    return queue_entry