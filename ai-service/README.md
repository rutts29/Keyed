# SolShare AI Service

FastAPI microservice for AI-powered content moderation, analysis, semantic search, and personalized recommendations.

## Tech Stack

- **Runtime**: Python 3.12+
- **Framework**: FastAPI 0.115+
- **Vision + Text LLM**: OpenAI GPT 5.2 (Instant + Thinking)
- **Embeddings**: Voyage AI voyage-3.5 (1024 dimensions)
- **Vector Database**: Qdrant Cloud

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/moderate/check` | POST | Pre-upload content safety check |
| `/api/moderate/check-hash` | POST | Check perceptual hash against blocklist |
| `/api/analyze/content` | POST | Full content analysis with embedding |
| `/api/search/semantic` | POST | Semantic search with query expansion |
| `/api/recommend/feed` | POST | Personalized feed recommendations |
| `/health` | GET | Health check |

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Initialize Qdrant collection
python scripts/setup_qdrant.py

# Run development server
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT 5.2 |
| `VOYAGE_API_KEY` | Voyage AI API key for embeddings |
| `QDRANT_URL` | Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `BACKEND_URL` | SolShare backend URL |
| `SUPABASE_URL` | Supabase project URL (optional) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key (optional) |

## Testing

```bash
pytest tests/ -v
```

## Deployment

Deploy to Railway:

```bash
railway up
```

The service exposes port 8000 and includes a health check endpoint.

## Architecture

```
app/
├── main.py              # FastAPI entry point
├── config.py            # Pydantic settings
├── api/routes/          # API endpoints
│   ├── moderate.py      # Content moderation
│   ├── analyze.py       # Content analysis
│   ├── search.py        # Semantic search
│   └── recommend.py     # Recommendations
├── services/            # Business logic
│   ├── llm.py           # GPT 5.2 client
│   ├── embeddings.py    # Voyage 3.5 client
│   ├── vector_db.py     # Qdrant operations
│   ├── moderator.py     # Moderation pipeline
│   ├── content_analyzer.py
│   ├── semantic_search.py
│   └── recommender.py
├── models/schemas.py    # Pydantic models
└── utils/image.py       # Image utilities
```

## Moderation Pipeline

1. **GPT 5.2 Instant**: Fast initial safety check (~500ms)
2. If any score > 4: **Escalate to GPT 5.2 Thinking** (~1s)
3. Final verdict: allow, warn, or block

## Content Analysis Pipeline

1. Download image from IPFS
2. GPT 5.2 Vision: Generate structured analysis
3. Voyage 3.5: Generate embedding from description + caption
4. Qdrant: Index embedding with metadata

## Search Pipeline

1. GPT 5.2 Instant: Expand query to visual description
2. Voyage 3.5: Generate query embedding
3. Qdrant: Vector similarity search
4. GPT 5.2 Thinking (optional): Re-rank results
