from fastapi import APIRouter, HTTPException
from app.models.schemas import SearchRequest, SearchResponse
from app.services.semantic_search import search

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
        raise HTTPException(status_code=500, detail=str(e))
