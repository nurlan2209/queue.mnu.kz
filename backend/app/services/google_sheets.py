import json
import logging
import os
from typing import List, Dict, Any
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session

from app.models.archive import ArchivedQueueEntry
from app.config import settings

logger = logging.getLogger(__name__)

GOOGLE_SHEETS_ID = "1kh8mEKZHSo3vZAK7Z6FoH12Y03WJXhnJx5xA4AoMTP8"
SHEET_NAME = "Queue Data"  # Используем правильный лист

STATUS_TRANSLATIONS = {
    "waiting": "Ожидание",
    "in_progress": "В процессе", 
    "completed": "Завершено",
    "paused": "Приостановлено",
    "cancelled": "Отменено"
}

def translate_status(status_value: str) -> str:
    """Переводит статус на русский язык"""
    if not status_value:
        return ""
    return STATUS_TRANSLATIONS.get(status_value.lower(), status_value)

class GoogleSheetsService:
    def __init__(self):
        self.credentials = None
        self.service = None
        self.spreadsheet_id = GOOGLE_SHEETS_ID
        self._initialize()
    
    def _initialize(self):
        """Инициализация Google Sheets API с улучшенной обработкой ошибок"""
        try:
            credentials_paths = [
                "credentials.json",
                "/app/credentials.json", 
                "/app/focus-strand-462605-u4-591149cd753b.json",
                "/app/focus-strand-462605-u4-591149cd753b.json",  # Добавляем новый файл
                "focus-strand-462605-u4-591149cd753b.json",
                "focus-strand-462605-u4-591149cd753b.json"
            ]
            
            credentials_path = None
            for path in credentials_paths:
                if os.path.exists(path):
                    credentials_path = path
                    break
            
            if not credentials_path:
                logger.warning("❌ Файл credentials.json не найден. Google Sheets синхронизация отключена.")
                return
            
            logger.info(f"📁 Используем credentials файл: {credentials_path}")
            
            # Загружаем и проверяем credentials файл
            cred_data = None  # Инициализируем переменную
            try:
                with open(credentials_path, 'r') as f:
                    cred_data = json.load(f)
                
                required_fields = ['client_email', 'private_key', 'project_id']
                for field in required_fields:
                    if field not in cred_data:
                        logger.error(f"❌ Отсутствует поле '{field}' в credentials файле")
                        return
                
                logger.info(f"✅ Credentials файл валиден. Service account: {cred_data.get('client_email')}")
                logger.info(f"🔑 Project ID: {cred_data.get('project_id')}")
                
                # Проверяем формат private key
                private_key = cred_data.get('private_key', '')
                if not private_key.startswith('-----BEGIN PRIVATE KEY-----'):
                    logger.error("❌ Неверный формат private key")
                    return
                
                logger.info("✅ Формат private key корректен")
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ Поврежденный JSON в credentials файле: {e}")
                return
            except Exception as e:
                logger.error(f"❌ Ошибка чтения credentials файла: {e}")
                return
            
            # Создаем credentials объект
            try:
                self.credentials = service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=['https://www.googleapis.com/auth/spreadsheets']
                )
                logger.info("✅ Credentials объект создан успешно")
            except Exception as e:
                logger.error(f"❌ Ошибка создания credentials объекта: {e}")
                return
            
            # Создаем сервис
            try:
                self.service = build('sheets', 'v4', credentials=self.credentials)
                logger.info(f"✅ Google Sheets API инициализирован. Таблица: {self.spreadsheet_id}")
            except Exception as e:
                logger.error(f"❌ Ошибка создания Google Sheets сервиса: {e}")
                return
            
            # Проверяем доступ к таблице
            try:
                spreadsheet = self.service.spreadsheets().get(
                    spreadsheetId=self.spreadsheet_id
                ).execute()
                
                title = spreadsheet.get('properties', {}).get('title', 'Unknown')
                logger.info(f"✅ Доступ к таблице подтвержден: {title}")
                
                # Проверяем есть ли листы
                sheets = spreadsheet.get('sheets', [])
                if sheets:
                    sheet_names = [sheet.get('properties', {}).get('title', 'Unknown') for sheet in sheets]
                    logger.info(f"📊 Доступные листы: {', '.join(sheet_names)}")
                else:
                    logger.warning("⚠️ В таблице нет листов")
                    
            except HttpError as e:
                error_details = str(e)
                if "not found" in error_details.lower():
                    logger.error(f"❌ Таблица не найдена. ID: {self.spreadsheet_id}")
                    logger.error("💡 Убедитесь, что таблица существует и доступна для сервисного аккаунта")
                elif "permission" in error_details.lower() or "forbidden" in error_details.lower():
                    logger.error(f"❌ Нет доступа к таблице. Сервисный аккаунт: {cred_data.get('client_email')}")
                    logger.error("💡 Предоставьте доступ сервисному аккаунту к таблице")
                else:
                    logger.error(f"❌ HTTP ошибка при доступе к таблице: {e}")
            except Exception as e:
                logger.warning(f"⚠️ Не удалось проверить доступ к таблице: {e}")
            
        except Exception as e:
            logger.error(f"❌ Общая ошибка инициализации Google Sheets API: {e}")
            self.credentials = None
            self.service = None
    
    def _is_available(self) -> bool:
        """Проверяет, доступен ли Google Sheets API"""
        return self.service is not None and self.credentials is not None
    
    def prepare_headers(self) -> List[str]:
        """Подготовить заголовки для Google Sheets"""
        return [
            "ID",
            "Original ID", 
            "Queue Number",
            "Full Name",
            "Phone",
            "Programs",
            "Status",
            "Notes",
            "Assigned Employee",
            "Created At",
            "Updated At", 
            "Completed At",
            "Processing Time",
            "Form Language",
            "Archived At",
            "Archive Reason"
        ]
    
    def prepare_row_data(self, entry: ArchivedQueueEntry) -> List[str]:
        """Подготовить данные записи для Google Sheets"""
        return [
            str(entry.id),
            str(entry.original_id),
            str(entry.queue_number),
            entry.full_name or "",
            entry.phone or "",
            json.dumps(entry.programs) if entry.programs else "[]",
            translate_status(entry.status.value) if entry.status else "",
            entry.notes or "",
            entry.assigned_employee_name or "",
            entry.created_at.isoformat() if entry.created_at else "",
            entry.updated_at.isoformat() if entry.updated_at else "",
            entry.completed_at.isoformat() if entry.completed_at else "",
            str(entry.processing_time) if entry.processing_time else "",
            entry.form_language or "",
            entry.archived_at.isoformat() if entry.archived_at else "",
            entry.archive_reason or ""
        ]
    
    def _find_row_by_id(self, entry_id: str) -> int:
        """🆕 Найти строку по ID записи"""
        try:
            search_range = f'{SHEET_NAME}!A:A'  # Поиск в колонке A (ID)
            search_result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=search_range
            ).execute()
            
            values = search_result.get('values', [])
            
            # Ищем строку с нужным ID
            for i, row in enumerate(values):
                if row and len(row) > 0 and row[0] == str(entry_id):
                    return i + 1  # +1 потому что нумерация начинается с 1
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Ошибка поиска строки по ID {entry_id}: {e}")
            return None
    
    def sync_all_data(self, db: Session) -> Dict[str, Any]:
        """Полная синхронизация всех данных из архива"""
        if not self._is_available():
            return {"success": False, "error": "Google Sheets API недоступен"}
            
        try:
            # Получаем все записи из архива
            entries = db.query(ArchivedQueueEntry).order_by(ArchivedQueueEntry.archived_at.desc()).all()
            
            # Подготавливаем данные
            headers = self.prepare_headers()
            rows_data = [headers]  # Начинаем с заголовков
            
            for entry in entries:
                rows_data.append(self.prepare_row_data(entry))
            
            # Очищаем лист и записываем новые данные
            range_name = SHEET_NAME
            
            # Очистка листа
            clear_request = self.service.spreadsheets().values().clear(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            )
            clear_request.execute()
            
            # Запись новых данных
            update_request = self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                body={'values': rows_data}
            )
            
            result = update_request.execute()
            
            logger.info(f"✅ Полная синхронизация: {len(entries)} записей в Google Sheets")
            
            return {
                "success": True,
                "updated_rows": result.get('updatedRows', 0),
                "updated_cells": result.get('updatedCells', 0),
                "total_entries": len(entries),
                "timestamp": datetime.now().isoformat()
            }
            
        except HttpError as e:
            logger.error(f"❌ HTTP ошибка Google Sheets API: {e}")
            if "Invalid JWT Signature" in str(e):
                logger.error("💡 Попробуйте пересоздать credentials.json или проверить настройки сервисного аккаунта")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации: {e}")
            return {"success": False, "error": str(e)}
    
    def add_single_entry(self, entry: ArchivedQueueEntry) -> Dict[str, Any]:
        """Добавить одну запись в конец таблицы"""
        if not self._is_available():
            logger.warning("⚠️ Google Sheets API недоступен, пропускаем синхронизацию записи")
            return {"success": False, "error": "Google Sheets API недоступен"}
            
        try:
            row_data = self.prepare_row_data(entry)
            
            # Добавляем в конец таблицы
            append_request = self.service.spreadsheets().values().append(
                spreadsheetId=self.spreadsheet_id,
                range=SHEET_NAME,
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body={'values': [row_data]}
            )
            
            result = append_request.execute()
            
            logger.info(f"✅ Добавлена запись {entry.id} в Google Sheets")
            
            return {
                "success": True,
                "updated_rows": result.get('updates', {}).get('updatedRows', 0),
                "entry_id": entry.id,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка добавления записи: {e}")
            if "Invalid JWT Signature" in str(e):
                logger.error("💡 Проблема с аутентификацией. Проверьте credentials.json")
            return {"success": False, "error": str(e)}
    
    def update_entry_by_id(self, entry: ArchivedQueueEntry) -> Dict[str, Any]:
        """Обновить существующую запись по ID"""
        if not self._is_available():
            logger.warning("⚠️ Google Sheets API недоступен, пропускаем обновление записи")
            return {"success": False, "error": "Google Sheets API недоступен"}
            
        try:
            row_index = self._find_row_by_id(entry.id)
            
            if row_index is None:
                # Если запись не найдена, добавляем новую
                logger.info(f"📝 Запись {entry.id} не найдена в Google Sheets, добавляем новую")
                return self.add_single_entry(entry)
            
            # Обновляем существующую строку
            row_data = self.prepare_row_data(entry)
            range_name = f'{SHEET_NAME}!A{row_index}:P{row_index}'  # A-P для всех столбцов
            
            update_request = self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                body={'values': [row_data]}
            )
            
            result = update_request.execute()
            
            logger.info(f"✅ Обновлена запись {entry.id} в Google Sheets (строка {row_index})")
            
            return {
                "success": True,
                "updated_rows": result.get('updatedRows', 0),
                "entry_id": entry.id,
                "row_index": row_index,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка обновления записи: {e}")
            if "Invalid JWT Signature" in str(e):
                logger.error("💡 Проблема с аутентификацией. Проверьте credentials.json")
            return {"success": False, "error": str(e)}
    
    def delete_entry_by_id(self, entry_id: str) -> Dict[str, Any]:
        """🆕 НОВОЕ: Удалить запись из Google Sheets по ID"""
        if not self._is_available():
            logger.warning("⚠️ Google Sheets API недоступен, пропускаем удаление записи")
            return {"success": False, "error": "Google Sheets API недоступен"}
            
        try:
            row_index = self._find_row_by_id(entry_id)
            
            if row_index is None:
                logger.warning(f"⚠️ Запись {entry_id} не найдена в Google Sheets для удаления")
                return {"success": True, "message": "Запись уже отсутствует в Google Sheets"}
            
            # Удаляем строку
            delete_request = self.service.spreadsheets().batchUpdate(
                spreadsheetId=self.spreadsheet_id,
                body={
                    "requests": [
                        {
                            "deleteDimension": {
                                "range": {
                                    "sheetId": 0,  # ID первого листа
                                    "dimension": "ROWS",
                                    "startIndex": row_index - 1,  # 0-based index
                                    "endIndex": row_index  # exclusive
                                }
                            }
                        }
                    ]
                }
            )
            
            result = delete_request.execute()
            
            logger.info(f"🗑️ Удалена запись {entry_id} из Google Sheets (строка {row_index})")
            
            return {
                "success": True,
                "entry_id": entry_id,
                "deleted_row": row_index,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка удаления записи {entry_id}: {e}")
            if "Invalid JWT Signature" in str(e):
                logger.error("💡 Проблема с аутентификацией. Проверьте credentials.json")
            return {"success": False, "error": str(e)}

    def set_spreadsheet_id(self, spreadsheet_id: str):
        """Установить ID таблицы для синхронизации"""
        self.spreadsheet_id = spreadsheet_id
        logger.info(f"Google Sheets ID установлен: {spreadsheet_id}")

# Глобальный экземпляр сервиса
google_sheets_service = GoogleSheetsService()