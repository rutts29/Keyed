---
name: Agent 3 AI/ML Service
overview: Build the AI/ML FastAPI service for SolShare using GPT 5.2 (vision + text), Voyage 3.5 embeddings, and Qdrant vector database. Implements content moderation guardrails, semantic search, and personalized feed recommendations.
todos:
  - id: update-spec
    content: Update SOLSHARE_SPEC.md with new AI/ML tech stack (GPT 5.2, Voyage 3.5)
    status: pending
  - id: scaffold-project
    content: Scaffold ai-service/ FastAPI project structure
    status: pending
  - id: config-layer
    content: Implement config.py with Pydantic settings for all env vars
    status: pending
  - id: llm-service
    content: Implement services/llm.py - GPT 5.2 client (Instant + Thinking)
    status: pending
  - id: embeddings-service
    content: Implement services/embeddings.py - Voyage 3.5 client
    status: pending
  - id: vector-db-service
    content: Implement services/vector_db.py - Qdrant operations
    status: pending
  - id: moderation-route
    content: Implement api/routes/moderate.py - /check and /check-hash endpoints
    status: pending
  - id: analyze-route
    content: Implement api/routes/analyze.py - /content endpoint
    status: pending
  - id: search-route
    content: Implement api/routes/search.py - /semantic endpoint
    status: pending
  - id: recommend-route
    content: Implement api/routes/recommend.py - /feed endpoint
    status: pending
  - id: qdrant-setup
    content: Create Qdrant Cloud collection with Voyage 3.5 dimensions
    status: pending
  - id: docker-deploy
    content: Create Dockerfile and deploy to Railway
    status: pending
  - id: integration-test
    content: Test integration with backend (moderation, analysis, search)
    status: pending
---

# Agent 3: AI/ML Service Implementation Plan

## Tech Stack (Verified January 2026)

| Component | Technology | Model/Version | Purpose |

|-----------|-----------|---------------|---------|

| **Runtime** | Python | 3.12+ | ML service |

| **Framework** | FastAPI | 0.115+ | API server |

| **Vision + Text LLM** | OpenAI GPT 5.2 | gpt-5.2-thinking / gpt-5.2-instant | Image analysis, moderation, query expansion |

| **Embeddings** | Voyage AI | voyage-3.5 | Semantic embeddings (1024 dim) |

| **Vector Database** | Qdrant | 1.11+ | Semantic search |

### Why These Choices (Verified)

- **GPT 5.2**: Released Dec 2025, has vision capabilities, your preferred choice
- **Voyage 3.5**: 8.26% better accuracy than OpenAI embeddings, 2.2x cheaper, 32K context
- **Qdrant**: Already in spec, validated as good choice for <100M vectors

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph backend [Backend API - Already Built]
        Upload[POST /posts/upload]
        Analyze[BullMQ: ai-analysis job]
        Search[POST /search/semantic]
        Feed[GET /feed]
    end
    
    subgraph ai [AI Service - Agent 3]
        subgraph moderation [Moderation Pipeline]
            HashCheck[Hash Check DB]
            Instant[GPT 5.2 Instant - Fast]
            Thinking[GPT 5.2 Thinking - Escalation]
        end
        
        subgraph analysis [Content Analysis]
            Vision[GPT 5.2 Vision]
            Embed[Voyage 3.5 Embeddings]
        end
        
        subgraph search [Semantic Search]
            QueryExp[Query Expansion - GPT 5.2]
            VectorSearch[Qdrant Search]
            Rerank[Re-ranking - GPT 5.2]
        end
        
        subgraph recommend [Recommendations]
            TasteProfile[Taste Profile Builder]
            SimilarContent[Similar Content Search]
        end
    end
    
    subgraph storage [Data Layer]
        Qdrant[(Qdrant Cloud)]
        Supabase[(Supabase - violations)]
    end
    
    Upload --> HashCheck
    HashCheck --> Instant
    Instant -->|score > 4| Thinking
    Instant -->|score < 4| ALLOW[Allow Upload]
    Thinking --> BLOCK[Block/Allow]
    
    Analyze --> Vision
    Vision --> Embed
    Embed --> Qdrant
    
    Search --> QueryExp
    QueryExp --> VectorSearch
    VectorSearch --> Qdrant
    VectorSearch --> Rerank
    
    Feed --> TasteProfile
    TasteProfile --> SimilarContent
    SimilarContent --> Qdrant
</thinking>
```

---

## File Structure

```
ai-service/
├── app/
│   ├── main.py                     # FastAPI entry point
│   ├── config.py                   # Pydantic settings (env vars)
│   ├── api/
│   │   └── routes/
│   │       ├── analyze.py          # POST /api/analyze/content
│   │       ├── search.py           # POST /api/search/semantic
│   │       ├── recommend.py        # POST /api/recommend/feed
│   │       └── moderate.py         # POST /api/moderate/check, /check-hash
│   ├── services/
│   │   ├── llm.py                  # GPT 5.2 client (OpenAI SDK)
│   │   ├── embeddings.py           # Voyage 3.5 client
│   │   ├── vector_db.py            # Qdrant operations
│   │   ├── content_analyzer.py     # Vision analysis orchestration
│   │   ├── semantic_search.py      # Search pipeline
│   │   ├── recommender.py          # Feed recommendation engine
│   │   └── moderator.py            # Moderation pipeline
│   ├── models/
│   │   └── schemas.py              # Pydantic request/response models
│   └── utils/
│       └── image.py                # Image download, base64 handling
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## API Endpoints (Matching Backend Expectations)

### 1. Content Moderation (Guardrail)

**POST `/api/moderate/check`** - Synchronous, <2s target

```python
# Request
{
    "image_base64": "data:image/jpeg;base64,/9j/4AAQ...",
    "caption": "Check this out!",
    "wallet": "user-wallet-address"
}

# Response
{
    "verdict": "allow" | "warn" | "block",
    "scores": {
        "nsfw": 0.5,
        "violence": 0.2,
        "hate": 0.0,
        "child_safety": 0.0,
        "spam": 1.8,
        "drugs_weapons": 0.1
    },
    "max_score": 1.8,
    "explanation": "Content appears safe.",
    "processing_time_ms": 1200,
    "blocked_category": null,  # Set if blocked
    "violation_id": null       # Set if blocked
}
```

**Moderation Pipeline (GPT 5.2 Hybrid):**

1. **GPT 5.2 Instant** (fast check, ~500ms): Score all categories
2. If any score > 4 (borderline): **Escalate to GPT 5.2 Thinking** (~1s)
3. GPT 5.2 Thinking provides final verdict with reasoning

**POST `/api/moderate/check-hash`** - Instant (<100ms)

- Check perceptual hash against `blocked_content_hashes` table
- Returns immediately if known bad content

### 2. Content Analysis

**POST `/api/analyze/content`** - Async (called by BullMQ worker)

```python
# Request
{
    "content_uri": "ipfs://Qm...",
    "caption": "My morning coffee",
    "post_id": "abc123",
    "creator_wallet": "wallet123"
}

# Response
{
    "description": "A cozy coffee shop interior with warm lighting...",
    "tags": ["coffee", "cafe", "cozy", "morning"],
    "scene_type": "indoor_commercial",
    "objects": ["coffee cup", "laptop", "wooden table"],
    "mood": "calm, focused",
    "colors": ["warm brown", "amber"],
    "safety_score": 10,
    "alt_text": "Interior of a coffee shop...",
    "embedding": [0.123, -0.456, ...]  # 1024-dim Voyage vector
}
```

**Analysis Pipeline:**

1. Download image from IPFS gateway
2. **GPT 5.2 Vision**: Generate structured analysis (description, tags, mood, etc.)
3. **Voyage 3.5**: Generate embedding from `description + caption`
4. **Qdrant**: Index embedding with post metadata
5. Return analysis

### 3. Semantic Search

**POST `/api/search/semantic`**

```python
# Request
{
    "query": "cozy workspaces",
    "limit": 50,
    "rerank": true
}

# Response
{
    "results": [
        {
            "post_id": "abc123",
            "score": 0.92,
            "description": "A minimalist home office...",
            "creator_wallet": "wallet123"
        }
    ],
    "expanded_query": "Images showing comfortable work environments..."
}
```

**Search Pipeline:**

1. **GPT 5.2 Instant**: Expand query to visual description
2. **Voyage 3.5**: Generate query embedding
3. **Qdrant**: Vector similarity search (top 100 candidates)
4. **GPT 5.2 Thinking** (if rerank=true): Score relevance, return top N

### 4. Feed Recommendations

**POST `/api/recommend/feed`**

```python
# Request
{
    "user_wallet": "wallet123",
    "liked_post_ids": ["post1", "post2"],
    "limit": 50,
    "exclude_seen": ["post3", "post4"]
}

# Response
{
    "recommendations": [
        {"post_id": "xyz", "score": 0.88, "reason": "Similar to liked posts"}
    ],
    "taste_profile": "User prefers cozy indoor scenes, coffee culture..."
}
```

**Recommendation Pipeline:**

1. Fetch embeddings of user's liked posts from Qdrant
2. **GPT 5.2**: Build taste profile description from liked content
3. **Voyage 3.5**: Generate taste embedding
4. **Qdrant**: Find similar content, exclude seen/own posts
5. Apply diversity (no same creator repeatedly)

---

## Environment Variables

```bash
# OpenAI (GPT 5.2)
OPENAI_API_KEY=sk-...

# Voyage AI
VOYAGE_API_KEY=pa-...

# Qdrant Cloud
QDRANT_URL=https://xxx.qdrant.io
QDRANT_API_KEY=xxx

# Backend URL (for fetching post data)
BACKEND_URL=http://solshare-backend.railway.internal:3001

# Supabase (for violation logging)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## Qdrant Collection Setup

```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# Create collection with Voyage 3.5 dimensions (1024)
client.create_collection(
    collection_name="solshare_posts",
    vectors_config=VectorParams(
        size=1024,  # Voyage 3.5 default
        distance=Distance.COSINE
    )
)

# Payload indexes for filtering
client.create_payload_index("solshare_posts", "creator_wallet", PayloadSchemaType.KEYWORD)
client.create_payload_index("solshare_posts", "scene_type", PayloadSchemaType.KEYWORD)
client.create_payload_index("solshare_posts", "timestamp", PayloadSchemaType.INTEGER)
```

---

## Key Implementation Details

### GPT 5.2 Prompts

**Moderation Prompt (Instant):**

```
Analyze this image for content safety. Score each category 0-10:
- nsfw: Sexual/adult content
- violence: Gore, weapons in use
- hate: Hate symbols, slurs
- child_safety: Content involving minors inappropriately
- spam: Obvious promotional/scam content
- drugs_weapons: Drug use, weapon sales

Return JSON: {"nsfw": X, "violence": X, ...}
If ANY score > 6, set verdict "block". If any > 3, set "warn". Else "allow".
```

**Content Analysis Prompt (Vision):**

```
Analyze this image for a social media platform. Provide:
{
  "description": "2-3 sentence description",
  "tags": ["5-10 relevant tags"],
  "scene_type": "indoor/outdoor/urban/nature/etc",
  "objects": ["main objects visible"],
  "mood": "emotional tone",
  "colors": ["dominant colors"],
  "alt_text": "accessibility description"
}
```

**Query Expansion Prompt:**

```
Expand this search query into a visual description for image search.
Query: "{query}"
Describe what images would match: subjects, settings, mood, visual elements.
Be specific in 2-3 sentences.
```

---

## Dependencies (requirements.txt)

```txt
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.0
pydantic-settings>=2.0
openai>=1.50.0
voyageai>=0.3.0
qdrant-client>=1.11.0
httpx>=0.27.0
pillow>=10.0.0
imagehash>=4.3.0
supabase>=2.0.0
python-multipart>=0.0.9
```

---

## Deployment (Railway)

**Dockerfile:**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Railway Config:**

- Service name: `solshare-ai`
- Port: 8000
- Internal URL: `http://solshare-ai.railway.internal:8000`

---

## Integration with Backend

The backend's `ai.service.ts` already calls these endpoints:

- `${AI_SERVICE_URL}/api/moderate/check`
- `${AI_SERVICE_URL}/api/moderate/check-hash`
- `${AI_SERVICE_URL}/api/analyze/content`
- `${AI_SERVICE_URL}/api/search/semantic`

Set `AI_SERVICE_URL=http://solshare-ai.railway.internal:8000` in backend env.

---

## Spec Updates Required

Update [SOLSHARE_SPEC.md](SOLSHARE_SPEC.md) Section 1.3 (AI/ML Services):

```markdown
| Component | Technology | Model | Purpose |
|-----------|-----------|-------|---------|
| **Vision + Text LLM** | OpenAI | GPT 5.2 (Instant/Thinking) | Image analysis, moderation, query expansion |
| **Embeddings** | Voyage AI | voyage-3.5 | Semantic embeddings (1024 dim) |
| **Vector Database** | Qdrant | 1.11+ | Semantic search |
```

Update Section 1.7 (External APIs):

```markdown
| Anthropic | ~~Vision LLM (Claude)~~ | ~~ANTHROPIC_API_KEY~~ | (Removed)
| OpenAI | GPT 5.2 + Embeddings | `OPENAI_API_KEY` |
| Voyage AI | Embeddings | `VOYAGE_API_KEY` |
```