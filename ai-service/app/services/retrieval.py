"""
Two-tower retrieval adapter — inspired by Phoenix Retrieval (x-algorithm).

In x-algorithm, the retrieval model uses:
  - User Tower: transformer encoding user + history into an embedding
  - Candidate Tower: MLP projecting post+author embeddings into shared space
  - Dot-product similarity for top-K retrieval

Our adaptation uses the existing Voyage AI embeddings + Qdrant vector DB
as the retrieval backbone. The "user tower" is a taste embedding generated
from liked post descriptions, and the "candidate tower" is the existing
content embedding. This gives us the same two-tower retrieval pattern
without needing a custom JAX model.

@see https://github.com/xai-org/x-algorithm/blob/main/phoenix/recsys_retrieval_model.py
"""

import logging
from dataclasses import dataclass, field

from app.services import embeddings, vector_db, llm
from app.services.engagement_scorer import (
    UserContext,
    CandidateFeatures,
    score_candidates,
    build_user_context,
    EngagementPrediction,
    DEFAULT_WEIGHTS,
)

logger = logging.getLogger(__name__)

TASTE_PROFILE_PROMPT = """Based on these content descriptions the user has liked, write a 2-3 sentence profile describing their visual and thematic tastes. Focus on specific aesthetics, subjects, moods, and styles they prefer:

{descriptions}"""


@dataclass
class RetrievalResult:
    """Result from the two-tower retrieval stage."""

    candidates: list[CandidateFeatures]
    user_context: UserContext


async def retrieve_out_of_network(
    user_wallet: str,
    liked_post_ids: list[str],
    following_wallets: list[str],
    exclude_ids: list[str] | None = None,
    limit: int = 100,
) -> RetrievalResult:
    """Retrieve out-of-network candidates using two-tower approach.

    User Tower: Generate taste embedding from liked posts.
    Candidate Tower: Query Qdrant with taste embedding for similar posts.

    This mirrors Phoenix's retrieval flow:
      1. Encode user (taste embedding)
      2. Dot-product similarity against corpus (Qdrant search)
      3. Return top-K candidates with features

    Args:
        user_wallet: User's wallet address.
        liked_post_ids: IDs of posts the user has liked.
        following_wallets: Wallets the user follows.
        exclude_ids: Post IDs to exclude from results.
        limit: Maximum candidates to retrieve.

    Returns:
        RetrievalResult with candidate features and user context.
    """
    await vector_db.ensure_collection()

    # Build user context (user tower)
    user = await build_user_context(user_wallet, liked_post_ids, following_wallets)

    # Retrieve candidates from Qdrant (candidate tower + similarity search)
    if user.taste_embedding:
        raw_candidates = await vector_db.search_similar(
            embedding=user.taste_embedding,
            limit=limit,
            exclude_ids=exclude_ids or [],
        )
    else:
        # Cold start: use zero vector (returns popular/recent posts)
        raw_candidates = await vector_db.search_similar(
            embedding=[0.0] * 1024,
            limit=limit,
            exclude_ids=exclude_ids or [],
        )

    following_set = set(following_wallets)

    # Convert to CandidateFeatures
    candidates: list[CandidateFeatures] = []
    for raw in raw_candidates:
        candidates.append(
            CandidateFeatures(
                post_id=raw["post_id"],
                creator_wallet=raw.get("creator_wallet", ""),
                embedding=raw.get("embedding"),
                description=raw.get("description"),
                tags=raw.get("tags", []),
                scene_type=raw.get("scene_type"),
                mood=raw.get("mood"),
                likes=raw.get("likes", 0),
                comments=raw.get("comments", 0),
                tips_received=raw.get("tips_received", 0.0),
                age_hours=raw.get("age_hours", 0.0),
                is_following_creator=raw.get("creator_wallet", "") in following_set,
                source="out_of_network",
            )
        )

    return RetrievalResult(candidates=candidates, user_context=user)


async def score_and_rank(
    user: UserContext,
    candidates: list[CandidateFeatures],
    weights: dict[str, float] | None = None,
    limit: int = 50,
) -> list[EngagementPrediction]:
    """Score candidates and return ranked predictions.

    Mirrors the Phoenix scoring + selection pipeline stages.

    Args:
        user: User context.
        candidates: Candidate features.
        weights: Optional custom action weights.
        limit: Max results to return.

    Returns:
        Ranked list of engagement predictions.
    """
    predictions = await score_candidates(user, candidates, weights)

    # Sort by final_score descending (mirrors x-algorithm's selector)
    predictions.sort(key=lambda p: p.final_score, reverse=True)

    return predictions[:limit]
