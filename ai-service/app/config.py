from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Gemini API (for text tasks)
    gemini_api_key: str

    # OpenAI API (for moderation - FREE)
    openai_api_key: str

    # Voyage AI for embeddings
    voyage_api_key: str

    # Qdrant vector database
    qdrant_url: str
    qdrant_api_key: str

    # Backend service
    backend_url: str = "http://localhost:3001"

    # Internal API key for service-to-service auth (optional in dev, required in production)
    internal_api_key: str | None = None

    # Environment
    environment: str = "development"

    # Supabase (for violation logging)
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    # IPFS gateway
    ipfs_gateway: str = "https://gateway.pinata.cloud/ipfs"

    # Model configuration
    # Gemini 3 Flash Preview for recommendations/algorithm only
    gemini_model: str = "gemini-3-flash-preview"
    # OpenAI moderation model (FREE)
    openai_moderation_model: str = "omni-moderation-latest"

    # Voyage AI - embeddings AND re-ranking
    voyage_text_model: str = "voyage-4"
    voyage_multimodal_model: str = "voyage-multimodal-3.5"
    voyage_rerank_model: str = "rerank-2.5"
    voyage_dimensions: int = 1024

    # Qdrant collection (UNCHANGED)
    qdrant_collection: str = "solshare_posts"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
