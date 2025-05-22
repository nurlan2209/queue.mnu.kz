from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.queue import QueueEntry, QueueStatus
from app.models.video import VideoSettings  # Добавляем импорт
from app.schemas.queue import QueueResponse
from app.schemas.video import VideoSettingsResponse, VideoSettingsUpdate  # Добавляем импорт
from app.schemas import AdminUserCreate, UserResponse, UserUpdate
from app.security import get_admin_user
from app.services.user import create_user
from app.services.queue import get_all_queue_entries
from fastapi.responses import StreamingResponse
import io
import csv

router = APIRouter()

@router.get("/queue/export")
def export_queue_to_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Export all queue entries to CSV"""
    # Get all queue entries
    queue_entries = get_all_queue_entries(db)
    
    # Create CSV file in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["ФИО", "Программы", "Номер", "Сотрудник", "Дата создания", "Статус", "Время обработки (сек)"])
    
    # Write data
    for entry in queue_entries:
        programs = ", ".join(entry.programs) if isinstance(entry.programs, list) else entry.programs
        created_at = entry.created_at.strftime("%Y-%m-%d %H:%M:%S") if entry.created_at else "-"
        writer.writerow([
            entry.full_name,
            programs,
            entry.queue_number,
            entry.assigned_employee_name or "-",
            created_at,
            entry.status.value,
            entry.processing_time or "-"
        ])
    
    # Return file as response
    output.seek(0)
    headers = {
        'Content-Disposition': 'attachment; filename="queue_data.csv"'
    }
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), headers=headers, media_type="text/csv")

@router.post("/create-admission", response_model=UserResponse)
def create_admission_staff(
    user_data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new admission staff member (admin only)"""
    # Create a new user with admission role
    return create_user(db=db, user=user_data, role="admission")

@router.get("/employees", response_model=List[UserResponse])
def get_all_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get all employees (admin only)"""
    employees = db.query(User).filter(User.role == "admission").all()
    return employees

@router.get("/queue", response_model=List[QueueResponse])
def get_all_queue_entries_api(
    status: Optional[QueueStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get all queue entries (admin only)"""
    return get_all_queue_entries(db, status)

@router.delete("/employees/{user_id}")
def delete_employee(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete employee (admin only)"""
    employee = db.query(User).filter(User.id == user_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    db.delete(employee)
    db.commit()
    return {"detail": "Employee deleted successfully"}

@router.put("/employees/{user_id}", response_model=UserResponse)
def update_employee(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update employee data (admin only)"""
    employee = db.query(User).filter(User.id == user_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    for key, value in user_data.dict(exclude_unset=True).items():
        setattr(employee, key, value)
    
    db.commit()
    db.refresh(employee)
    return employee

# === НОВЫЕ РОУТЫ ДЛЯ УПРАВЛЕНИЯ ВИДЕО ===

@router.get("/video-settings", response_model=VideoSettingsResponse)
def get_video_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get current video settings (admin only)"""
    settings = db.query(VideoSettings).first()
    if not settings:
        # Создаем запись если её нет
        settings = VideoSettings(youtube_url="", is_enabled=False)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/video-settings", response_model=VideoSettingsResponse)
def update_video_settings(
    video_data: VideoSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update video settings (admin only)"""
    settings = db.query(VideoSettings).first()
    if not settings:
        # Создаем новую запись если её нет
        settings = VideoSettings()
        db.add(settings)
    
    # Обновляем поля
    for key, value in video_data.dict(exclude_unset=True).items():
        setattr(settings, key, value)
    
    db.commit()
    db.refresh(settings)
    return settings