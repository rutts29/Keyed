from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    openai_api_key: str
    voyage_api_key: str
    qdrant_url: str
    qdrant_api_key: str
    backend_url: str = "http://localhost:3001"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    ipfs_gateway: str = "https://gateway.pinata.cloud/ipfs"

    gpt_instant_model: str = "gpt-5.2-instant"
    gpt_thinking_model: str = "gpt-5.2-thinking"
    voyage_model: str = "voyage-3.5"
    voyage_dimensions: int = 1024
    qdrant_collection: str = "solshare_posts"

    moderation_escalation_threshold: float = 4.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
