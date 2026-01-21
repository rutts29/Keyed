# SolShare Docker Setup

Run the entire SolShare backend with a single command using Docker.

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose v2+

## Quick Start

### 1. Setup Environment

```bash
# Copy the template and fill in your credentials
cp .env.docker .env

# Edit .env with your actual credentials
nano .env  # or use any editor
```

### 2. Run Services

**Development Mode (Backend + AI Service):**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Full Stack (Backend + Worker + AI Service):**
```bash
docker-compose up --build
```

### 3. Verify Services

```bash
# Backend health
curl http://localhost:3001/health

# AI Service health  
curl http://localhost:8000/health
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `backend` | 3001 | Express.js API server |
| `worker` | - | BullMQ background jobs |
| `ai-service` | 8000 | FastAPI AI/ML service |

## Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build

# Remove all containers and volumes
docker-compose down -v
```

## Development

### Rebuild a single service
```bash
docker-compose build backend
docker-compose up -d backend
```

### Shell into a container
```bash
docker exec -it solshare-backend sh
docker exec -it solshare-ai bash
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
- `GEMINI_API_KEY`, `VOYAGE_API_KEY`
- `QDRANT_URL`, `QDRANT_API_KEY`
- `R2_*` credentials for Cloudflare R2
- `PINATA_*` credentials for IPFS
- `JWT_SECRET`

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs backend

# Check if ports are in use
lsof -i :3001
lsof -i :8000
```

### AI Service unhealthy
- Check Gemini API quota
- Verify `GEMINI_API_KEY` is set correctly
- Check logs: `docker-compose logs ai-service`

### Redis connection failed
- Ensure `UPSTASH_REDIS_URL` uses `rediss://` protocol (with double 's')
- Format: `rediss://default:TOKEN@host.upstash.io:6379`

### Build cache issues
```bash
# Clear Docker cache and rebuild
docker-compose build --no-cache
```

## Testing with Postman

1. Import `postman/SolShare_API.postman_collection.json`
2. Import `postman/SolShare_Local.postman_environment.json`
3. Ensure Docker services are running
4. Run the test collection

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Docker Network                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Backend   │  │   Worker    │  │ AI Service  │ │
│  │   :3001     │  │  (no port)  │  │   :8000     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │        │
│         └────────────────┴────────────────┘        │
│                          │                          │
└──────────────────────────┼──────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │    External Services    │
              │  Supabase, Qdrant, R2   │
              │  Redis, Pinata, Helius  │
              └─────────────────────────┘
```
