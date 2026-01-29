import os
import pytest
from unittest.mock import patch, AsyncMock

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("VOYAGE_API_KEY", "test-key")
os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
os.environ.setdefault("QDRANT_API_KEY", "test-key")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_moderate_check():
    with patch("app.services.moderator.llm.analyze_image", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = {
            "nsfw": 0.5,
            "violence": 0.2,
            "hate": 0.0,
            "child_safety": 0.0,
            "spam": 1.0,
            "drugs_weapons": 0.1,
            "explanation": "Content appears safe",
        }

        response = client.post(
            "/api/moderate/check",
            json={"image_base64": "data:image/jpeg;base64,/9j/test", "caption": "Test"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["verdict"] == "allow"
        assert "scores" in data
        assert "maxScore" in data


def test_check_hash():
    response = client.post("/api/moderate/check-hash", json={"image_hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"})
    assert response.status_code == 200
    assert response.json()["knownBad"] is False


def test_analyze_content():
    with (
        patch("app.services.content_analyzer.download_image", new_callable=AsyncMock) as mock_download,
        patch("app.services.content_analyzer.image_to_base64") as mock_to_base64,
        patch("app.services.content_analyzer.llm.analyze_image", new_callable=AsyncMock) as mock_analyze,
        patch("app.services.content_analyzer.embeddings.generate_embedding", new_callable=AsyncMock) as mock_embed,
        patch("app.services.content_analyzer.vector_db.ensure_collection", new_callable=AsyncMock),
        patch("app.services.content_analyzer.vector_db.upsert_post", new_callable=AsyncMock),
    ):
        mock_download.return_value = b"fake_image_bytes"
        mock_to_base64.return_value = "data:image/jpeg;base64,test"
        mock_analyze.return_value = {
            "description": "A test image",
            "tags": ["test"],
            "scene_type": "indoor",
            "objects": ["object"],
            "mood": "neutral",
            "colors": ["gray"],
            "safety_score": 10,
            "alt_text": "Test alt text",
        }
        mock_embed.return_value = [0.1] * 1024

        response = client.post(
            "/api/analyze/content",
            json={"content_uri": "ipfs://test", "caption": "Test", "post_id": "test123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "A test image"
        assert "sceneType" in data
        assert "safetyScore" in data


def test_semantic_search():
    with (
        patch("app.services.semantic_search.llm.generate_text", new_callable=AsyncMock) as mock_expand,
        patch("app.services.semantic_search.embeddings.generate_query_embedding", new_callable=AsyncMock) as mock_embed,
        patch("app.services.semantic_search.vector_db.ensure_collection", new_callable=AsyncMock),
        patch("app.services.semantic_search.vector_db.search_similar", new_callable=AsyncMock) as mock_search,
    ):
        mock_expand.return_value = "Expanded query description"
        mock_embed.return_value = [0.1] * 1024
        mock_search.return_value = [
            {"post_id": "post1", "score": 0.9, "description": "Test post"}
        ]

        response = client.post(
            "/api/search/semantic",
            json={"query": "test query", "limit": 10, "rerank": False},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["expandedQuery"] == "Expanded query description"


def test_recommend_feed_cold_start():
    with (
        patch("app.services.recommender.vector_db.ensure_collection", new_callable=AsyncMock),
        patch("app.services.recommender.vector_db.search_similar", new_callable=AsyncMock) as mock_search,
    ):
        mock_search.return_value = [
            {"post_id": "post1", "score": 0.8}
        ]

        response = client.post(
            "/api/recommend/feed",
            json={"user_wallet": "test_wallet", "liked_post_ids": [], "limit": 10},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["recommendations"]) == 1
        assert "tasteProfile" in data
