"""
Multi-action engagement scoring system inspired by Phoenix (x-algorithm).

Instead of xAI's Grok-based transformer that predicts 19 engagement types,
we use a lightweight approach combining:
  1. Embedding similarity (user taste vs candidate content)
  2. Content feature signals (tags, scene type, mood overlap)
  3. Social signals (creator follow status, tip history)
  4. Freshness decay

The output is still multi-action probabilities, enabling the same
weighted-score formula: Score = Σ(weight_i × P(action_i))

This architecture lets us swap in a heavier model later while keeping
the pipeline and scoring formula unchanged.

@see https://github.com/xai-org/x-algorithm/blob/main/phoenix/recsys_model.py
"""

import math
import logging
import numpy as np
from dataclasses import dataclass, field

from app.services import embeddings, vector_db

logger = logging.getLogger(__name__)

# SolShare engagement actions (adapted from x-algorithm's 19 actions)
ACTIONS = [
    "like",
    "comment",
    "share",
    "save",
    "tip",
    "subscribe",
    "follow_creator",
    "dwell",
    "profile_click",
    "not_interested",
    "mute_creator",
    "report",
]

# Default action weights — mirrors x-algorithm's weighted scorer
# Score = Σ(weight × P(action))
DEFAULT_WEIGHTS: dict[str, float] = {
    "like": 1.0,
    "comment": 1.5,
    "share": 2.0,
    "save": 1.5,
    "tip": 3.0,
    "subscribe": 4.0,
    "follow_creator": 2.5,
    "dwell": 0.5,
    "profile_click": 0.5,
    "not_interested": -3.0,
    "mute_creator": -5.0,
    "report": -10.0,
}


@dataclass
class UserContext:
    """User context for scoring — analogous to x-algorithm's query hydration."""

    wallet: str
    taste_embedding: list[float] | None = None
    taste_profile: str | None = None
    liked_post_ids: list[str] = field(default_factory=list)
    following_wallets: list[str] = field(default_factory=list)
    liked_tags: list[str] = field(default_factory=list)
    liked_scene_types: list[str] = field(default_factory=list)


@dataclass
class CandidateFeatures:
    """Features of a candidate post used for scoring."""

    post_id: str
    creator_wallet: str
    embedding: list[float] | None = None
    description: str | None = None
    tags: list[str] = field(default_factory=list)
    scene_type: str | None = None
    mood: str | None = None
    likes: int = 0
    comments: int = 0
    tips_received: float = 0.0
    age_hours: float = 0.0
    is_following_creator: bool = False
    source: str = "out_of_network"


@dataclass
class EngagementPrediction:
    """Multi-action engagement prediction for a candidate.

    Mirrors Phoenix's RecsysModelOutput — one probability per action type.
    """

    post_id: str
    scores: dict[str, float]  # action -> P(action)
    final_score: float = 0.0


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a_arr = np.array(a, dtype=np.float32)
    b_arr = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a < 1e-12 or norm_b < 1e-12:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


def _freshness_decay(age_hours: float, half_life_hours: float = 24.0) -> float:
    """Exponential decay based on post age. Half-life default = 24 hours."""
    return math.exp(-0.693 * age_hours / half_life_hours)


def _tag_overlap(user_tags: list[str], candidate_tags: list[str]) -> float:
    """Jaccard-like overlap between user preferred tags and candidate tags."""
    if not user_tags or not candidate_tags:
        return 0.0
    user_set = set(t.lower() for t in user_tags)
    cand_set = set(t.lower() for t in candidate_tags)
    intersection = len(user_set & cand_set)
    union = len(user_set | cand_set)
    return intersection / union if union > 0 else 0.0


def _popularity_signal(likes: int, comments: int, tips: float) -> float:
    """Normalized popularity signal from social proof metrics."""
    # Log-scale to prevent viral posts from dominating
    return min(1.0, (math.log1p(likes) * 0.4 + math.log1p(comments) * 0.4 + math.log1p(tips) * 0.2) / 5.0)


def predict_engagement(
    user: UserContext,
    candidate: CandidateFeatures,
) -> EngagementPrediction:
    """Predict multi-action engagement probabilities for a user-candidate pair.

    This is the lightweight equivalent of Phoenix's transformer forward pass.
    Instead of a neural network, we combine hand-crafted signals. The key insight
    from x-algorithm is the OUTPUT FORMAT — multi-action probabilities — which
    enables the same weighted scoring and action-weight tuning.

    Args:
        user: User context with taste embedding and history.
        candidate: Candidate post features.

    Returns:
        EngagementPrediction with per-action probabilities.
    """
    # Signal 1: Embedding similarity (0-1)
    similarity = 0.5  # neutral default
    if user.taste_embedding and candidate.embedding:
        similarity = max(0.0, _cosine_similarity(user.taste_embedding, candidate.embedding))

    # Signal 2: Tag overlap (0-1)
    tag_score = _tag_overlap(user.liked_tags, candidate.tags)

    # Signal 3: Popularity (0-1)
    popularity = _popularity_signal(candidate.likes, candidate.comments, candidate.tips_received)

    # Signal 4: Freshness (0-1)
    freshness = _freshness_decay(candidate.age_hours)

    # Signal 5: In-network boost
    in_network = 1.0 if candidate.is_following_creator else 0.0

    # Combine signals into per-action probabilities
    # Each action has a different formula reflecting its nature
    scores: dict[str, float] = {}

    # Like: heavily influenced by similarity and popularity
    scores["like"] = _clamp(0.3 * similarity + 0.25 * tag_score + 0.2 * popularity + 0.15 * freshness + 0.1 * in_network)

    # Comment: similarity + controversial/engaging content
    scores["comment"] = _clamp(0.35 * similarity + 0.2 * tag_score + 0.15 * popularity + 0.15 * freshness + 0.15 * in_network)

    # Share: high bar — needs strong similarity and quality
    scores["share"] = _clamp(0.4 * similarity + 0.2 * tag_score + 0.25 * popularity + 0.1 * freshness + 0.05 * in_network)

    # Save: similar to like but less influenced by popularity
    scores["save"] = _clamp(0.4 * similarity + 0.3 * tag_score + 0.1 * popularity + 0.1 * freshness + 0.1 * in_network)

    # Tip: highest bar — needs strong creator relationship + quality
    scores["tip"] = _clamp(0.25 * similarity + 0.15 * tag_score + 0.15 * popularity + 0.05 * freshness + 0.4 * in_network)

    # Subscribe: depends on creator, not individual post
    scores["subscribe"] = _clamp(0.2 * similarity + 0.1 * tag_score + 0.2 * popularity + 0.0 * freshness + 0.5 * in_network) * (0.0 if candidate.is_following_creator else 1.0)

    # Follow creator: similar to subscribe
    scores["follow_creator"] = _clamp(0.25 * similarity + 0.15 * tag_score + 0.25 * popularity + 0.1 * freshness + 0.25 * in_network) * (0.0 if candidate.is_following_creator else 1.0)

    # Dwell: how long user will view — similarity + content richness
    scores["dwell"] = _clamp(0.35 * similarity + 0.25 * tag_score + 0.15 * popularity + 0.15 * freshness + 0.1 * in_network)

    # Profile click: curiosity about creator
    scores["profile_click"] = _clamp(0.2 * similarity + 0.1 * tag_score + 0.3 * popularity + 0.1 * freshness + 0.3 * in_network) * (0.3 if candidate.is_following_creator else 1.0)

    # Negative signals (should be low for good candidates)
    # Not interested: inverse of similarity
    scores["not_interested"] = _clamp(0.6 * (1.0 - similarity) + 0.2 * (1.0 - tag_score) + 0.1 * (1.0 - freshness) + 0.1 * (1.0 - in_network))

    # Mute creator: very rare, inversely correlated with engagement
    scores["mute_creator"] = _clamp(0.1 * (1.0 - similarity) * (1.0 - in_network))

    # Report: extremely rare
    scores["report"] = _clamp(0.02 * (1.0 - similarity))

    return EngagementPrediction(post_id=candidate.post_id, scores=scores)


def compute_weighted_score(
    prediction: EngagementPrediction,
    weights: dict[str, float] | None = None,
) -> float:
    """Compute final weighted score: Score = Σ(weight_i × P(action_i)).

    This mirrors x-algorithm's weighted scorer in the home-mixer pipeline.
    The weights can be tuned independently of the prediction model.

    Args:
        prediction: Multi-action engagement prediction.
        weights: Action weights (defaults to DEFAULT_WEIGHTS).

    Returns:
        Final weighted score (can be negative if negative actions dominate).
    """
    w = weights or DEFAULT_WEIGHTS
    total = 0.0
    for action, prob in prediction.scores.items():
        total += w.get(action, 0.0) * prob
    return total


async def score_candidates(
    user: UserContext,
    candidates: list[CandidateFeatures],
    weights: dict[str, float] | None = None,
) -> list[EngagementPrediction]:
    """Score a batch of candidates for a user.

    Mirrors the Phoenix scorer stage in x-algorithm's pipeline.
    Each candidate gets independent multi-action probabilities (candidate isolation).

    Args:
        user: User context with taste profile.
        candidates: List of candidate post features.
        weights: Optional custom action weights.

    Returns:
        List of scored candidates with engagement predictions and final scores.
    """
    predictions: list[EngagementPrediction] = []

    for candidate in candidates:
        prediction = predict_engagement(user, candidate)
        prediction.final_score = compute_weighted_score(prediction, weights)
        predictions.append(prediction)

    return predictions


async def build_user_context(
    wallet: str,
    liked_post_ids: list[str],
    following_wallets: list[str],
) -> UserContext:
    """Build user context for scoring (query hydration equivalent).

    Fetches user's liked posts from vector DB to extract taste signals,
    then generates a taste embedding for similarity-based scoring.

    Args:
        wallet: User's wallet address.
        liked_post_ids: IDs of posts the user has liked.
        following_wallets: Wallets the user follows.

    Returns:
        UserContext populated with taste signals.
    """
    user = UserContext(wallet=wallet, following_wallets=following_wallets)

    if not liked_post_ids:
        return user

    # Fetch liked posts from vector DB for feature extraction
    liked_posts = await vector_db.get_posts_by_ids(liked_post_ids[-30:])

    if not liked_posts:
        return user

    # Extract taste signals from liked posts
    all_tags: list[str] = []
    all_scene_types: list[str] = []
    descriptions: list[str] = []

    for post in liked_posts:
        if post.get("tags"):
            all_tags.extend(post["tags"])
        if post.get("scene_type"):
            all_scene_types.append(post["scene_type"])
        if post.get("description"):
            descriptions.append(post["description"])

    user.liked_tags = all_tags
    user.liked_scene_types = all_scene_types
    user.liked_post_ids = liked_post_ids

    # Generate taste embedding from liked post descriptions
    if descriptions:
        taste_text = " | ".join(descriptions[:10])
        try:
            user.taste_embedding = await embeddings.generate_query_embedding(taste_text)
            user.taste_profile = taste_text[:500]
        except Exception as e:
            logger.warning(f"Failed to generate taste embedding: {e}")

    return user


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    """Clamp value to [low, high]."""
    return max(low, min(high, value))
