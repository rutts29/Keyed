from fastapi import APIRouter, HTTPException
import logging
from app.models.schemas import RecommendRequest, RecommendResponse
from app.services.recommender import recommend
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recommend", tags=["recommendations"])


@router.post("/feed", response_model=RecommendResponse, response_model_by_alias=True)
async def get_recommendations(request: RecommendRequest) -> RecommendResponse:
    """
    Personalized feed recommendations based on user's liked content.
    """
    try:
        return await recommend(
            user_wallet=request.user_wallet,
            liked_post_ids=request.liked_post_ids,
            limit=request.limit,
            exclude_seen=request.exclude_seen,
        )
    except Exception as e:
        # SECURITY: Log full error but only expose generic message in production
        logger.exception("Recommendation generation failed")
        settings = get_settings()
        detail = str(e) if settings.environment != "production" else "Recommendation service error"
        raise HTTPException(status_code=500, detail=detail)
