from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    jwt_secret: str = "development-only-change-me"
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'nyayasetu.db').as_posix()}"
    chroma_persist_dir: str = str(BACKEND_DIR / "chroma_data")
    upload_dir: str = str(BACKEND_DIR / "uploads")
    max_upload_mb: int = 20
    frontend_origin: str = "http://localhost:5173"
    # backend/.env overrides the project-root .env; works from any working directory.
    model_config = SettingsConfigDict(env_file=(ROOT_DIR / ".env", BACKEND_DIR / ".env"), extra="ignore")


settings = Settings()
