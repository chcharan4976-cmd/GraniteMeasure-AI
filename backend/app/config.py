from typing import Optional
import os

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(env_file=".env", extra="ignore")

        HEAVY_WORKER_URL: Optional[str] = None
        JOB_TIMEOUT_SECONDS: int = 300
        MAX_UPLOAD_IMAGES_PER_SESSION: int = 20

except ImportError:
    from pydantic import BaseModel

    class Settings(BaseModel):
        HEAVY_WORKER_URL: Optional[str] = os.getenv("HEAVY_WORKER_URL", None)
        JOB_TIMEOUT_SECONDS: int = int(os.getenv("JOB_TIMEOUT_SECONDS", "300"))
        MAX_UPLOAD_IMAGES_PER_SESSION: int = int(os.getenv("MAX_UPLOAD_IMAGES_PER_SESSION", "20"))


settings = Settings()
