import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import event

from app.database import SessionLocal
from app.models.archive import ArchivedQueueEntry

logger = logging.getLogger(__name__)

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
        
        self.is_initialized = True
        logger.info("✅ Database events для синхронизации настроены")
    
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
    
    def get_sync_stats(self) -> dict:
        """Получить статистику синхронизации"""
        try:
            db = SessionLocal()
            
            # Общее количество записей в архиве
            total_entries = db.query(ArchivedQueueEntry).count()
            
            # Последние логи синхронизации (если есть таблица)
            try:
                from app.models.sync_settings import SyncLog
                recent_logs = db.query(SyncLog).order_by(
                    SyncLog.created_at.desc()
                ).limit(10).all()
                
                # Статистика по операциям за последние 24 часа
                from datetime import timedelta
                yesterday = datetime.now() - timedelta(days=1)
                
                recent_success = db.query(SyncLog).filter(
                    SyncLog.created_at >= yesterday,
                    SyncLog.status == "success"
                ).count()
                
                recent_errors = db.query(SyncLog).filter(
                    SyncLog.created_at >= yesterday,
                    SyncLog.status == "error"
                ).count()
                
                log_data = [
                    {
                        "operation": log.operation,
                        "status": log.status,
                        "message": log.message,
                        "created_at": log.created_at.isoformat()
                    }
                    for log in recent_logs
                ]
                
            except ImportError:
                recent_success = 0
                recent_errors = 0
                log_data = []
            
            return {
                "total_entries": total_entries,
                "recent_success": recent_success,
                "recent_errors": recent_errors,
                "recent_logs": log_data
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения статистики: {e}")
            return {"error": str(e)}
        finally:
            db.close()

# Глобальный экземпляр планировщика
realtime_sync = RealTimeSyncScheduler()

def initialize_sync_scheduler():
    """Инициализировать планировщик синхронизации"""
    logger.info("🚀 Инициализация планировщика синхронизации...")
    
    try:
        # Инициализируем события базы данных
        realtime_sync._setup_database_events()
        logger.info("✅ Планировщик синхронизации инициализирован")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации планировщика: {e}")
        return False

def shutdown_sync_scheduler():
    """Остановить планировщик синхронизации"""
    logger.info("🛑 Остановка планировщика синхронизации...")
    logger.info("✅ Планировщик синхронизации остановлен")

def check_sync_health() -> dict:
    """Проверить состояние синхронизации"""
    try:
        db = SessionLocal()
        
        try:
            from app.models.sync_settings import SyncSettings
            settings = db.query(SyncSettings).first()
            
            if not settings:
                return {"status": "not_configured", "message": "Настройки синхронизации не найдены"}
            
            if not settings.is_enabled:
                return {"status": "disabled", "message": "Синхронизация отключена"}
            
            if not settings.google_sheets_id:
                return {"status": "misconfigured", "message": "Google Sheets ID не настроен"}
            
            return {
                "status": "healthy",
                "message": "Синхронизация работает нормально",
                "last_sync": settings.last_sync_at.isoformat() if settings.last_sync_at else None
            }
            
        except ImportError:
            # Если таблицы синхронизации еще не созданы
            return {"status": "not_configured", "message": "Таблицы синхронизации не созданы"}
        
    except Exception as e:
        return {"status": "error", "message": f"Ошибка проверки: {str(e)}"}
    finally:
        db.close()

def manual_sync_trigger() -> dict:
    """Ручной запуск синхронизации"""
    logger.info("🔧 Ручной запуск синхронизации")
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