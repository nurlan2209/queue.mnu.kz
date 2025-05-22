from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class VideoSettingsBase(BaseModel):
    youtube_url: Optional[str] = None
    is_enabled: bool = False

class VideoSettingsCreate(VideoSettingsBase):
    pass

class VideoSettingsUpdate(VideoSettingsBase):
    pass

class VideoSettingsResponse(VideoSettingsBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: lambda v: v.isoformat()}
    )