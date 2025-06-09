#!/usr/bin/env python3
"""
Скрипт для переноса всех существующих заявок в архив
Запустить один раз после создания архивной таблицы
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.queue import QueueEntry
from app.models.archive import ArchivedQueueEntry, ArchiveQueueStatus
from sqlalchemy.orm import Session
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_all_to_archive():
    """Перенести все существующие заявки в архив"""
    db = SessionLocal()
    
    try:
        # Получаем все заявки из основной таблицы
        all_entries = db.query(QueueEntry).all()
        
        logger.info(f"Найдено {len(all_entries)} заявок для переноса в архив")
        
        migrated_count = 0
        
        for entry in all_entries:
            try:
                # Проверяем, не существует ли уже в архиве
                existing = db.query(ArchivedQueueEntry).filter(
                    ArchivedQueueEntry.original_id == entry.id
                ).first()
                
                if existing:
                    logger.info(f"Заявка {entry.id} уже есть в архиве, пропускаем")
                    continue
                
                # Создаем запись в архиве
                archived_entry = ArchivedQueueEntry(
                    original_id=entry.id,
                    queue_number=entry.queue_number,
                    full_name=entry.full_name,
                    phone=entry.phone,
                    programs=entry.programs,
                    status=ArchiveQueueStatus(entry.status.value),
                    notes=entry.notes,
                    assigned_employee_name=entry.assigned_employee_name,
                    created_at=entry.created_at,
                    updated_at=entry.updated_at,
                    completed_at=entry.updated_at if entry.status.value == 'COMPLETED' else None,
                    processing_time=entry.processing_time,
                    form_language=entry.form_language,
                    archive_reason="initial_migration"
                )
                
                db.add(archived_entry)
                migrated_count += 1
                
                logger.info(f"Перенесена заявка {entry.id} (#{entry.queue_number}) - {entry.full_name}")
                
            except Exception as e:
                logger.error(f"Ошибка при переносе заявки {entry.id}: {e}")
                continue
        
        # Сохраняем все изменения
        db.commit()
        
        logger.info(f"✅ Успешно перенесено {migrated_count} заявок в архив")
        
        # Показываем статистику
        total_in_archive = db.query(ArchivedQueueEntry).count()
        total_in_queue = db.query(QueueEntry).count()
        
        logger.info(f"📊 Итого в архиве: {total_in_archive}")
        logger.info(f"📊 Итого в основной таблице: {total_in_queue}")
        
    except Exception as e:
        logger.error(f"❌ Ошибка миграции: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Начинаем миграцию существующих заявок в архив...")
    migrate_all_to_archive()
    print("✅ Миграция завершена!")