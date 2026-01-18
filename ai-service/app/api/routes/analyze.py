from fastapi import APIRouter, HTTPException
import logging
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.content_analyzer import analyze_content
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["analysis"])


@router.post("/content", response_model=AnalyzeResponse, response_model_by_alias=True)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Full content analysis: description, tags, embedding.
    Called async by BullMQ worker after post creation.
    """
    try:
        return await analyze_content(
            content_uri=request.content_uri,
            caption=request.caption,
            post_id=request.post_id,
            creator_wallet=request.creator_wallet,
        )
    except Exception as e:
        # SECURITY: Log full error but only expose generic message in production
        logger.exception("Content analysis failed")
        settings = get_settings()
        detail = str(e) if settings.environment != "production" else "Content analysis service error"
        raise HTTPException(status_code=500, detail=detail)
