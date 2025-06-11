import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import event, text
from apscheduler.schedulers.background import BackgroundScheduler

from app.database import SessionLocal
from app.models.archive import ArchivedQueueEntry

logger = logging.getLogger(__name__)

# Глобальный планировщик для триггеров БД
scheduler = BackgroundScheduler()

def process_sync_log(db: Session):
    """Обработка логов синхронизации"""
    try:
        # Получаем необработанные записи
        unprocessed = db.execute(text("""
            SELECT id, operation, entry_id FROM sync_log 
            WHERE processed = FALSE
            ORDER BY timestamp ASC
        """)).fetchall()
        
        if not unprocessed:
            return
            
        logger.info(f"📝 Обрабатываем {len(unprocessed)} записей синхронизации")
        
        # Группируем операции по типу
        delete_operations = []
        update_operations = []
        
        for log_entry in unprocessed:
            log_id, operation, entry_id = log_entry
            if operation == 'DELETE':
                delete_operations.append((log_id, entry_id))
            elif operation == 'UPDATE':
                update_operations.append((log_id, entry_id))
        
        # Если есть удаления - делаем полную пересинхронизацию
        if delete_operations:
            logger.info(f"🔄 Найдено {len(delete_operations)} удалений - запускаем полную пересинхронизацию")
            
            try:
                from app.services.google_sheets import google_sheets_service
                result = google_sheets_service.sync_all_data(db)
                
                if result.get("success"):
                    logger.info(f"✅ Полная пересинхронизация завершена: {result.get('synced_count', 0)} записей")
                    # Помечаем все операции удаления как обработанные
                    for log_id, entry_id in delete_operations:
                        db.execute(text("UPDATE sync_log SET processed = TRUE WHERE id = :log_id"), 
                                  {"log_id": log_id})
                        logger.info(f"🗑️ Обработано удаление записи {entry_id} через полную синхронизацию")
                else:
                    logger.error(f"❌ Ошибка полной пересинхронизации: {result.get('error')}")
                    
            except Exception as e:
                logger.error(f"❌ Исключение при полной пересинхронизации: {e}")
        
        # Обрабатываем UPDATE операции по отдельности
        for log_id, entry_id in update_operations:
            try:
                from app.services.google_sheets import google_sheets_service
                
                # Для UPDATE нужно получить актуальные данные из БД
                entry = db.query(ArchivedQueueEntry).filter(
                    ArchivedQueueEntry.id == entry_id
                ).first()
                
                if entry:
                    result = google_sheets_service.update_entry_by_id(entry)
                    if result.get("success"):
                        logger.info(f"📝 Обновлена запись {entry_id} в Google Sheets через триггер БД")
                        db.execute(text("UPDATE sync_log SET processed = TRUE WHERE id = :log_id"), 
                                  {"log_id": log_id})
                    else:
                        logger.error(f"❌ Ошибка обновления {entry_id}: {result.get('error')}")
                else:
                    logger.warning(f"⚠️ Запись {entry_id} не найдена для обновления")
                    db.execute(text("UPDATE sync_log SET processed = TRUE WHERE id = :log_id"), 
                              {"log_id": log_id})
                          
            except Exception as e:
                logger.error(f"❌ Ошибка обработки UPDATE для {entry_id}: {e}")
        
        db.commit()
        
    except Exception as e:
        logger.error(f"❌ Ошибка обработки логов синхронизации: {e}")
        db.rollback()

def process_sync_log_job():
    """Джоб для обработки логов синхронизации"""
    try:
        db = SessionLocal()
        process_sync_log(db)
        db.close()
    except Exception as e:
        logger.error(f"❌ Ошибка джоба обработки логов: {e}")

def setup_database_triggers(db: Session):
    """Настройка триггеров базы данных для отслеживания прямых изменений"""
    try:
        # Создаем таблицу для логов синхронизации (с правильным типом для UUID)
        sync_log_table = """
        -- Удаляем старую таблицу если есть с неправильным типом
        DROP TABLE IF EXISTS sync_log;
        
        -- Создаем новую таблицу с правильным типом
        CREATE TABLE sync_log (
            id SERIAL PRIMARY KEY,
            operation VARCHAR(10) NOT NULL,
            entry_id TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT NOW(),
            processed BOOLEAN DEFAULT FALSE
        );
        """
        
        # SQL триггер с правильным синтаксисом $$..$$
        trigger_sql = """
        -- Удаляем старую функцию
        DROP FUNCTION IF EXISTS notify_archive_changes() CASCADE;
        
        -- Создаем функцию с правильным синтаксисом
        CREATE OR REPLACE FUNCTION notify_archive_changes()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' THEN
                INSERT INTO sync_log (operation, entry_id, timestamp) 
                VALUES ('DELETE', OLD.id::text, NOW());
                RETURN OLD;
            ELSIF TG_OP = 'UPDATE' THEN
                INSERT INTO sync_log (operation, entry_id, timestamp) 
                VALUES ('UPDATE', NEW.id::text, NOW());
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;

        -- Удаляем старые триггеры если есть
        DROP TRIGGER IF EXISTS archive_delete_trigger ON archived_queue_entries;
        DROP TRIGGER IF EXISTS archive_update_trigger ON archived_queue_entries;
        
        -- Создаем триггер для удалений
        CREATE TRIGGER archive_delete_trigger
            AFTER DELETE ON archived_queue_entries
            FOR EACH ROW
            EXECUTE FUNCTION notify_archive_changes();
            
        -- Создаем триггер для обновлений (для изменений через Adminer)
        CREATE TRIGGER archive_update_trigger
            AFTER UPDATE ON archived_queue_entries
            FOR EACH ROW
            EXECUTE FUNCTION notify_archive_changes();
        """
        
        db.execute(text(sync_log_table))
        db.execute(text(trigger_sql))
        db.commit()
        
        logger.info("✅ Триггеры базы данных для синхронизации настроены (DELETE + UPDATE)")
        
    except Exception as e:
        logger.error(f"❌ Ошибка настройки триггеров БД: {e}")
        db.rollback()

class RealTimeSyncScheduler:
    """Класс для управления синхронизацией в реальном времени"""
    
    def __init__(self):
        self.is_initialized = False
        self._setup_database_events()
    
    def _setup_database_events(self):
        """Настройка событий базы данных для автоматической синхронизации"""
        if self.is_initialized:
            return
        
        # Событие после добавления новой записи
        @event.listens_for(ArchivedQueueEntry, 'after_insert')
        def after_insert_listener(mapper, connection, target):
            """Обработчик добавления новой записи в архив"""
            logger.info(f"🆕 Новая запись в архиве: {target.id}")
            self._handle_insert(target)
        
        # Событие после обновления записи
        @event.listens_for(ArchivedQueueEntry, 'after_update')
        def after_update_listener(mapper, connection, target):
            """Обработчик обновления записи в архиве"""
            logger.info(f"📝 Обновлена запись в архиве: {target.id}")
            self._handle_update(target)
        
        # 🆕 НОВОЕ: Событие после удаления записи
        @event.listens_for(ArchivedQueueEntry, 'after_delete')
        def after_delete_listener(mapper, connection, target):
            """Обработчик удаления записи из архива"""
            logger.info(f"🗑️ Удалена запись из архива: {target.id}")
            self._handle_delete(target)
        
        self.is_initialized = True
        logger.info("✅ Database events для синхронизации настроены (включая удаление)")
    
    def _handle_insert(self, target: ArchivedQueueEntry):
        """Обработать добавление новой записи"""
        try:
            from app.services.google_sheets import google_sheets_service
            
            logger.info(f"🔄 Синхронизируем новую запись {target.id} с Google Sheets")
            result = google_sheets_service.add_single_entry(target)
            
            if result["success"]:
                logger.info(f"✅ Запись {target.id} успешно добавлена в Google Sheets")
            else:
                logger.error(f"❌ Ошибка добавления записи {target.id}: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"💥 Исключение при добавлении записи {target.id}: {e}")
    
    def _handle_update(self, target: ArchivedQueueEntry):
        """Обработать обновление записи"""
        try:
            from app.services.google_sheets import google_sheets_service
            
            logger.info(f"🔄 Синхронизируем обновление записи {target.id} с Google Sheets")
            result = google_sheets_service.update_entry_by_id(target)
            
            if result["success"]:
                logger.info(f"✅ Запись {target.id} успешно обновлена в Google Sheets")
            else:
                logger.error(f"❌ Ошибка обновления записи {target.id}: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"💥 Исключение при обновлении записи {target.id}: {e}")
    
    def _handle_delete(self, target: ArchivedQueueEntry):
        """🆕 НОВОЕ: Обработать удаление записи"""
        try:
            from app.services.google_sheets import google_sheets_service
            
            logger.info(f"🗑️ Синхронизируем удаление записи {target.id} из Google Sheets")
            result = google_sheets_service.delete_entry_by_id(str(target.id))
            
            if result["success"]:
                logger.info(f"✅ Запись {target.id} успешно удалена из Google Sheets")
            else:
                logger.error(f"❌ Ошибка удаления записи {target.id}: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"💥 Исключение при удалении записи {target.id}: {e}")

# Глобальный экземпляр планировщика
realtime_sync = RealTimeSyncScheduler()

def initialize_sync_scheduler():
    """Инициализировать планировщик синхронизации"""
    logger.info("🚀 Инициализация планировщика синхронизации...")
    
    try:
        # Инициализируем события базы данных
        realtime_sync._setup_database_events()
        
        # 🆕 НОВОЕ: Настраиваем триггеры БД для изменений через Adminer
        db = SessionLocal()
        setup_database_triggers(db)
        db.close()
        
        # 🆕 НОВОЕ: Планируем обработку логов каждые 10 секунд (компромисс скорость/логи)
        scheduler.add_job(
            func=process_sync_log_job,
            trigger="interval",
            seconds=10,
            id="process_sync_log",
            replace_existing=True
        )
        
        if not scheduler.running:
            scheduler.start()
        
        logger.info("✅ Планировщик синхронизации инициализирован (SQLAlchemy + DB Triggers)")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации планировщика: {e}")
        return False

def shutdown_sync_scheduler():
    """Остановить планировщик синхронизации"""
    logger.info("🛑 Остановка планировщика синхронизации...")
    try:
        if scheduler.running:
            scheduler.shutdown()
        logger.info("✅ Планировщик синхронизации остановлен")
    except Exception as e:
        logger.error(f"❌ Ошибка остановки планировщика: {e}")

def manual_sync_trigger() -> dict:
    """Ручной запуск полной синхронизации"""
    logger.info("🔧 Ручной запуск полной синхронизации")
    try:
        db = SessionLocal()
        from app.services.google_sheets import google_sheets_service
        result = google_sheets_service.sync_all_data(db)
        return result
    except Exception as e:
        logger.error(f"💥 Ошибка ручной синхронизации: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()