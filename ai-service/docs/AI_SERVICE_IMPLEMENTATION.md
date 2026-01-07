# SolShare AI/ML Service - Implementation Summary

## Overview

This document describes the AI/ML microservice implementation for SolShare, built using FastAPI with GPT 5.2 for vision/text tasks, Voyage 3.5 for embeddings, and Qdrant for vector storage.

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Python 3.12+ | ML service |
| Framework | FastAPI 0.115+ | API server |
| Vision + Text LLM | OpenAI GPT 5.2 | Image analysis, moderation, query expansion |
| Embeddings | Voyage AI voyage-3.5 | Semantic embeddings (1024 dimensions) |
| Vector Database | Qdrant 1.11+ | Semantic search |

## API Endpoints

### 1. Content Moderation (`/api/moderate`)

**POST `/api/moderate/check`**
- Pre-upload content safety check
- Uses GPT 5.2 Instant for fast initial scan (~500ms)
- Escalates to GPT 5.2 Thinking if any score > 4
- Returns verdict: `allow`, `warn`, or `block`

**POST `/api/moderate/check-hash`**
- Instant check against known bad content database
- Placeholder for Supabase `blocked_content_hashes` integration

### 2. Content Analysis (`/api/analyze`)

**POST `/api/analyze/content`**
- Full content analysis pipeline
- Downloads image from IPFS
- GPT 5.2 Vision generates: description, tags, scene_type, objects, mood, colors, alt_text
- Voyage 3.5 generates 1024-dim embedding
- Indexes in Qdrant with post metadata

### 3. Semantic Search (`/api/search`)

**POST `/api/search/semantic`**
- Query expansion using GPT 5.2 Instant
- Voyage 3.5 query embedding generation
- Qdrant vector similarity search
- Optional re-ranking with GPT 5.2 Thinking

### 4. Recommendations (`/api/recommend`)

**POST `/api/recommend/feed`**
- Personalized feed based on liked content
- Builds taste profile from user's liked posts
- Vector search for similar content
- Diversity filter to avoid same-creator clustering

## Architecture

```
ai-service/
├── app/
│   ├── main.py              # FastAPI entry, CORS, routes
│   ├── config.py            # Pydantic settings from env
│   ├── api/routes/          # HTTP endpoints
│   │   ├── moderate.py      # Moderation endpoints
│   │   ├── analyze.py       # Content analysis endpoint
│   │   ├── search.py        # Semantic search endpoint
│   │   └── recommend.py     # Recommendations endpoint
│   ├── services/            # Business logic
│   │   ├── llm.py           # GPT 5.2 client (Instant + Thinking)
│   │   ├── embeddings.py    # Voyage 3.5 client
│   │   ├── vector_db.py     # Qdrant operations
│   │   ├── moderator.py     # Moderation pipeline
│   │   ├── content_analyzer.py  # Analysis orchestration
│   │   ├── semantic_search.py   # Search pipeline
│   │   └── recommender.py   # Recommendation engine
│   ├── models/schemas.py    # Pydantic models (camelCase output)
│   └── utils/image.py       # Image download, base64, phash
├── scripts/
│   └── setup_qdrant.py      # Collection initialization
├── tests/
│   └── test_api.py          # API integration tests
├── requirements.txt
├── Dockerfile
└── railway.json             # Railway deployment config
```

## Key Implementation Details

### Moderation Pipeline

1. Receive image + caption
2. GPT 5.2 Instant analyzes for: nsfw, violence, hate, child_safety, spam, drugs_weapons
3. If any score > 4.0: escalate to GPT 5.2 Thinking for deeper analysis
4. Apply thresholds (e.g., child_safety > 3 = block, nsfw > 7 = block)
5. Return verdict with explanation

### Content Analysis Pipeline

1. Download image from IPFS via gateway
2. Convert to base64 data URI
3. GPT 5.2 Vision generates structured analysis
4. Voyage 3.5 creates embedding from `description + caption`
5. If post_id provided, index in Qdrant
6. Return analysis + embedding

### Search Pipeline

1. GPT 5.2 expands query to visual description
2. Voyage 3.5 generates query embedding
3. Qdrant retrieves top N candidates
4. If rerank=true, GPT 5.2 Thinking re-scores for relevance
5. Return ranked results

### Recommendation Pipeline

1. Fetch user's liked posts from Qdrant
2. GPT 5.2 builds taste profile description
3. Voyage 3.5 generates taste embedding
4. Qdrant finds similar content
5. Diversity filter: limit posts per creator
6. Return recommendations

## Response Format

All responses use camelCase JSON to match the backend TypeScript expectations:

```json
{
  "verdict": "allow",
  "scores": {
    "nsfw": 0.5,
    "violence": 0.2,
    "childSafety": 0.0,
    "drugsWeapons": 0.1
  },
  "maxScore": 0.5,
  "processingTimeMs": 1200
}
```

## Deployment

### Railway

```bash
railway up
```

Uses `railway.json` for configuration and `Dockerfile` for build.

### Environment Variables

```bash
OPENAI_API_KEY=sk-...
VOYAGE_API_KEY=pa-...
QDRANT_URL=https://xxx.qdrant.io
QDRANT_API_KEY=xxx
BACKEND_URL=http://solshare-backend.railway.internal:3001
```

### Qdrant Setup

```bash
python scripts/setup_qdrant.py
```

Creates `solshare_posts` collection with:
- 1024-dimension vectors (Voyage 3.5)
- Cosine distance
- Payload indexes: creator_wallet, scene_type, timestamp

## Testing

```bash
python3 -m pytest tests/ -v
```

Tests cover all endpoints with mocked external services.

## Integration with Backend

The backend's `ai.service.ts` calls these endpoints:
- `${AI_SERVICE_URL}/api/moderate/check`
- `${AI_SERVICE_URL}/api/moderate/check-hash`
- `${AI_SERVICE_URL}/api/analyze/content`
- `${AI_SERVICE_URL}/api/search/semantic`

Set `AI_SERVICE_URL=http://solshare-ai.railway.internal:8000` in backend.
