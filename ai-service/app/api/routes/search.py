from fastapi import APIRouter, HTTPException
import logging
from app.models.schemas import SearchRequest, SearchResponse
from app.services.semantic_search import search
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])


@router.post("/semantic", response_model=SearchResponse, response_model_by_alias=True)
async def semantic_search(request: SearchRequest) -> SearchResponse:
    """
    Semantic search with query expansion and optional re-ranking.
    """
    try:
        return await search(
            query=request.query,
            limit=request.limit,
            rerank=request.rerank,
        )
    except Exception as e:
        # SECURITY: Log full error but only expose generic message in production
        logger.exception("Semantic search failed")
        settings = get_settings()
        detail = str(e) if settings.environment != "production" else "Search service error"
        raise HTTPException(status_code=500, detail=detail)
