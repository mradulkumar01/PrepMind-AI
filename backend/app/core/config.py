"""Central configuration. All secrets come from environment / .env, never from code."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # No default on purpose: the app refuses to start without a secret.
    jwt_secret: str
    jwt_expire_minutes: int = 60

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "prepmind"

    chroma_path: str = "./chroma_data"

    cors_origins: str = "http://localhost:5173"
    max_upload_mb: int = 5

    llm_provider: str = "openai_compatible"  # or "mock"
    llm_base_url: str = "http://localhost:11434/v1"
    llm_model: str = "llama3.1:8b"
    llm_api_key: str = "not-needed"

    speech_transcription_url: str = ""
    speech_transcription_model: str = "whisper-1"
    speech_api_key: str = ""

    # Judge0-compatible sandbox. Empty URL disables code execution; never use an in-process runner.
    judge0_url: str = ""
    judge0_api_key: str = ""
    judge0_api_key_header: str = "X-RapidAPI-Key"
    judge0_host: str = ""
    arena_admin_emails: str = ""

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
