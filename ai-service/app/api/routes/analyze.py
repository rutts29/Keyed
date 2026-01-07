from fastapi import APIRouter, HTTPException
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.content_analyzer import analyze_content

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
        raise HTTPException(status_code=500, detail=str(e))
