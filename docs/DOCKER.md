# Keyed Docker Setup

Run the entire Keyed backend with a single command using Docker.

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose v2+ (`docker compose` CLI plugin)

## Quick Start

### 1. Setup Environment

```bash
# Copy the template and fill in your credentials
cp .env.docker .env

# Edit .env with your actual credentials
nano .env  # or use any editor
```

### 2. Run Services

**Full Stack (Backend + Worker + AI Service + Redis):**
```bash
docker compose up --build
```

**Partial Stack — Development Mode (Backend + AI Service only):**
```bash
docker compose -f docker-compose.dev.yml up --build
```

### 3. Verify Services

```bash
# Backend health
curl http://localhost:3001/health

# AI Service health
curl http://localhost:8000/health

# Redis ping
docker compose exec redis redis-cli ping
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `backend` | 3001 | Express.js API server |
| `worker` | - | BullMQ background jobs |
| `ai-service` | 8000 | FastAPI AI/ML service |
| `redis` | 6379 | Redis cache + BullMQ queues |

## Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend

# Stop all services
docker compose down

# Rebuild and start
docker compose up --build

# Remove all containers and volumes
docker compose down -v
```

## Development

### Rebuild a single service
```bash
docker compose build backend
docker compose up -d backend
```

### Shell into a container
```bash
docker exec -it keyed-backend sh
docker exec -it keyed-ai bash
```

### View resource usage
```bash
docker stats
```

## Environment Variables

All environment variables are loaded from `.env` file. See `.env.docker` for the template.

Key variables:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_URL` (use `rediss://` protocol)
- `OPENAI_API_KEY`, `VOYAGE_API_KEY`
- `QDRANT_URL`, `QDRANT_API_KEY`
- `R2_*` credentials for Cloudflare R2
- `PINATA_*` credentials for IPFS
- `JWT_SECRET`

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs backend

# Check if ports are in use
lsof -i :3001
lsof -i :8000
lsof -i :6379
```

### AI Service unhealthy
- Check OpenAI API quota
- Verify `OPENAI_API_KEY` is set correctly
- Check logs: `docker compose logs ai-service`

### Redis connection failed
- Ensure `UPSTASH_REDIS_URL` uses `rediss://` protocol (with double 's')
- Format: `rediss://default:TOKEN@host.upstash.io:6379`

### Build cache issues
```bash
# Clear Docker cache and rebuild
docker compose build --no-cache
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Network                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │
│  │   Backend   │  │   Worker    │  │ AI Service  │  │ Redis  │ │
│  │   :3001     │  │  (no port)  │  │   :8000     │  │ :6379  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───┬────┘ │
│         │                │                │              │      │
│         └────────────────┴────────────────┴──────────────┘      │
│                                   │                              │
└───────────────────────────────────┼──────────────────────────────┘
                                    │
                       ┌────────────┴────────────┐
                       │    External Services    │
                       │  Supabase, Qdrant, R2   │
                       │     Pinata, Helius      │
                       └─────────────────────────┘
```
