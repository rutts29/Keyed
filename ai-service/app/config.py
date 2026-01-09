from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Gemini API (replaces OpenAI)
    gemini_api_key: str
    
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
    # Using Gemini 2.0 Flash for fast responses, 1.5 Pro for complex reasoning
    gemini_flash_model: str = "gemini-2.0-flash"
    gemini_pro_model: str = "gemini-1.5-pro"
    
    # Voyage embeddings
    voyage_model: str = "voyage-3.5"
    voyage_dimensions: int = 1024
    
    # Qdrant collection
    qdrant_collection: str = "solshare_posts"

    # Moderation settings
    moderation_escalation_threshold: float = 4.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
