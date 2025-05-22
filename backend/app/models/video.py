from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

from app.database import Base

class VideoSettings(Base):
    __tablename__ = "video_settings"

    id = Column(Integer, primary_key=True, index=True)
    youtube_url = Column(String(500), nullable=True)
    is_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())