import os
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Virgil API"
    app_version: str = "1.1.0"
    debug: bool = False

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Groq — when GROQ_API_KEY is set it takes priority over xAI and OpenAI
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_base_url: str = "https://api.groq.com/openai/v1"

    # xAI Grok — when XAI_API_KEY is set it is used instead of OpenAI
    xai_api_key: str = ""
    xai_model: str = "grok-4"
    xai_base_url: str = "https://api.x.ai/v1"

    # PostgreSQL — either set DATABASE_URL (takes priority) or individual DB_* vars
    database_url: str = ""  # e.g. postgresql://user:pass@host/dbname
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "postgres"
    db_user: str = "postgres"
    db_password: str = ""

    # Server
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    # Set SEED_DEMO_DATA=false to start with an empty dashboard (no demo alerts/cases/txns)
    seed_demo_data: bool = True

    data_dir: str = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", "data"))

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
