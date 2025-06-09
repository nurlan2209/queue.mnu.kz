from app.database import Base

# Import models for SQLAlchemy to discover
from app.models.user import User
from app.models.queue import QueueEntry
from app.models.video import VideoSettings
from app.models.archive import ArchivedQueueEntry  # Добавляем новую модель