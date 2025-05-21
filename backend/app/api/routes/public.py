# app/api/routes/public.py
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from app.database import get_db
from app.models.queue import QueueEntry, QueueStatus
from app.models.user import User
from app.schemas.queue import PublicQueueCreate, QueueResponse, PublicQueueResponse  # Добавлен PublicQueueResponse
from app.services.captcha import verify_captcha
from app.services.queue import create_queue_entry, get_queue_count  # Добавлен get_queue_count, если он используется

router = APIRouter(prefix="/public")

@router.get("/display-queue", response_model=List[dict])
def get_display_queue(db: Session = Depends(get_db)):
    """Get queue entries for public display (no auth required)"""
    # Получаем записи очереди со статусом 'in_progress'
    entries = db.query(QueueEntry).filter(
        QueueEntry.status == QueueStatus.IN_PROGRESS
    ).all()
    
    # Преобразуем в список словарей и добавляем информацию о столе
    result = []
    for entry in entries:
        entry_dict = {
            "id": entry.id,
            "queue_number": entry.queue_number,
            "status": entry.status,
            "assigned_employee_name": entry.assigned_employee_name,
            "employee_desk": None
        }
        
        # Ищем информацию о столе сотрудника
        if entry.assigned_employee_name:
            employee = db.query(User).filter(User.full_name == entry.assigned_employee_name).first()
            if employee and employee.desk:
                entry_dict["employee_desk"] = employee.desk
        
        result.append(entry_dict)
    
    return result

@router.get("/employees", response_model=List[dict])
def get_employees(db: Session = Depends(get_db)):
    """Get all admission employees (public endpoint)"""
    # Изменим запрос для отладки
    all_employees = db.query(User).all()
    admission_employees = [emp for emp in all_employees if emp.role == "admission"]
    
    if not admission_employees:
        logger.warning("No admission employees found in database")
        return []  # Вместо ошибки 404 вернем пустой список
    
    # Добавим логирование для отладки
    logger.info(f"Found {len(admission_employees)} admission employees")
    return [{"name": emp.full_name} for emp in admission_employees]

@router.post("/queue", response_model=QueueResponse)
def add_to_queue(
    queue_data: PublicQueueCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Add applicant to the queue (public endpoint)"""
    # Заменяем асинхронный вызов на синхронный
    captcha_valid = verify_captcha(queue_data.captcha_token, request.client.host)
    if not captcha_valid:
        raise HTTPException(status_code=400, detail="Invalid captcha")
    existing_entry = db.query(QueueEntry).filter(
        QueueEntry.phone == queue_data.phone,
        QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS])
    ).first()
    if existing_entry:
        raise HTTPException(status_code=400, detail="Вы уже стоите в очереди")
    if queue_data.assigned_employee_name:
        employee = db.query(User).filter(
            User.full_name == queue_data.assigned_employee_name,
            User.role == "admission"
        ).first()
        if not employee:
            raise HTTPException(status_code=400, detail="Invalid employee name")
    return create_queue_entry(db, queue_data)

@router.get("/queue/check", response_model=PublicQueueResponse)
def check_queue_by_name(
    full_name: str = Query(..., description="ФИО для проверки статуса"),
    db: Session = Depends(get_db)
):
    """Проверка статуса заявки по ФИО абитуриента"""
    
    # Поиск заявки
    queue_entry = db.query(QueueEntry).filter(
        QueueEntry.full_name == full_name
    ).order_by(desc(QueueEntry.created_at)).first()
    
    if not queue_entry:
        raise HTTPException(
            status_code=404,
            detail="Заявка не найдена"
        )
    
    # Получаем позицию в очереди и кол-во людей впереди, если в ожидании
    position = None
    people_ahead = None
    estimated_time = None
    
    if queue_entry.status == QueueStatus.WAITING:
        # Позиция = количество людей со статусом WAITING и с меньшим номером + 1
        position = db.query(QueueEntry).filter(
            QueueEntry.status == QueueStatus.WAITING,
            QueueEntry.queue_number < queue_entry.queue_number
        ).count() + 1
        
        # Кол-во людей впереди = позиция - 1
        people_ahead = position - 1
        
        # Примерное время ожидания: 5 минут на человека
        estimated_time = people_ahead * 5
    
    # Формируем ответ с дополнительными данными
    response = PublicQueueResponse.from_orm(queue_entry)
    response.position = position
    response.people_ahead = people_ahead
    response.estimated_time = estimated_time
    
    return response

@router.delete("/queue/cancel/{queue_id}", response_model=QueueResponse)
def cancel_queue_by_id(
    queue_id: str,
    db: Session = Depends(get_db)
):
    """Отмена заявки по ID"""
    
    queue_entry = db.query(QueueEntry).filter(
        QueueEntry.id == queue_id,
        QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS])
    ).first()
    
    if not queue_entry:
        raise HTTPException(
            status_code=404,
            detail="Заявка не найдена или уже завершена"
        )
    
    # Меняем статус на COMPLETED (отменено)
    queue_entry.status = QueueStatus.COMPLETED
    db.commit()
    db.refresh(queue_entry)
    
    return queue_entry

@router.put("/queue/move-back/{queue_id}", response_model=PublicQueueResponse)
def move_back_in_queue(
    queue_id: str,
    db: Session = Depends(get_db)
):
    """Перемещение заявки в конец очереди"""
    
    queue_entry = db.query(QueueEntry).filter(
        QueueEntry.id == queue_id,
        QueueEntry.status == QueueStatus.WAITING
    ).first()
    
    if not queue_entry:
        raise HTTPException(
            status_code=404,
            detail="Заявка не найдена или не находится в статусе ожидания"
        )
    
    # Находим максимальный номер в очереди
    last_entry = db.query(func.max(QueueEntry.queue_number)).scalar()
    next_number = last_entry + 1 if last_entry else 1
    
    # Обновляем номер в очереди
    queue_entry.queue_number = next_number
    db.commit()
    db.refresh(queue_entry)
    
    # Получаем позицию в очереди и кол-во людей впереди
    position = db.query(QueueEntry).filter(
        QueueEntry.status == QueueStatus.WAITING,
        QueueEntry.queue_number < queue_entry.queue_number
    ).count() + 1
    
    people_ahead = position - 1
    estimated_time = people_ahead * 5
    
    # Формируем ответ с дополнительными данными
    response = PublicQueueResponse.from_orm(queue_entry)
    response.position = position
    response.people_ahead = people_ahead
    response.estimated_time = estimated_time
    
    return response

@router.get("/queue/count")
def get_queue_count_endpoint(db: Session = Depends(get_db)):  # Удалите async
    return {"count": get_queue_count(db)}