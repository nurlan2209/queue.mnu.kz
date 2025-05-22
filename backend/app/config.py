# app/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    RECAPTCHA_SECRET_KEY: str = "6Lf_mUQrAAAAALFCOaj5iTDL2XYcVOu1vUmSnHdk"

    postgres_user: Optional[str]
    postgres_password: Optional[str]
    postgres_db: Optional[str]

    class Config:
        env_file = ".env"

settings = Settings()