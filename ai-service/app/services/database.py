"""
Database service for AI service - Supabase integration.
Used primarily for checking blocked content hashes.

Note: The Supabase Python client handles connection pooling internally via httpx.
We use a module-level singleton pattern for efficiency across requests.
"""
from supabase import create_client, Client
from app.config import get_settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Singleton Supabase client - handles connection pooling internally
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """Get or create a Supabase client. Returns None if not configured."""
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    settings = get_settings()
    
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Supabase not configured - hash check will fall back to local cache only")
        return None
    
    try:
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
        logger.info("Supabase client initialized successfully")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


async def check_blocked_hash(image_hash: str) -> dict:
    """
    Check if an image hash exists in the blocked_content_hashes table.
    
    Returns:
        dict with keys:
        - known_bad: bool - True if hash is blocked
        - reason: str | None - Reason for block if blocked
        - blocked_at: str | None - Timestamp when blocked
    """
    client = get_supabase_client()
    
    if client is None:
        # Supabase not configured - return not blocked
        # The backend also checks this table directly, so this is a defense-in-depth measure
        return {"known_bad": False, "reason": None, "blocked_at": None}
    
    try:
        response = client.table("blocked_content_hashes").select(
            "reason, created_at"
        ).eq("image_hash", image_hash).maybe_single().execute()
        
        if response.data:
            return {
                "known_bad": True,
                "reason": response.data.get("reason"),
                "blocked_at": response.data.get("created_at"),
            }
        
        return {"known_bad": False, "reason": None, "blocked_at": None}
        
    except Exception as e:
        logger.error(f"Error checking blocked hash: {e}")
        # On error, return not blocked but log the issue
        # The backend has its own check as a fallback
        return {"known_bad": False, "reason": None, "blocked_at": None}
