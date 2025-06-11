from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.models.sync_settings import SyncSettings, SyncLog
from app.models.archive import ArchivedQueueEntry
from app.schemas.sync import (
    SyncSettingsCreate, 
    SyncSettingsUpdate, 
    SyncSettingsResponse,
    SyncStatusResponse,
    SyncResultResponse
)
from app.security import get_admin_user
from app.models.user import User
from app.services.google_sheets import google_sheets_service
from datetime import datetime

router = APIRouter()

@router.get("/settings", response_model=SyncSettingsResponse)
def get_sync_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Получить настройки синхронизации"""
    settings = db.query(SyncSettings).first()
    if not settings:
        # Создаем настройки по умолчанию
        settings = SyncSettings(
            google_sheets_id="",
            is_enabled=False,
            last_sync_status="pending"
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings

@router.put("/settings", response_model=SyncSettingsResponse)
def update_sync_settings(
    settings_data: SyncSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Обновить настройки синхронизации"""
    settings = db.query(SyncSettings).first()
    if not settings:
        settings = SyncSettings()
        db.add(settings)
    
    # Обновляем поля
    for key, value in settings_data.dict(exclude_unset=True).items():
        setattr(settings, key, value)
    
    # Устанавливаем Google Sheets ID в сервисе
    if settings.google_sheets_id:
        google_sheets_service.set_spreadsheet_id(settings.google_sheets_id)
    
    db.commit()
    db.refresh(settings)
    
    return settings

@router.get("/status", response_model=SyncStatusResponse)
def get_sync_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Получить статус синхронизации"""
    settings = db.query(SyncSettings).first()
    total_entries = db.query(ArchivedQueueEntry).count()
    
    if not settings:
        return SyncStatusResponse(
            is_enabled=False,
            last_sync_status="pending",
            total_entries=total_entries
        )
    
    return SyncStatusResponse(
        is_enabled=settings.is_enabled,
        last_sync_at=settings.last_sync_at,
        last_sync_status=settings.last_sync_status,
        last_sync_message=settings.last_sync_message,
        total_entries=total_entries,
        google_sheets_id=settings.google_sheets_id
    )

@router.post("/manual", response_model=SyncResultResponse)
def manual_sync(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Запустить ручную синхронизацию"""
    settings = db.query(SyncSettings).first()
    if not settings or not settings.google_sheets_id:
        raise HTTPException(
            status_code=400, 
            detail="Google Sheets ID не настроен"
        )
    
    # Запускаем синхронизацию в фоне
    background_tasks.add_task(perform_full_sync, db, settings)
    
    return SyncResultResponse(
        success=True,
        message="Синхронизация запущена в фоновом режиме",
        timestamp=datetime.now()
    )

def perform_full_sync(db: Session, settings: SyncSettings):
    """Выполнить полную синхронизацию"""
    try:
        # Устанавливаем Google Sheets ID
        google_sheets_service.set_spreadsheet_id(settings.google_sheets_id)
        
        # Выполняем синхронизацию
        result = google_sheets_service.sync_all_data(db)
        
        # Обновляем настройки
        settings.last_sync_at = datetime.now()
        if result["success"]:
            settings.last_sync_status = "success"
            settings.last_sync_message = f"Синхронизировано {result.get('total_entries', 0)} записей"
        else:
            settings.last_sync_status = "error"
            settings.last_sync_message = result.get("error", "Неизвестная ошибка")
        
        db.commit()
        
        # Логируем результат
        log_entry = SyncLog(
            operation="full_sync",
            status="success" if result["success"] else "error",
            message=settings.last_sync_message
        )
        db.add(log_entry)
        db.commit()
        
    except Exception as e:
        settings.last_sync_status = "error"
        settings.last_sync_message = str(e)
        db.commit()
        
        # Логируем ошибку
        log_entry = SyncLog(
            operation="full_sync",
            status="error",
            message=str(e)
        )
        db.add(log_entry)
        db.commit()

@router.post("/test")
def test_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Тестировать подключение к Google Sheets"""
    settings = db.query(SyncSettings).first()
    if not settings or not settings.google_sheets_id:
        raise HTTPException(
            status_code=400, 
            detail="Google Sheets ID не настроен"
        )
    
    try:
        google_sheets_service.set_spreadsheet_id(settings.google_sheets_id)
        
        # Пробуем получить информацию о таблице
        spreadsheet = google_sheets_service.service.spreadsheets().get(
            spreadsheetId=settings.google_sheets_id
        ).execute()
        
        return {
            "success": True,
            "title": spreadsheet.get("properties", {}).get("title", "Unknown"),
            "sheets": [sheet["properties"]["title"] for sheet in spreadsheet.get("sheets", [])],
            "message": "Подключение успешно"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Ошибка подключения"
        }

@router.get("/stats")
def get_sync_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Получить статистику синхронизации"""
    from app.services.scheduler import realtime_sync
    return realtime_sync.get_sync_stats()

@router.get("/health")
def check_sync_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Проверить состояние синхронизации"""
    from app.services.scheduler import check_sync_health
    return check_sync_health()

@router.post("/force-sync")
def force_full_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Принудительная полная синхронизация"""
    from app.services.scheduler import manual_sync_trigger
    return manual_sync_trigger()