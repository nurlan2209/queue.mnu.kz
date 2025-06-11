from app.database import Base

# Import models for SQLAlchemy to discover
from app.models.user import User
from app.models.queue import QueueEntry
from app.models.video import VideoSettings
from app.models.archive import ArchivedQueueEntry
from app.models.sync_settings import SyncSettings, SyncLog