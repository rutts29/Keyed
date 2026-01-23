# SolShare Technical Documentation

Comprehensive technical documentation for deploying, configuring, and operating SolShare.

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
git clone https://github.com/your-org/solshare.git
cd solshare

# Backend
cd backend && npm install

# AI Service
cd ../ai-service && pip install -r requirements.txt

# Solana programs
cd ../solshare && yarn install
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

### Phase 5: Backend Deployment (Railway)

Railway runs one process per service, so you need **two separate services** for the backend:

**Service 1: API Server**
```bash
cd backend
railway login
railway init --name solshare-api
railway up
```
Uses `railway.json` → runs `npm run start:api`

**Service 2: Background Worker**
```bash
# In Railway dashboard, create a new service in the same project
# Set the start command to: npm run start:worker
# Or use railway.worker.json as reference
```
Uses `railway.worker.json` → runs `npm run start:worker`

Configure the same environment variables for both services in Railway dashboard.

> **Note:** Both services share the same codebase but run different processes. The worker handles BullMQ background jobs (AI analysis, notifications, feed refresh).

### Phase 6: AI Service Deployment (Railway)

```bash
cd ai-service
railway init
railway up
```

Set internal URL: `http://solshare-ai.railway.internal:8000`

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

# IPFS
PINATA_API_KEY=
PINATA_SECRET_KEY=
PINATA_GATEWAY_URL=

# Auth
JWT_SECRET=

# AI Service
AI_SERVICE_URL=
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

### Integration Tests

```bash
cd scripts/integration-tests
npm install
cp .env.example .env  # Configure test environment

# Run all tests
npm test

# Run specific suite
npm run test:auth
npm run test:posts
npm run test:search
npm run test:payments
npm run test:access
```

---

## Deployment Runbook

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Qdrant collection initialized
- [ ] Solana programs deployed and IDs updated
- [ ] Health checks passing locally

### Deployment Order

1. **Database**: Run migrations in order (001-006)
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
railway rollback --service solshare-api

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
- AI service only accessible from backend

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Support

- [GitHub Issues](https://github.com/your-org/solshare/issues)
- [Discord Community](https://discord.gg/solshare)
