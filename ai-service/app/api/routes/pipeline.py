"""
Pipeline API routes — exposes the x-algorithm-inspired scoring and retrieval
to the backend's candidate pipeline.

These endpoints are called by the backend's pipeline scorers and sources,
keeping ML logic isolated in the AI service.
"""

from fastapi import APIRouter, HTTPException
import logging
import time

from pydantic import BaseModel, Field

from app.services.engagement_scorer import (
    UserContext,
    CandidateFeatures,
    score_candidates,
    build_user_context,
    compute_weighted_score,
    ACTIONS,
    DEFAULT_WEIGHTS,
)
from app.services.retrieval import retrieve_out_of_network, score_and_rank
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pipeline", tags=["pipeline"])


# --- Request/Response schemas ---


class CandidateInput(BaseModel):
    post_id: str
    creator_wallet: str
    embedding: list[float] | None = None
    description: str | None = None
    tags: list[str] = []
    scene_type: str | None = None
    mood: str | None = None
    likes: int = 0
    comments: int = 0
    tips_received: float = 0.0
    age_hours: float = 0.0
    is_following_creator: bool = False
    source: str = "out_of_network"


class ScoreRequest(BaseModel):
    """Request to score candidates for a user."""

    user_wallet: str
    liked_post_ids: list[str] = []
    following_wallets: list[str] = []
    candidates: list[CandidateInput] = Field(max_length=500)
    weights: dict[str, float] | None = None


class ScoredCandidate(BaseModel):
    post_id: str
    scores: dict[str, float]
    final_score: float


class ScoreResponse(BaseModel):
    predictions: list[ScoredCandidate]
    processing_time_ms: int


class RetrieveRequest(BaseModel):
    """Request to retrieve out-of-network candidates."""

    user_wallet: str
    liked_post_ids: list[str] = []
    following_wallets: list[str] = []
    exclude_ids: list[str] = []
    limit: int = Field(default=100, ge=1, le=500)
    weights: dict[str, float] | None = None


class RetrievedCandidate(BaseModel):
    post_id: str
    creator_wallet: str
    description: str | None = None
    tags: list[str] = []
    scene_type: str | None = None
    mood: str | None = None
    source: str = "out_of_network"
    scores: dict[str, float] | None = None
    final_score: float = 0.0


class RetrieveResponse(BaseModel):
    candidates: list[RetrievedCandidate]
    taste_profile: str | None = None
    processing_time_ms: int


class PipelineInfoResponse(BaseModel):
    actions: list[str]
    default_weights: dict[str, float]


# --- Endpoints ---


@router.post("/score", response_model=ScoreResponse)
async def score_endpoint(request: ScoreRequest) -> ScoreResponse:
    """Score a batch of candidates for a user.

    Called by the backend's EngagementScorer pipeline component.
    Returns multi-action engagement predictions per candidate.
    """
    start = time.time()
    try:
        user = await build_user_context(
            request.user_wallet,
            request.liked_post_ids,
            request.following_wallets,
        )

        candidates = [
            CandidateFeatures(
                post_id=c.post_id,
                creator_wallet=c.creator_wallet,
                embedding=c.embedding,
                description=c.description,
                tags=c.tags,
                scene_type=c.scene_type,
                mood=c.mood,
                likes=c.likes,
                comments=c.comments,
                tips_received=c.tips_received,
                age_hours=c.age_hours,
                is_following_creator=c.is_following_creator,
                source=c.source,
            )
            for c in request.candidates
        ]

        predictions = await score_candidates(user, candidates, request.weights)

        return ScoreResponse(
            predictions=[
                ScoredCandidate(
                    post_id=p.post_id,
                    scores=p.scores,
                    final_score=p.final_score,
                )
                for p in predictions
            ],
            processing_time_ms=int((time.time() - start) * 1000),
        )
    except Exception as e:
        logger.exception("Scoring failed")
        settings = get_settings()
        detail = str(e) if settings.environment != "production" else "Scoring service error"
        raise HTTPException(status_code=500, detail=detail)


@router.post("/retrieve", response_model=RetrieveResponse)
async def retrieve_endpoint(request: RetrieveRequest) -> RetrieveResponse:
    """Retrieve and score out-of-network candidates.

    Two-tower retrieval: generates user taste embedding, queries Qdrant
    for similar posts, then scores each candidate.

    Called by the backend's OutOfNetworkSource pipeline component.
    """
    start = time.time()
    try:
        result = await retrieve_out_of_network(
            user_wallet=request.user_wallet,
            liked_post_ids=request.liked_post_ids,
            following_wallets=request.following_wallets,
            exclude_ids=request.exclude_ids,
            limit=request.limit,
        )

        # Score retrieved candidates
        predictions = await score_and_rank(
            result.user_context,
            result.candidates,
            request.weights,
            limit=request.limit,
        )

        # Build prediction lookup
        pred_map = {p.post_id: p for p in predictions}

        candidates_out: list[RetrievedCandidate] = []
        for c in result.candidates:
            pred = pred_map.get(c.post_id)
            candidates_out.append(
                RetrievedCandidate(
                    post_id=c.post_id,
                    creator_wallet=c.creator_wallet,
                    description=c.description,
                    tags=c.tags,
                    scene_type=c.scene_type,
                    mood=c.mood,
                    source=c.source,
                    scores=pred.scores if pred else None,
                    final_score=pred.final_score if pred else 0.0,
                )
            )

        # Sort by final score
        candidates_out.sort(key=lambda c: c.final_score, reverse=True)

        return RetrieveResponse(
            candidates=candidates_out[: request.limit],
            taste_profile=result.user_context.taste_profile,
            processing_time_ms=int((time.time() - start) * 1000),
        )
    except Exception as e:
        logger.exception("Retrieval failed")
        settings = get_settings()
        detail = str(e) if settings.environment != "production" else "Retrieval service error"
        raise HTTPException(status_code=500, detail=detail)


@router.get("/info", response_model=PipelineInfoResponse)
async def pipeline_info() -> PipelineInfoResponse:
    """Return pipeline configuration info (actions and default weights)."""
    return PipelineInfoResponse(
        actions=list(ACTIONS),
        default_weights=DEFAULT_WEIGHTS,
    )
