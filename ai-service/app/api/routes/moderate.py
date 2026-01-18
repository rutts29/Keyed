from fastapi import APIRouter, HTTPException
import logging
from app.models.schemas import (
    ModerationRequest,
    ModerationResponse,
    HashCheckRequest,
    HashCheckResponse,
)
from app.services.moderator import moderate_content
from app.services.database import check_blocked_hash
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/moderate", tags=["moderation"])


@router.post("/check", response_model=ModerationResponse, response_model_by_alias=True)
async def check_content(request: ModerationRequest) -> ModerationResponse:
    """
    Pre-upload content safety check.
    Returns verdict: allow, warn, or block.
    """
    try:
        return await moderate_content(request.image_base64, request.caption)
    except Exception as e:
        # SECURITY: Log full error but only expose generic message in production
        logger.exception("Moderation check failed")
        settings = get_settings()
        detail = str(e) if settings.environment != "production" else "Content moderation service error"
        raise HTTPException(status_code=500, detail=detail)


@router.post("/check-hash", response_model=HashCheckResponse, response_model_by_alias=True)
async def check_hash(request: HashCheckRequest) -> HashCheckResponse:
    """
    Check perceptual hash against blocked content database.
    Instant response for known bad content.
    
    This provides a fast check against previously blocked content hashes
    stored in the Supabase blocked_content_hashes table.
    """
    result = await check_blocked_hash(request.image_hash)
    return HashCheckResponse(
        known_bad=result["known_bad"],
        reason=result["reason"],
        blocked_at=result["blocked_at"],
    )
