# SolShare

A decentralized social media platform built on Solana with AI-powered content analysis, semantic search, and token-gated content access.

## Overview

SolShare is a Web3 social platform that combines:
- **Solana blockchain** for decentralized identity, payments, and token-gating
- **AI/ML services** for content moderation, semantic search, and personalized recommendations
- **IPFS** for decentralized content storage
- **Real-time features** via Supabase Realtime

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│   AI Service    │
│   (Next.js)     │     │   (Express.js)   │     │   (FastAPI)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
         ┌─────────────────────┼────────────────────────┼─────────────┐
         │                     │                        │             │
         ▼                     ▼                        ▼             ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐
│    Supabase     │  │   Cloudflare    │  │     Qdrant      │  │  Solana  │
│   (PostgreSQL)  │  │       R2        │  │   (Vectors)     │  │  Devnet  │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Solana Programs** | Anchor/Rust | On-chain social graph, payments, token-gating |
| **Backend API** | Express.js/TypeScript | REST API, job queues, Solana integration |
| **AI Service** | FastAPI/Python | Content moderation, analysis, search |
| **Database** | Supabase (PostgreSQL) | User data, posts, interactions |
| **Vector DB** | Qdrant Cloud | Semantic search embeddings |
| **Storage** | Cloudflare R2 + IPFS | Media files, decentralized content |
| **Cache** | Upstash Redis | Rate limiting, feed caching |

## Features

### Core Features
- 🔐 **Wallet Authentication** - Sign in with Phantom, Solflare, or any Solana wallet
- 📸 **Content Creation** - Upload images with AI-generated descriptions and tags
- 🔍 **Semantic Search** - Find content using natural language queries
- 💰 **Creator Payments** - Tips and subscriptions via Solana
- 🎟️ **Token Gating** - Restrict content access by token/NFT ownership
- 🛡️ **AI Moderation** - Automatic content safety screening

### AI Capabilities
- Image scene detection and tagging
- Natural language descriptions (alt text)
- Content safety scoring
- Semantic similarity search
- Personalized feed recommendations

## Project Structure

```
solshare/
├── solshare/              # Solana programs (Anchor)
│   ├── programs/
│   │   ├── solshare-social/     # Profiles, posts, follows, likes
│   │   ├── solshare-payment/    # Tips, subscriptions, withdrawals
│   │   └── solshare-token-gate/ # Token/NFT access control
│   └── tests/
├── backend/               # Node.js API server
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── services/      # Business logic
│   │   ├── jobs/          # Background workers (BullMQ)
│   │   └── middleware/    # Auth, validation, rate limiting
│   ├── migrations/        # SQL migrations (001-005)
│   └── idl/               # Anchor IDL files
├── ai-service/            # Python AI/ML microservice
│   ├── app/
│   │   ├── api/routes/    # FastAPI endpoints
│   │   └── services/      # AI/ML services
│   └── scripts/           # Setup scripts
└── scripts/
    └── integration-tests/ # End-to-end tests
```

## Prerequisites

- Node.js 22+
- Python 3.12+
- Rust + Anchor CLI
- Solana CLI
- Docker (optional)

## Quick Start

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

```bash
cd backend
npm run build

# Deploy via Railway CLI or connect GitHub
railway login
railway init
railway up
```

Configure all environment variables in Railway dashboard.

Procfile processes:
- `web`: Main API server
- `worker`: Background job processor

### Phase 6: AI Service Deployment (Railway)

```bash
cd ai-service
railway init
railway up
```

Set internal URL: `http://solshare-ai.railway.internal:8000`

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

## Security Considerations

- All API endpoints are rate-limited
- JWT tokens expire after 7 days
- Content is moderated before indexing
- Wallet restrictions for repeat violators
- CORS restricted to frontend origin
- AI service only accessible from backend

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Support

- [GitHub Issues](https://github.com/your-org/solshare/issues)
- [Discord Community](https://discord.gg/solshare)
