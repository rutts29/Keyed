# Keyed Technical Documentation

Technical reference for the Keyed platform — covers architecture, API surface, deployment, and configuration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Deployment Guide](#deployment-guide)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment Runbook](#deployment-runbook)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 22+
- Python 3.12+
- Rust + Anchor CLI
- Solana CLI
- Docker (optional)

---

## Local Development

### 1. Clone and Install

```bash
git clone https://github.com/rutts29/solShare.git
cd solShare

# Backend
cd backend && npm install

# AI Service
cd ../ai-service && pip install -r requirements.txt

# Solana programs
cd ../solshare && yarn install
```

### Docker Quick Start

```bash
docker compose up
```

### 2. Configure Environment

Copy example files and fill in your credentials:

```bash
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
```

### 3. Run Locally

```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Background worker
cd backend && npm run dev:worker

# Terminal 3: AI Service
cd ai-service && uvicorn app.main:app --reload --port 8000
```

---

## Deployment Guide

### Phase 1: External Services Setup

Create accounts and obtain API keys for:

| Service | Purpose | Variables |
|---------|---------|-----------|
| [Supabase](https://supabase.com) | Database + Realtime | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| [Upstash](https://upstash.com) | Redis cache | `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` |
| [Qdrant Cloud](https://cloud.qdrant.io) | Vector search | `QDRANT_URL`, `QDRANT_API_KEY` |
| [Cloudflare R2](https://cloudflare.com) | Object storage | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| [Pinata](https://pinata.cloud) | IPFS pinning | `PINATA_API_KEY`, `PINATA_SECRET_KEY` |
| [Helius](https://helius.dev) | Solana RPC | `HELIUS_API_KEY` |
| [OpenAI](https://openai.com) | LLM (GPT-5.2) | `OPENAI_API_KEY` |
| [Voyage AI](https://voyageai.com) | Embeddings | `VOYAGE_API_KEY` |

### Phase 2: Database Setup

Run migrations in Supabase SQL Editor (in order):

```sql
-- 1. backend/migrations/001_extensions.sql
-- 2. backend/migrations/002_core_tables.sql
-- 3. backend/migrations/003_moderation_tables.sql
-- 4. backend/migrations/004_functions.sql
-- 5. backend/migrations/005_realtime.sql
-- 6. backend/migrations/006_privacy_tables.sql
-- 7. backend/migrations/007_chat_tables.sql
-- 8. backend/migrations/008_airdrop_tables.sql
-- 9. backend/migrations/20260201_add_escrow_secret.sql
```

Enable Realtime for tables: `posts`, `likes`, `comments`, `follows`

### Phase 3: Vector Database Setup

```bash
cd ai-service
QDRANT_URL=xxx QDRANT_API_KEY=xxx python scripts/setup_qdrant.py
```

### Phase 4: Solana Program Deployment

```bash
# Configure wallet
solana config set --url devnet
solana airdrop 5

# Build and deploy
cd solshare
anchor build
anchor deploy --provider.cluster devnet

# Update program IDs in backend/.env after deployment
```

**Current Program IDs (devnet):**
- Social: `G2USoTtbNw78NYvPJSeuYVZQS9oVQNLrLE5zJb7wsM3L`
- Payment: `H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t`
- Token Gate: `EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi`
- Airdrop: `AirD1111111111111111111111111111111111111111`

### Phase 5: Backend Deployment (Railway)

Railway runs one process per service, so you need **two separate services** for the backend:

**Service 1: API Server**
```bash
cd backend
railway login
railway init --name keyed-api
railway up
```
Uses `railway.json` -> runs `npm run start:api`

**Service 2: Background Worker**
```bash
# In Railway dashboard, create a new service in the same project
# Set the start command to: npm run start:worker
# Or use railway.worker.json as reference
```
Uses `railway.worker.json` -> runs `npm run start:worker`

Configure the same environment variables for both services in Railway dashboard.

> **Note:** Both services share the same codebase but run different processes. The worker handles BullMQ background jobs (AI analysis, notifications, feed refresh).

### Phase 6: AI Service Deployment (Railway)

```bash
cd ai-service
railway init
railway up
```

Set internal URL: `http://keyed-ai.railway.internal:8000`

---

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/challenge` | POST | Get signing challenge |
| `/api/auth/verify` | POST | Verify signature, get JWT |
| `/api/auth/refresh` | POST | Refresh JWT token |

### Posts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/posts/upload` | POST | Upload media file |
| `/api/posts/create` | POST | Create new post |
| `/api/posts/:id` | GET | Get post details |
| `/api/posts/:id/like` | POST/DELETE | Like/unlike post |
| `/api/posts/:id/comments` | GET/POST | Get/add comments |

### Feed

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/feed/for-you` | GET | Personalized feed |
| `/api/feed/following` | GET | Feed from followed users |
| `/api/feed/explore` | GET | Explore/discovery feed |

### Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search/semantic` | POST | AI semantic search |
| `/api/search/users` | GET | Search users |
| `/api/search/tag` | GET | Search by tag |
| `/api/search/suggest` | GET | Autocomplete |

### Payments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/vault/initialize` | POST | Initialize creator vault |
| `/api/payments/tip` | POST | Send tip |
| `/api/payments/subscribe` | POST | Subscribe to creator |
| `/api/payments/earnings` | GET | Get earnings |
| `/api/payments/withdraw` | POST | Withdraw funds |

### Access Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/access/verify` | GET | Check access to post |
| `/api/access/requirements` | POST | Set access requirements |
| `/api/access/verify-token` | POST | Verify token access |
| `/api/access/verify-nft` | POST | Verify NFT access |

### Chat

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/rooms` | POST | Create a chat room |
| `/api/chat/rooms` | GET | List chat rooms |
| `/api/chat/rooms/:id` | GET | Get chat room details |
| `/api/chat/rooms/:id/join` | POST | Join a chat room |
| `/api/chat/rooms/:id/leave` | POST | Leave a chat room |
| `/api/chat/rooms/:id/messages` | GET | Get messages in a room |
| `/api/chat/rooms/:id/messages` | POST | Send a message to a room |

### Airdrops

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/airdrops` | POST | Create an airdrop campaign |
| `/api/airdrops/my` | GET | List my airdrop campaigns |
| `/api/airdrops/:id` | GET | Get airdrop details |
| `/api/airdrops/:id/prepare` | POST | Prepare airdrop for distribution |
| `/api/airdrops/:id/fund` | POST | Fund the airdrop escrow |
| `/api/airdrops/:id/start` | POST | Start distributing airdrop |
| `/api/airdrops/:id/cancel` | POST | Cancel an airdrop campaign |

### Privacy

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/privacy/tip/log` | POST | Log a private tip |
| `/api/privacy/tips/received` | GET | Get received private tips |
| `/api/privacy/tips/sent` | GET | Get sent private tips |
| `/api/privacy/settings` | GET | Get privacy settings |
| `/api/privacy/settings` | PUT | Update privacy settings |
| `/api/privacy/pool/info` | GET | Get privacy pool info |

### Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications` | GET | List notifications |
| `/api/notifications/:id/read` | PUT | Mark notification as read |
| `/api/notifications/unread-count` | GET | Get unread notification count |

### Users

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/:wallet/followers` | GET | Get user's followers |
| `/api/users/:wallet/following` | GET | Get user's following list |
| `/api/users/suggested` | GET | Get suggested users to follow |

---

## Environment Variables

### Backend (.env)

```bash
# Server
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOCIAL_PROGRAM_ID=
PAYMENT_PROGRAM_ID=
TOKEN_GATE_PROGRAM_ID=
AIRDROP_PROGRAM_ID=

# IPFS
PINATA_API_KEY=
PINATA_SECRET_KEY=
PINATA_GATEWAY_URL=

# Auth
JWT_SECRET=

# AI Service
AI_SERVICE_URL=
AI_SERVICE_API_KEY=
```

### AI Service (.env)

```bash
# LLM
OPENAI_API_KEY=

# Embeddings
VOYAGE_API_KEY=

# Vector DB
QDRANT_URL=
QDRANT_API_KEY=

# Backend
BACKEND_URL=

# Database
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Testing

### Unit Tests

```bash
# Backend
cd backend && npm test

# AI Service
cd ai-service && pytest

# Solana programs
cd solshare && anchor test
```

### E2E Integration Tests

```bash
# Run all E2E tests (requires running backend at localhost:3001)
cd backend && npx vitest run --config vitest.e2e.config.ts

# Run specific suite
npx vitest run --config vitest.e2e.config.ts tests/e2e/chat.e2e.test.ts
npx vitest run --config vitest.e2e.config.ts tests/e2e/airdrop.e2e.test.ts
```

7 E2E suites with 200+ tests covering: chat rooms, airdrops, social flows, authorization boundaries, input fuzzing, concurrency, and account isolation.

---

## Deployment Runbook

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Qdrant collection initialized
- [ ] Solana programs deployed and IDs updated
- [ ] Health checks passing locally

### Deployment Order

1. **Database**: Run migrations in order (001-008 + 20260201)
2. **AI Service**: Deploy first (backend depends on it)
3. **Backend API**: Deploy with health check verification
4. **Backend Worker**: Deploy after API is healthy
5. **Frontend**: Deploy last (depends on backend URL)

### Health Check Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Backend | `GET /health` | `{"status":"healthy","services":{...}}` |
| AI Service | `GET /health` | `{"status":"healthy"}` |

### Rollback Procedure

```bash
# Railway rollback
railway rollback --service keyed-api

# Or redeploy specific commit
railway up --detach --ref <commit-sha>
```

---

## Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` to AI service | AI service not ready | Wait for health check, check internal URL |
| `Invalid JWT` | Secret mismatch | Verify `JWT_SECRET` matches across services |
| Redis connection failed | Wrong URL format | Use `rediss://` (with double s) for TLS |
| IDL file not found | Missing IDL export | Run `anchor build` and copy IDL files |
| Qdrant 404 | Collection not created | Run `setup_qdrant.py` script |

### Monitoring Checklist

- [ ] Check `/health` endpoint returns 200
- [ ] Verify Redis connection in logs
- [ ] Confirm AI service is reachable
- [ ] Test auth flow end-to-end
- [ ] Verify Solana RPC connectivity

---

## API Versioning Strategy

The API currently uses **implicit versioning** (v1 by default). Future versions will use URL path versioning.

### Current Approach
```
/api/auth/challenge    # Implicitly v1
/api/posts/create      # Implicitly v1
```

### Future Versioning (when breaking changes are needed)
```
/api/v1/posts/create   # Legacy support
/api/v2/posts/create   # New version with breaking changes
```

### Deprecation Policy
1. **Announcement**: Breaking changes announced 30 days in advance via API response headers
2. **Dual Support**: Old and new versions run in parallel for 90 days
3. **Sunset**: Old version returns `410 Gone` after sunset date

### Version Detection Headers
```
X-API-Version: 1.0.0           # Current API version
X-API-Deprecated: true         # If endpoint is deprecated
X-API-Sunset-Date: 2026-06-01  # When deprecated endpoint will be removed
```

---

## Security Considerations

- All API endpoints are rate-limited
- JWT tokens expire after 7 days
- Content is moderated before indexing
- Wallet restrictions for repeat violators
- CORS restricted to frontend origin
- AI service only accessible from backend (authenticated via `AI_SERVICE_API_KEY`)

---

## Support

- [GitHub Issues](https://github.com/rutts29/solShare/issues)
