from fastapi import APIRouter, HTTPException
from app.models.schemas import RecommendRequest, RecommendResponse
from app.services.recommender import recommend

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
        raise HTTPException(status_code=500, detail=str(e))
