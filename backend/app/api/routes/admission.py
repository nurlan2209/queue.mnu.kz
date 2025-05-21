from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Union
import logging

from app.database import get_db
from app.models.user import User, EmployeeStatus  # Добавляем импорт EmployeeStatus
from app.models.queue import QueueEntry, QueueStatus
from app.schemas import QueueResponse, QueueUpdate, UserResponse  # Добавляем импорт UserResponse
from app.security import get_admission_user
from app.services.queue import update_queue_entry, get_all_queue_entries

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["admission"])

@router.post("/finish-work", response_model=UserResponse)
def finish_work(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Завершить рабочий день (перейти в статус offline)"""
    logger.info(f"User {current_user.id} finishing work")
    
    # Если сотрудник занят с абитуриентом, сначала освободим его
    if current_user.status == EmployeeStatus.BUSY.value:
        # Находим текущую активную заявку для этого сотрудника
        current_entry = db.query(QueueEntry).filter(
            QueueEntry.status == QueueStatus.IN_PROGRESS,
            QueueEntry.assigned_employee_name == current_user.full_name
        ).first()
        
        if current_entry:
            # Если есть активная заявка, меняем её статус на COMPLETED
            current_entry.status = QueueStatus.COMPLETED
            db.add(current_entry)
    
    # Меняем статус сотрудника на OFFLINE
    current_user.status = EmployeeStatus.OFFLINE.value
    
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"Employee {current_user.id} has finished work and is now OFFLINE")
    
    return current_user

# Сначала добавляем новые эндпоинты для управления статусом сотрудника
@router.post("/start-work", response_model=UserResponse)
def start_work(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Начать работу (отметиться как доступный)"""
    logger.info(f"User {current_user.id} starting work")
    
    current_user.status = EmployeeStatus.AVAILABLE.value
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/pause-work", response_model=UserResponse)
def pause_work(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Приостановить работу (уйти на перерыв)"""
    logger.info(f"User {current_user.id} pausing work")
    
    current_user.status = EmployeeStatus.PAUSED.value
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/resume-work", response_model=UserResponse)
def resume_work(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Возобновить работу после перерыва"""
    logger.info(f"User {current_user.id} resuming work")
    
    current_user.status = EmployeeStatus.AVAILABLE.value
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/call-next", response_model=Union[QueueResponse, dict])
def call_next_applicant(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Вызвать следующего абитуриента из очереди"""
    logger.info(f"User {current_user.id} calling next applicant")
    
    # Проверяем, что сотрудник доступен
    if current_user.status != EmployeeStatus.AVAILABLE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be available to call next applicant"
        )
    
    # Ищем следующего абитуриента в очереди, который выбрал этого сотрудника
    next_entry = db.query(QueueEntry).filter(
        QueueEntry.status == QueueStatus.WAITING,
        QueueEntry.assigned_employee_name == current_user.full_name
    ).order_by(QueueEntry.queue_number).first()
    
    if not next_entry:
        logger.warning(f"No applicants assigned to employee {current_user.full_name}")
        # Вместо ошибки 404 возвращаем JSON с сообщением
        return {
            "message": "Нет абитуриентов в очереди для вас.",
            "status": "empty_queue",
            "success": False
        }
    
    # Обновляем статус заявки и сотрудника
    next_entry.status = QueueStatus.IN_PROGRESS
    current_user.status = EmployeeStatus.BUSY.value
    
    db.commit()
    db.refresh(next_entry)
    db.refresh(current_user)
    
    logger.info(f"Queue entry {next_entry.id} moved to IN_PROGRESS, employee now BUSY")
    
    return next_entry

@router.post("/complete-current", response_model=UserResponse)
def complete_current_applicant(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Завершить работу с текущим абитуриентом"""
    logger.info(f"User {current_user.id} completing current applicant")
    
    # Проверяем, что сотрудник занят
    if current_user.status != EmployeeStatus.BUSY.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be busy with an applicant to complete"
        )
    
    # Находим текущую активную заявку для этого сотрудника
    current_entry = db.query(QueueEntry).filter(
        QueueEntry.status == QueueStatus.IN_PROGRESS,
        QueueEntry.assigned_employee_name == current_user.full_name
    ).first()
    
    if current_entry:
        # Если есть активная заявка, меняем её статус на COMPLETED
        current_entry.status = QueueStatus.COMPLETED
        db.add(current_entry)  # Убедимся, что изменения будут сохранены
    
    # Меняем статус сотрудника на AVAILABLE
    current_user.status = EmployeeStatus.AVAILABLE.value
    
    db.commit()
    
    if current_entry:
        db.refresh(current_entry)
    db.refresh(current_user)
    
    logger.info(f"Employee {current_user.id} now AVAILABLE after completing applicant")
    
    return current_user

@router.get("/status", response_model=UserResponse)
def get_employee_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Получить текущий статус сотрудника"""
    return current_user

# Существующие эндпоинты
@router.get("/queue", response_model=List[QueueResponse])
def list_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user),
    status: QueueStatus = None
):
    """Get queue entries assigned to the current user (for admission staff)"""
    logger.info(f"User {current_user.id} retrieving their queue with status {status}")
    
    # Получаем заявки, фильтруя по имени текущего сотрудника
    query = db.query(QueueEntry).filter(
        QueueEntry.assigned_employee_name == current_user.full_name
    )
    
    # Если указан статус, добавляем фильтр по нему
    if status:
        query = query.filter(QueueEntry.status == status)
    
    # Сортируем по номеру в очереди для удобства
    query = query.order_by(QueueEntry.queue_number)
    
    return query.all()

@router.post("/next", response_model=QueueResponse)
def process_next_in_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Move the next waiting applicant to in-progress status"""
    logger.info(f"User {current_user.id} processing next queue entry")
    
    # Ищем следующего абитуриента в очереди, который выбрал этого сотрудника
    next_entry = db.query(QueueEntry).filter(
        QueueEntry.status == QueueStatus.WAITING,
        QueueEntry.assigned_employee_name == current_user.full_name
    ).order_by(QueueEntry.queue_number).first()
    
    if not next_entry:
        logger.warning(f"No applicants assigned to employee {current_user.full_name}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No applicants assigned to you in the queue"
        )
    
    next_entry.status = QueueStatus.IN_PROGRESS
    current_user.status = EmployeeStatus.BUSY.value
    
    db.commit()
    db.refresh(next_entry)
    db.refresh(current_user)
    
    logger.info(f"Queue entry {next_entry.id} moved to IN_PROGRESS")
    
    return next_entry

@router.put("/queue/{queue_id}", response_model=QueueResponse)
def update_queue_status(
    queue_id: str,
    queue_update: QueueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Update queue entry status (for admission staff)"""
    logger.info(f"User {current_user.id} updating queue entry {queue_id}")
    queue_entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    
    if not queue_entry:
        logger.warning(f"Queue entry {queue_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue entry not found"
        )
    
    return update_queue_entry(db, queue_entry, queue_update)

@router.delete("/queue/{queue_id}", response_model=QueueResponse)
def delete_queue_entry(
    queue_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admission_user)
):
    """Delete a queue entry (for admission staff)"""
    logger.info(f"User {current_user.id} attempting to delete queue entry {queue_id}")
    queue_entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    
    if not queue_entry:
        logger.warning(f"Queue entry {queue_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue entry not found"
        )
    
    db.delete(queue_entry)
    db.commit()
    logger.info(f"Queue entry {queue_id} deleted successfully")
    return queue_entry