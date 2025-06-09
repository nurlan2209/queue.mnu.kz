from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
import logging
from typing import List

from app.models.queue import QueueEntry, QueueStatus
from app.models.archive import ArchivedQueueEntry, ArchiveQueueStatus

logger = logging.getLogger(__name__)

QUEUE_LIMIT = 99  # Максимальное количество активных заявок

def get_active_queue_count(db: Session) -> int:
    """Получить количество активных заявок (не completed и не cancelled)"""
    return db.query(QueueEntry).filter(
        QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS, QueueStatus.PAUSED])
    ).count()

def get_completed_queue_count(db: Session) -> int:
    """Получить количество завершенных заявок"""
    return db.query(QueueEntry).filter(
        QueueEntry.status == QueueStatus.COMPLETED
    ).count()

def archive_queue_entry(db: Session, queue_entry: QueueEntry, reason: str = "manual") -> ArchivedQueueEntry:
    """Архивировать одну заявку"""
    try:
        # Создаем запись в архиве
        archived_entry = ArchivedQueueEntry(
            original_id=queue_entry.id,
            queue_number=queue_entry.queue_number,
            full_name=queue_entry.full_name,
            phone=queue_entry.phone,
            programs=queue_entry.programs,
            status=ArchiveQueueStatus(queue_entry.status.value),
            notes=queue_entry.notes,
            assigned_employee_name=queue_entry.assigned_employee_name,
            created_at=queue_entry.created_at,
            updated_at=queue_entry.updated_at,
            completed_at=queue_entry.updated_at if queue_entry.status == QueueStatus.COMPLETED else None,
            processing_time=queue_entry.processing_time,
            form_language=queue_entry.form_language,
            archive_reason=reason
        )
        
        db.add(archived_entry)
        db.flush()  # Чтобы получить ID архивной записи
        
        logger.info(f"Archived queue entry {queue_entry.id} -> archive {archived_entry.id}")
        return archived_entry
        
    except Exception as e:
        logger.error(f"Error archiving queue entry {queue_entry.id}: {e}")
        raise

def cleanup_old_completed_entries(db: Session, entries_to_remove: int = None) -> int:
    """
    Архивировать и удалить старые завершенные заявки
    
    Args:
        db: Database session
        entries_to_remove: Количество записей для удаления. Если None, удаляем все completed старше 7 дней
    
    Returns:
        Количество заархивированных записей
    """
    try:
        if entries_to_remove is not None:
            # Удаляем определенное количество самых старых completed заявок
            old_entries = db.query(QueueEntry).filter(
                QueueEntry.status == QueueStatus.COMPLETED
            ).order_by(QueueEntry.updated_at.asc()).limit(entries_to_remove).all()
        else:
            # Удаляем completed заявки старше 7 дней
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            old_entries = db.query(QueueEntry).filter(
                and_(
                    QueueEntry.status == QueueStatus.COMPLETED,
                    QueueEntry.updated_at < cutoff_date
                )
            ).all()
        
        archived_count = 0
        
        for entry in old_entries:
            try:
                # Архивируем запись
                archive_queue_entry(db, entry, reason="auto_cleanup")
                
                # Удаляем из основной таблицы
                db.delete(entry)
                archived_count += 1
                
                logger.info(f"Cleaned up completed entry {entry.id}")
                
            except Exception as e:
                logger.error(f"Error cleaning up entry {entry.id}: {e}")
                continue
        
        if archived_count > 0:
            db.commit()
            logger.info(f"Successfully archived and removed {archived_count} old completed entries")
        
        return archived_count
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_completed_entries: {e}")
        db.rollback()
        raise

def enforce_queue_limit(db: Session) -> bool:
    """
    Очистить старые completed заявки если нужно
    Всегда возвращает True - заявка всегда создается
    """
    try:
        total_count = db.query(QueueEntry).count()
        
        if total_count >= QUEUE_LIMIT:
            logger.info(f"Queue limit reached ({total_count}/{QUEUE_LIMIT}). Cleaning up old entries...")
            
            # Удаляем completed заявки для освобождения места
            completed_count = get_completed_queue_count(db)
            
            if completed_count > 0:
                entries_to_remove = max(1, completed_count - 5)  # Оставляем только 5 completed
                cleaned_count = cleanup_old_completed_entries(db, entries_to_remove)
                logger.info(f"Freed up {cleaned_count} slots by archiving completed entries")
        
        return True  # ВСЕГДА разрешаем создание новой заявки
        
    except Exception as e:
        logger.error(f"Error in enforce_queue_limit: {e}")
        return True  # Даже при ошибке разрешаем создание

def get_archive_statistics(db: Session) -> dict:
    """Получить статистику архива"""
    try:
        total_archived = db.query(ArchivedQueueEntry).count()
        
        # Статистика по причинам архивирования
        by_reason = db.query(
            ArchivedQueueEntry.archive_reason,
            func.count(ArchivedQueueEntry.id)
        ).group_by(ArchivedQueueEntry.archive_reason).all()
        
        # Статистика по статусам
        by_status = db.query(
            ArchivedQueueEntry.status,
            func.count(ArchivedQueueEntry.id)
        ).group_by(ArchivedQueueEntry.status).all()
        
        return {
            "total_archived": total_archived,
            "by_reason": dict(by_reason),
            "by_status": dict(by_status),
            "current_queue_size": db.query(QueueEntry).count(),
            "queue_limit": QUEUE_LIMIT
        }
        
    except Exception as e:
        logger.error(f"Error getting archive statistics: {e}")
        return {
            "total_archived": 0,
            "by_reason": {},
            "by_status": {},
            "current_queue_size": 0,
            "queue_limit": QUEUE_LIMIT
        }