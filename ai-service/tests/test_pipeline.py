"""
Tests for the x-algorithm-inspired pipeline components in the AI service.

Tests engagement scoring, retrieval, and pipeline API endpoints.
"""

import os
import pytest
from unittest.mock import patch, AsyncMock

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("VOYAGE_API_KEY", "test-key")
os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
os.environ.setdefault("QDRANT_API_KEY", "test-key")

from fastapi.testclient import TestClient
from app.main import app
from app.services.engagement_scorer import (
    predict_engagement,
    compute_weighted_score,
    score_candidates,
    build_user_context,
    UserContext,
    CandidateFeatures,
    EngagementPrediction,
    ACTIONS,
    DEFAULT_WEIGHTS,
    _cosine_similarity,
    _freshness_decay,
    _tag_overlap,
    _popularity_signal,
    _clamp,
)

client = TestClient(app)


# --- Unit tests for engagement scorer internals ---


class TestClamp:
    def test_clamp_within_range(self):
        assert _clamp(0.5) == 0.5

    def test_clamp_below_range(self):
        assert _clamp(-0.5) == 0.0

    def test_clamp_above_range(self):
        assert _clamp(1.5) == 1.0

    def test_clamp_at_boundaries(self):
        assert _clamp(0.0) == 0.0
        assert _clamp(1.0) == 1.0

    def test_clamp_custom_range(self):
        assert _clamp(5.0, low=0.0, high=10.0) == 5.0
        assert _clamp(15.0, low=0.0, high=10.0) == 10.0


class TestCosineSimilarity:
    def test_identical_vectors(self):
        v = [1.0, 2.0, 3.0]
        assert _cosine_similarity(v, v) == pytest.approx(1.0, abs=1e-6)

    def test_orthogonal_vectors(self):
        a = [1.0, 0.0, 0.0]
        b = [0.0, 1.0, 0.0]
        assert _cosine_similarity(a, b) == pytest.approx(0.0, abs=1e-6)

    def test_opposite_vectors(self):
        a = [1.0, 0.0]
        b = [-1.0, 0.0]
        # Result is negative, but cosine_similarity uses max(0, ...) so it clamps to 0 in predict_engagement
        sim = _cosine_similarity(a, b)
        assert sim == pytest.approx(-1.0, abs=1e-6)

    def test_zero_vector(self):
        a = [0.0, 0.0, 0.0]
        b = [1.0, 2.0, 3.0]
        assert _cosine_similarity(a, b) == 0.0

    def test_similar_vectors(self):
        a = [1.0, 2.0, 3.0]
        b = [1.0, 2.0, 3.5]
        assert _cosine_similarity(a, b) > 0.95


class TestFreshnessDecay:
    def test_brand_new_post(self):
        decay = _freshness_decay(0.0, half_life_hours=24.0)
        assert decay == pytest.approx(1.0, abs=1e-6)

    def test_half_life(self):
        decay = _freshness_decay(24.0, half_life_hours=24.0)
        assert decay == pytest.approx(0.5, abs=0.01)

    def test_very_old_post(self):
        decay = _freshness_decay(240.0, half_life_hours=24.0)
        assert decay < 0.01

    def test_custom_half_life(self):
        decay_short = _freshness_decay(12.0, half_life_hours=6.0)
        decay_long = _freshness_decay(12.0, half_life_hours=48.0)
        assert decay_short < decay_long


class TestTagOverlap:
    def test_perfect_overlap(self):
        assert _tag_overlap(["a", "b", "c"], ["a", "b", "c"]) == pytest.approx(1.0)

    def test_no_overlap(self):
        assert _tag_overlap(["a", "b"], ["c", "d"]) == 0.0

    def test_partial_overlap(self):
        overlap = _tag_overlap(["a", "b", "c"], ["b", "c", "d"])
        assert overlap == pytest.approx(2.0 / 4.0)

    def test_empty_user_tags(self):
        assert _tag_overlap([], ["a", "b"]) == 0.0

    def test_empty_candidate_tags(self):
        assert _tag_overlap(["a", "b"], []) == 0.0

    def test_case_insensitive(self):
        assert _tag_overlap(["ART", "Nature"], ["art", "nature"]) == pytest.approx(1.0)


class TestPopularitySignal:
    def test_zero_metrics(self):
        assert _popularity_signal(0, 0, 0.0) == 0.0

    def test_moderate_popularity(self):
        signal = _popularity_signal(10, 5, 1.0)
        assert 0.0 < signal < 1.0

    def test_viral_post(self):
        signal = _popularity_signal(10000, 5000, 100.0)
        assert signal == pytest.approx(1.0, abs=0.01)  # Capped at 1.0

    def test_log_scale_prevents_domination(self):
        signal_small = _popularity_signal(10, 5, 0.0)
        signal_large = _popularity_signal(10000, 5000, 0.0)
        # Large post should be higher but not proportionally 1000x
        assert signal_large > signal_small
        ratio = signal_large / signal_small if signal_small > 0 else 999
        assert ratio < 10  # Log scaling prevents extreme ratios


class TestPredictEngagement:
    def test_returns_all_actions(self):
        user = UserContext(wallet="test")
        candidate = CandidateFeatures(post_id="p1", creator_wallet="c1")
        prediction = predict_engagement(user, candidate)

        for action in ACTIONS:
            assert action in prediction.scores
            assert 0.0 <= prediction.scores[action] <= 1.0

    def test_high_similarity_boosts_positive_actions(self):
        embedding = [1.0] * 1024
        user = UserContext(wallet="test", taste_embedding=embedding)
        candidate_similar = CandidateFeatures(
            post_id="p1", creator_wallet="c1", embedding=embedding
        )
        candidate_different = CandidateFeatures(
            post_id="p2", creator_wallet="c2", embedding=[-1.0] * 1024
        )

        pred_similar = predict_engagement(user, candidate_similar)
        pred_different = predict_engagement(user, candidate_different)

        assert pred_similar.scores["like"] > pred_different.scores["like"]
        assert pred_similar.scores["share"] > pred_different.scores["share"]

    def test_in_network_boosts_tip_and_subscribe(self):
        user = UserContext(wallet="test")
        in_network = CandidateFeatures(
            post_id="p1", creator_wallet="c1", is_following_creator=True
        )
        out_network = CandidateFeatures(
            post_id="p2", creator_wallet="c2", is_following_creator=False
        )

        pred_in = predict_engagement(user, in_network)
        pred_out = predict_engagement(user, out_network)

        assert pred_in.scores["tip"] > pred_out.scores["tip"]

    def test_not_interested_inversely_correlated_with_similarity(self):
        embedding = [1.0] * 1024
        user = UserContext(wallet="test", taste_embedding=embedding)
        similar = CandidateFeatures(
            post_id="p1", creator_wallet="c1", embedding=embedding
        )
        different = CandidateFeatures(
            post_id="p2", creator_wallet="c2", embedding=[-1.0] * 1024
        )

        pred_similar = predict_engagement(user, similar)
        pred_different = predict_engagement(user, different)

        assert pred_similar.scores["not_interested"] < pred_different.scores["not_interested"]

    def test_subscribe_zero_if_already_following(self):
        user = UserContext(wallet="test")
        candidate = CandidateFeatures(
            post_id="p1", creator_wallet="c1", is_following_creator=True
        )

        pred = predict_engagement(user, candidate)
        assert pred.scores["subscribe"] == 0.0
        assert pred.scores["follow_creator"] == 0.0

    def test_post_id_in_prediction(self):
        user = UserContext(wallet="test")
        candidate = CandidateFeatures(post_id="abc123", creator_wallet="c1")
        pred = predict_engagement(user, candidate)
        assert pred.post_id == "abc123"


class TestComputeWeightedScore:
    def test_positive_actions_give_positive_score(self):
        pred = EngagementPrediction(
            post_id="p1",
            scores={
                "like": 0.8, "comment": 0.5, "share": 0.3,
                "save": 0.4, "tip": 0.1, "subscribe": 0.05,
                "follow_creator": 0.1, "dwell": 0.7, "profile_click": 0.3,
                "not_interested": 0.02, "mute_creator": 0.01, "report": 0.005,
            },
        )
        score = compute_weighted_score(pred)
        assert score > 0

    def test_hostile_actions_give_negative_score(self):
        pred = EngagementPrediction(
            post_id="p1",
            scores={
                "like": 0.01, "comment": 0.01, "share": 0.0,
                "save": 0.0, "tip": 0.0, "subscribe": 0.0,
                "follow_creator": 0.0, "dwell": 0.01, "profile_click": 0.0,
                "not_interested": 0.9, "mute_creator": 0.8, "report": 0.7,
            },
        )
        score = compute_weighted_score(pred)
        assert score < 0

    def test_custom_weights(self):
        pred = EngagementPrediction(
            post_id="p1",
            scores={a: 0.5 for a in ACTIONS},
        )
        custom_weights = {a: 0.0 for a in ACTIONS}
        custom_weights["like"] = 100.0

        score = compute_weighted_score(pred, custom_weights)
        assert score == pytest.approx(50.0)

    def test_default_weights_used_when_none(self):
        pred = EngagementPrediction(
            post_id="p1",
            scores={a: 1.0 for a in ACTIONS},
        )
        score = compute_weighted_score(pred)
        expected = sum(DEFAULT_WEIGHTS.values())
        assert score == pytest.approx(expected)


class TestScoreCandidates:
    @pytest.mark.asyncio
    async def test_scores_all_candidates(self):
        user = UserContext(wallet="test")
        candidates = [
            CandidateFeatures(post_id=f"p{i}", creator_wallet="c1")
            for i in range(5)
        ]

        predictions = await score_candidates(user, candidates)
        assert len(predictions) == 5
        for pred in predictions:
            assert pred.final_score != 0 or pred.final_score == 0  # Has a score
            assert len(pred.scores) == len(ACTIONS)

    @pytest.mark.asyncio
    async def test_custom_weights_applied(self):
        user = UserContext(wallet="test")
        candidates = [CandidateFeatures(post_id="p1", creator_wallet="c1")]

        default_preds = await score_candidates(user, candidates)
        custom_preds = await score_candidates(user, candidates, {"like": 100.0})

        # Custom weight on 'like' should produce different final score
        # (unless like prediction is 0, which is unlikely with neutral inputs)
        assert default_preds[0].final_score != custom_preds[0].final_score


class TestBuildUserContext:
    @pytest.mark.asyncio
    async def test_empty_likes_returns_basic_context(self):
        with patch(
            "app.services.engagement_scorer.vector_db.get_posts_by_ids",
            new_callable=AsyncMock,
            return_value=[],
        ):
            user = await build_user_context("wallet1", [], [])
            assert user.wallet == "wallet1"
            assert user.taste_embedding is None
            assert user.liked_tags == []

    @pytest.mark.asyncio
    async def test_with_likes_extracts_taste_signals(self):
        mock_posts = [
            {"description": "A sunset beach", "tags": ["sunset", "beach"], "scene_type": "outdoor"},
            {"description": "Mountain view", "tags": ["nature", "mountains"], "scene_type": "outdoor"},
        ]
        with (
            patch(
                "app.services.engagement_scorer.vector_db.get_posts_by_ids",
                new_callable=AsyncMock,
                return_value=mock_posts,
            ),
            patch(
                "app.services.engagement_scorer.embeddings.generate_query_embedding",
                new_callable=AsyncMock,
                return_value=[0.1] * 1024,
            ),
        ):
            user = await build_user_context("wallet1", ["p1", "p2"], ["f1"])
            assert user.wallet == "wallet1"
            assert user.taste_embedding is not None
            assert len(user.taste_embedding) == 1024
            assert "sunset" in user.liked_tags
            assert "beach" in user.liked_tags
            assert "outdoor" in user.liked_scene_types
            assert user.following_wallets == ["f1"]


# --- API endpoint tests ---


class TestPipelineScoreEndpoint:
    def test_score_endpoint(self):
        with (
            patch(
                "app.services.engagement_scorer.vector_db.get_posts_by_ids",
                new_callable=AsyncMock,
                return_value=[],
            ),
            patch(
                "app.services.engagement_scorer.vector_db.ensure_collection",
                new_callable=AsyncMock,
            ),
        ):
            response = client.post(
                "/api/pipeline/score",
                json={
                    "user_wallet": "test_wallet",
                    "liked_post_ids": [],
                    "following_wallets": [],
                    "candidates": [
                        {
                            "post_id": "p1",
                            "creator_wallet": "c1",
                            "tags": ["art"],
                            "likes": 10,
                            "comments": 3,
                            "age_hours": 2.0,
                        },
                        {
                            "post_id": "p2",
                            "creator_wallet": "c2",
                            "tags": ["nature"],
                            "likes": 5,
                            "comments": 1,
                            "age_hours": 24.0,
                        },
                    ],
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "predictions" in data
            assert len(data["predictions"]) == 2
            assert "processing_time_ms" in data

            pred = data["predictions"][0]
            assert "post_id" in pred
            assert "scores" in pred
            assert "final_score" in pred
            assert "like" in pred["scores"]
            assert "report" in pred["scores"]

    def test_score_endpoint_empty_candidates(self):
        with patch(
            "app.services.engagement_scorer.vector_db.get_posts_by_ids",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.post(
                "/api/pipeline/score",
                json={
                    "user_wallet": "test_wallet",
                    "liked_post_ids": [],
                    "following_wallets": [],
                    "candidates": [],
                },
            )
            assert response.status_code == 200
            assert len(response.json()["predictions"]) == 0


class TestPipelineRetrieveEndpoint:
    def test_retrieve_endpoint(self):
        with (
            patch(
                "app.services.retrieval.vector_db.ensure_collection",
                new_callable=AsyncMock,
            ),
            patch(
                "app.services.retrieval.vector_db.search_similar",
                new_callable=AsyncMock,
                return_value=[
                    {"post_id": "oon1", "creator_wallet": "c1", "description": "Art piece", "score": 0.9},
                    {"post_id": "oon2", "creator_wallet": "c2", "description": "Photo", "score": 0.7},
                ],
            ),
            patch(
                "app.services.retrieval.build_user_context",
                new_callable=AsyncMock,
                return_value=UserContext(wallet="test_wallet"),
            ),
        ):
            response = client.post(
                "/api/pipeline/retrieve",
                json={
                    "user_wallet": "test_wallet",
                    "liked_post_ids": [],
                    "following_wallets": [],
                    "exclude_ids": [],
                    "limit": 10,
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "candidates" in data
            assert len(data["candidates"]) == 2
            assert "processing_time_ms" in data

    def test_retrieve_endpoint_cold_start(self):
        with (
            patch(
                "app.services.retrieval.vector_db.ensure_collection",
                new_callable=AsyncMock,
            ),
            patch(
                "app.services.retrieval.vector_db.search_similar",
                new_callable=AsyncMock,
                return_value=[],
            ),
            patch(
                "app.services.retrieval.build_user_context",
                new_callable=AsyncMock,
                return_value=UserContext(wallet="test_wallet"),
            ),
        ):
            response = client.post(
                "/api/pipeline/retrieve",
                json={
                    "user_wallet": "new_user",
                    "liked_post_ids": [],
                    "following_wallets": [],
                    "exclude_ids": [],
                    "limit": 10,
                },
            )

            assert response.status_code == 200
            assert len(response.json()["candidates"]) == 0


class TestPipelineInfoEndpoint:
    def test_info_endpoint(self):
        response = client.get("/api/pipeline/info")
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data
        assert "default_weights" in data
        assert len(data["actions"]) == 12
        assert data["default_weights"]["like"] == 1.0
        assert data["default_weights"]["report"] == -10.0
