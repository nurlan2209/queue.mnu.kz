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

class GoogleSheetsService:
    def __init__(self):
        self.credentials = None
        self.service = None
        self.spreadsheet_id = GOOGLE_SHEETS_ID
        self._initialize()
    
    def _initialize(self):
        """Инициализация Google Sheets API"""
        try:
            # Загружаем credentials из файла
            credentials_path = "credentials.json"
            
            if not os.path.exists(credentials_path):
                logger.error(f"Файл credentials.json не найден: {credentials_path}")
                raise FileNotFoundError(f"Google credentials file not found: {credentials_path}")
            
            self.credentials = service_account.Credentials.from_service_account_file(
                credentials_path,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            
            self.service = build('sheets', 'v4', credentials=self.credentials)
            logger.info(f"Google Sheets API инициализирован. Таблица: {self.spreadsheet_id}")
            
        except Exception as e:
            logger.error(f"Ошибка инициализации Google Sheets API: {e}")
            raise
    
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
            entry.status.value if entry.status else "",
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
    
    def sync_all_data(self, db: Session) -> Dict[str, Any]:
        """Полная синхронизация всех данных"""
        try:
            # Получаем все записи из архива
            entries = db.query(ArchivedQueueEntry).order_by(ArchivedQueueEntry.archived_at.desc()).all()
            
            # Подготавливаем данные
            headers = self.prepare_headers()
            rows_data = [headers]  # Начинаем с заголовков
            
            for entry in entries:
                rows_data.append(self.prepare_row_data(entry))
            
            # Очищаем лист и записываем новые данные
            range_name = 'Sheet1'
            
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
            
            logger.info(f"✅ Синхронизировано {len(entries)} записей в Google Sheets")
            
            return {
                "success": True,
                "updated_rows": result.get('updatedRows', 0),
                "updated_cells": result.get('updatedCells', 0),
                "total_entries": len(entries),
                "timestamp": datetime.now().isoformat()
            }
            
        except HttpError as e:
            logger.error(f"❌ HTTP ошибка Google Sheets API: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации: {e}")
            return {"success": False, "error": str(e)}
    
    def add_single_entry(self, entry: ArchivedQueueEntry) -> Dict[str, Any]:
        """Добавить одну запись в конец таблицы"""
        try:
            row_data = self.prepare_row_data(entry)
            
            # Добавляем в конец таблицы
            append_request = self.service.spreadsheets().values().append(
                spreadsheetId=self.spreadsheet_id,
                range='Sheet1',
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
            return {"success": False, "error": str(e)}
    
    def update_entry_by_id(self, entry: ArchivedQueueEntry) -> Dict[str, Any]:
        """Обновить существующую запись по ID"""
        try:
            # Сначала находим строку с этим ID
            search_range = 'Sheet1!A:A'  # Поиск в колонке A (ID)
            search_result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=search_range
            ).execute()
            
            values = search_result.get('values', [])
            row_index = None
            
            # Ищем строку с нужным ID
            for i, row in enumerate(values):
                if row and len(row) > 0 and row[0] == str(entry.id):
                    row_index = i + 1  # +1 потому что нумерация начинается с 1
                    break
            
            if row_index is None:
                # Если запись не найдена, добавляем новую
                return self.add_single_entry(entry)
            
            # Обновляем существующую строку
            row_data = self.prepare_row_data(entry)
            range_name = f'Sheet1!A{row_index}:P{row_index}'  # A-P для всех столбцов
            
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
            return {"success": False, "error": str(e)}

    def set_spreadsheet_id(self, spreadsheet_id: str):
    """Установить ID таблицы для синхронизации"""
    self.spreadsheet_id = spreadsheet_id
    logger.info(f"Google Sheets ID установлен: {spreadsheet_id}")

def set_spreadsheet_id(self, spreadsheet_id: str):
    """Установить ID таблицы для синхронизации"""
    self.spreadsheet_id = spreadsheet_id
    logger.info(f"Google Sheets ID установлен: {spreadsheet_id}")

# Глобальный экземпляр сервиса
google_sheets_service = GoogleSheetsService()