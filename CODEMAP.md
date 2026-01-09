# 🗺️ SolShare Codemap

> A visual guide to the SolShare codebase — a decentralized social media platform built on Solana with AI-powered features.

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
│                         (Frontend - Not Yet Built)                               │
│                     Next.js 15 + TypeScript + Dynamic.xyz                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST API + WebSocket
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND LAYER                                       │
│                   /workspace/backend (Express.js + TypeScript)                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • REST API Server (index.ts)           • Background Worker (worker.ts)          │
│  • Auth, Posts, Feed, Payments          • BullMQ Job Processing                  │
│  • Rate Limiting + Validation           • AI Analysis, Notifications             │
└─────────────────────────────────────────────────────────────────────────────────┘
        │                    │                    │                    │
        │                    │                    │                    │
        ▼                    ▼                    ▼                    ▼
┌──────────────┐   ┌─────────────────┐   ┌──────────────┐   ┌─────────────────┐
│   SOLANA     │   │   AI SERVICE    │   │   STORAGE    │   │    DATABASE     │
│   PROGRAMS   │   │   (FastAPI)     │   │              │   │                 │
│              │   │                 │   │              │   │                 │
│ /solshare/   │   │ /ai-service/    │   │ Cloudflare   │   │  Supabase       │
│  programs/   │   │  app/           │   │ R2 + IPFS    │   │  (PostgreSQL)   │
│              │   │                 │   │  (Pinata)    │   │                 │
│ • Social     │   │ • LLM Analysis  │   │              │   │  Upstash Redis  │
│ • Payment    │   │ • Embeddings    │   │              │   │  (Cache/Queue)  │
│ • TokenGate  │   │ • Moderation    │   │              │   │                 │
│              │   │ • Search        │   │              │   │  Qdrant         │
│              │   │ • Recommend     │   │              │   │  (Vector DB)    │
└──────────────┘   └─────────────────┘   └──────────────┘   └─────────────────┘
```

---

## 🏗️ Repository Structure

```
/workspace/
│
├── 📁 solshare/              # 🔗 Solana Smart Contracts (Anchor/Rust)
│   ├── programs/             #    Three on-chain programs
│   └── tests/                #    TypeScript integration tests
│
├── 📁 backend/               # 🖥️ Node.js API Server (Express/TypeScript)
│   ├── src/                  #    Application source code
│   ├── migrations/           #    PostgreSQL migrations
│   ├── idl/                  #    Solana program IDL files
│   └── tests/                #    API tests (Vitest)
│
├── 📁 ai-service/            # 🤖 Python AI/ML Microservice (FastAPI)
│   ├── app/                  #    FastAPI application
│   └── scripts/              #    Setup utilities
│
├── 📁 scripts/               # 🛠️ Deployment & Testing Utilities
│   └── integration-tests/    #    End-to-end test suite
│
├── 📁 postman/               # 📬 API Testing Collections
│
└── 📄 Config Files           # Docker, env examples, documentation
```

---

## 🔗 Solana Programs (`/solshare/`)

Three Anchor programs handle all on-chain operations:

### Program Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SOLANA PROGRAMS (DEVNET)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │   SOCIAL PROGRAM    │  │   PAYMENT PROGRAM   │  │  TOKEN-GATE PROGRAM │  │
│  │                     │  │                     │  │                     │  │
│  │  User Profiles      │  │  Creator Vaults     │  │  Access Control     │  │
│  │  Posts & Content    │  │  Tips & Payments    │  │  Token Verification │  │
│  │  Follows & Likes    │  │  Subscriptions      │  │  NFT Verification   │  │
│  │  Comments           │  │  Withdrawals        │  │                     │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 📂 Social Program (`programs/solshare-social/`)

**Purpose:** Core social features - profiles, posts, follows, likes, comments

| File | Purpose |
|------|---------|
| `lib.rs` | Program entry point, instruction dispatcher |
| `state.rs` | Account structures (UserProfile, Post, Follow, Like, Comment) |
| `error.rs` | Custom error definitions |
| `events.rs` | Event definitions for indexing |
| `instructions/` | Individual instruction handlers |

**Instructions:**
- `create_profile` / `update_profile` → User profiles
- `create_post` → Content creation with IPFS URI
- `follow_user` / `unfollow_user` → Social graph
- `like_post` / `unlike_post` → Engagement
- `comment_post` → Comments on posts

**Key PDA Seeds:**
```
Profile: ["profile", authority]
Post:    ["post", creator, post_count]
Follow:  ["follow", follower, following]
Like:    ["like", post, user]
Comment: ["comment", post, comment_count]
```

### 💰 Payment Program (`programs/solshare-payment/`)

**Purpose:** Creator monetization - tips, subscriptions, earnings

| File | Purpose |
|------|---------|
| `lib.rs` | Program entry + instructions |
| `state.rs` | CreatorVault, TipRecord, Subscription, PlatformConfig |
| `error.rs` | Payment-specific errors |
| `instructions/` | Payment operations |

**Instructions:**
- `initialize_platform` → Platform fee configuration (admin only)
- `initialize_vault` → Create creator earnings vault
- `tip_creator` → Send SOL tips (2% platform fee)
- `subscribe` / `cancel_subscription` → Monthly subscriptions
- `process_subscription` → Crank for monthly payments
- `withdraw` → Creator withdraws earnings

**Money Flow:**
```
Tipper → (2% fee) → Platform Treasury
       → (98%)    → Creator Vault → Creator Wallet (on withdraw)
```

### 🎟️ Token-Gate Program (`programs/solshare-token-gate/`)

**Purpose:** Token/NFT-gated content access control

| File | Purpose |
|------|---------|
| `lib.rs` | Program entry + instructions |
| `state.rs` | AccessControl, AccessVerification |
| `instructions/` | Access verification logic |

**Instructions:**
- `set_access_requirements` → Configure gating (token/NFT required)
- `verify_token_access` → Check SPL token balance
- `verify_nft_access` → Check NFT ownership (Metaplex)
- `check_access` → Combined access check

---

## 🖥️ Backend API (`/backend/`)

Express.js server handling REST API, job queues, and service orchestration.

### Directory Map

```
backend/src/
│
├── 📄 index.ts                 # API server entry point
├── 📄 worker.ts                # BullMQ worker process (separate)
│
├── 📁 config/                  # External service configurations
│   ├── env.ts                  #   Environment validation (Zod)
│   ├── supabase.ts             #   Supabase client setup
│   ├── redis.ts                #   Upstash Redis + BullMQ
│   ├── solana.ts               #   Solana connection + programs
│   └── r2.ts                   #   Cloudflare R2 (S3) client
│
├── 📁 routes/                  # Express route definitions
│   ├── auth.routes.ts          #   /api/auth/*
│   ├── users.routes.ts         #   /api/users/*
│   ├── posts.routes.ts         #   /api/posts/*
│   ├── feed.routes.ts          #   /api/feed/*
│   ├── payments.routes.ts      #   /api/payments/*
│   ├── search.routes.ts        #   /api/search/*
│   └── access.routes.ts        #   /api/access/*
│
├── 📁 controllers/             # Request handlers (business logic)
│   ├── auth.controller.ts      #   Wallet auth, JWT tokens
│   ├── users.controller.ts     #   Profile CRUD
│   ├── posts.controller.ts     #   Post creation, likes, comments
│   ├── feed.controller.ts      #   Personalized/explore feeds
│   ├── payments.controller.ts  #   Tips, subscriptions, earnings
│   ├── search.controller.ts    #   Semantic search proxy
│   └── access.controller.ts    #   Token-gate verification
│
├── 📁 services/                # External service integrations
│   ├── solana.service.ts       #   Transaction building, PDAs
│   ├── ipfs.service.ts         #   Pinata upload + R2 caching
│   ├── ai.service.ts           #   AI service HTTP client
│   ├── cache.service.ts        #   Redis caching helpers
│   └── realtime.service.ts     #   Supabase Realtime broadcasts
│
├── 📁 jobs/                    # Background job processors
│   ├── queues.ts               #   Queue definitions
│   ├── ai-analysis.job.ts      #   Process AI content analysis
│   ├── embedding.job.ts        #   Index embeddings in Qdrant
│   ├── notification.job.ts     #   Send notifications
│   ├── feed-refresh.job.ts     #   Recompute personalized feeds
│   └── sync-chain.job.ts       #   Sync on-chain data to DB
│
├── 📁 middleware/              # Express middleware
│   ├── auth.ts                 #   JWT verification
│   ├── validation.ts           #   Request body validation
│   ├── rateLimiter.ts          #   Rate limiting per wallet
│   └── errorHandler.ts         #   Global error handler
│
├── 📁 models/                  # TypeScript types/schemas
│   └── schemas.ts              #   Zod schemas for validation
│
└── 📁 utils/                   # Utility functions
    ├── logger.ts               #   Pino structured logging
    └── helpers.ts              #   Misc helpers
```

### API Endpoints Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REST API ENDPOINTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AUTH (/api/auth/)                    USERS (/api/users/)                    │
│  ├── POST /challenge  → Get nonce     ├── GET /:wallet     → Get profile     │
│  ├── POST /verify     → Verify sig    ├── POST /profile    → Create/update   │
│  └── POST /refresh    → Refresh JWT   ├── GET /:wallet/posts → User posts    │
│                                       ├── POST /:wallet/follow → Follow      │
│  POSTS (/api/posts/)                  └── DELETE /:wallet/follow → Unfollow  │
│  ├── POST /upload     → Upload media                                         │
│  ├── POST /create     → Create post   FEED (/api/feed/)                      │
│  ├── GET /:id         → Get post      ├── GET /           → Personalized     │
│  ├── POST /:id/like   → Like          ├── GET /explore    → Trending         │
│  ├── DELETE /:id/like → Unlike        └── GET /following  → Following only   │
│  └── POST /:id/comments → Comment                                            │
│                                       SEARCH (/api/search/)                  │
│  PAYMENTS (/api/payments/)            ├── POST /semantic  → AI search        │
│  ├── POST /vault/init → Create vault  ├── GET /suggest    → Autocomplete     │
│  ├── POST /tip        → Send tip      └── GET /users      → User search      │
│  ├── POST /subscribe  → Subscribe                                            │
│  ├── GET /earnings    → Get earnings  ACCESS (/api/access/)                  │
│  └── POST /withdraw   → Withdraw      ├── GET /verify     → Check access     │
│                                       └── POST /requirements → Set gates     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Background Jobs (BullMQ)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKGROUND JOB QUEUES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │  ai-analysis    │    │    embedding    │    │  notification   │          │
│  │                 │    │                 │    │                 │          │
│  │  • Vision LLM   │───▶│  • Generate     │    │  • WebSocket    │          │
│  │  • Descriptions │    │    embedding    │    │  • Push notifs  │          │
│  │  • Tags/Mood    │    │  • Index Qdrant │    │  • Email        │          │
│  │  • Safety score │    │                 │    │                 │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                                 │
│  │  feed-refresh   │    │   sync-chain    │                                 │
│  │                 │    │                 │                                 │
│  │  • Recompute    │    │  • Sync on-chain│                                 │
│  │    personalized │    │    data to DB   │                                 │
│  │    feeds        │    │  • Profiles     │                                 │
│  │                 │    │  • Posts        │                                 │
│  └─────────────────┘    └─────────────────┘                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Migrations (`backend/migrations/`)

| Migration | Purpose |
|-----------|---------|
| `001_extensions.sql` | Enable pgcrypto, vector extensions |
| `002_core_tables.sql` | Users, posts, follows, likes, comments, interactions |
| `003_moderation_tables.sql` | Content violations, blocked hashes, restrictions |
| `004_functions.sql` | Helper functions (wallet upload limits, etc.) |
| `005_realtime.sql` | Enable Supabase Realtime on tables |

---

## 🤖 AI Service (`/ai-service/`)

Python FastAPI microservice handling all AI/ML operations.

### Directory Map

```
ai-service/app/
│
├── 📄 main.py                  # FastAPI entry point
├── 📄 config.py                # Settings (Pydantic)
│
├── 📁 api/routes/              # API endpoints
│   ├── analyze.py              #   /api/analyze/* - Content analysis
│   ├── search.py               #   /api/search/*  - Semantic search
│   ├── recommend.py            #   /api/recommend/* - Recommendations
│   └── moderate.py             #   /api/moderate/* - Content moderation
│
├── 📁 services/                # Core AI services
│   ├── llm.py                  #   OpenAI GPT client (Vision + Text)
│   ├── embeddings.py           #   Voyage AI embedding generation
│   ├── vector_db.py            #   Qdrant operations
│   ├── content_analyzer.py     #   Analysis orchestration
│   ├── semantic_search.py      #   Search logic (expand + embed + search)
│   ├── recommender.py          #   Feed recommendation engine
│   ├── moderator.py            #   Content safety checking
│   └── database.py             #   Supabase client
│
├── 📁 models/                  # Data models
│   └── schemas.py              #   Pydantic request/response models
│
└── 📁 utils/                   # Utilities
    └── image.py                #   Image processing helpers
```

### AI Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI SERVICE FLOWS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CONTENT ANALYSIS (/api/analyze/content)                                     │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │  Image  │───▶│ GPT Vision  │───▶│   Voyage    │───▶│   Qdrant    │       │
│  │  (IPFS) │    │  Analysis   │    │  Embedding  │    │   Index     │       │
│  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘       │
│                       │                                                      │
│                       ▼                                                      │
│              Description, Tags, Mood, Scene, Safety Score                    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SEMANTIC SEARCH (/api/search/semantic)                                      │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │  Query  │───▶│    GPT      │───▶│   Voyage    │───▶│   Qdrant    │       │
│  │         │    │  Expansion  │    │  Embedding  │    │   Search    │       │
│  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘       │
│                                            │                   │             │
│                                            └───────┬───────────┘             │
│                                                    ▼                         │
│                                          GPT Re-ranking (optional)           │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CONTENT MODERATION (/api/moderate/check) - SYNCHRONOUS GUARDRAIL           │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐                          │
│  │  Image  │───▶│ GPT Vision  │───▶│  Verdict:   │                          │
│  │ (Base64)│    │  Safety     │    │ ALLOW/WARN/ │                          │
│  └─────────┘    │  Analysis   │    │ BLOCK       │                          │
│                 └─────────────┘    └─────────────┘                          │
│                                                                              │
│  Categories: NSFW, Violence, Hate, Child Safety, Spam, Drugs/Weapons        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### External AI Services

| Service | Purpose | Model |
|---------|---------|-------|
| **OpenAI** | Vision analysis, query expansion, moderation | GPT-5.2 |
| **Voyage AI** | Text embeddings | voyage-3.5 (1024 dim) |
| **Qdrant** | Vector similarity search | HNSW index |

---

## 💾 Data Layer

### Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (POSTGRESQL)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CORE TABLES                           MODERATION TABLES                     │
│  ┌───────────────┐                     ┌───────────────────────┐            │
│  │    users      │──┐                  │  content_violations   │            │
│  │  (profiles)   │  │                  │  (violation logs)     │            │
│  └───────────────┘  │                  └───────────────────────┘            │
│         │           │                  ┌───────────────────────┐            │
│         ▼           │                  │ blocked_content_hashes│            │
│  ┌───────────────┐  │                  │  (known bad content)  │            │
│  │    posts      │◀─┤                  └───────────────────────┘            │
│  │  (content)    │  │                  ┌───────────────────────┐            │
│  └───────────────┘  │                  │  wallet_restrictions  │            │
│         │           │                  │  (offender tracking)  │            │
│         ▼           │                  └───────────────────────┘            │
│  ┌───────────────┐  │                  ┌───────────────────────┐            │
│  │    likes      │◀─┤                  │    user_reports       │            │
│  │   comments    │  │                  │  (community reports)  │            │
│  └───────────────┘  │                  └───────────────────────┘            │
│                     │                                                        │
│  ┌───────────────┐  │                  ML TABLES                             │
│  │   follows     │◀─┘                  ┌───────────────────────┐            │
│  │ (social graph)│                     │    interactions       │            │
│  └───────────────┘                     │  (view, like, skip)   │            │
│                                        └───────────────────────┘            │
│  ┌───────────────┐                     ┌───────────────────────┐            │
│  │ transactions  │                     │  user_taste_profiles  │            │
│  │  (tx history) │                     │  (ML-generated)       │            │
│  └───────────────┘                     └───────────────────────┘            │
│                                        ┌───────────────────────┐            │
│                                        │     feed_cache        │            │
│                                        │ (pre-computed feeds)  │            │
│                                        └───────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Caching & Queues (Upstash Redis)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            UPSTASH REDIS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CACHE KEYS                            BULLMQ QUEUES                         │
│  ┌─────────────────────────┐           ┌───────────────────────┐            │
│  │  user:{wallet}    5min  │           │  bull:ai-analysis     │            │
│  │  post:{postId}    1hr   │           │  bull:embedding       │            │
│  │  feed:{wallet}    30s   │           │  bull:notification    │            │
│  │  following:{wallet} 5m  │           │  bull:feed-refresh    │            │
│  │  auth:challenge:* 5min  │           │  bull:sync-chain      │            │
│  │  ratelimit:*      1hr   │           └───────────────────────┘            │
│  └─────────────────────────┘                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Vector Database (Qdrant)

```
Collection: solshare_posts
├── id: post_id (string)
├── vector: float[1024] (Voyage embeddings)
├── payload:
│   ├── creator_wallet (indexed)
│   ├── description
│   ├── caption
│   ├── tags[]
│   ├── scene_type (indexed)
│   ├── mood
│   └── timestamp (indexed)
```

---

## 🔄 Key Data Flows

### 1. Post Creation Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           POST CREATION FLOW                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  User                  Backend                AI Service        Blockchain    │
│   │                      │                       │                  │         │
│   │  1. Upload image     │                       │                  │         │
│   │─────────────────────▶│                       │                  │         │
│   │                      │  2. Safety check      │                  │         │
│   │                      │──────────────────────▶│                  │         │
│   │                      │◀──────────────────────│                  │         │
│   │                      │     ALLOW/BLOCK       │                  │         │
│   │                      │                       │                  │         │
│   │   [If blocked: Error]│                       │                  │         │
│   │◀─────────────────────│                       │                  │         │
│   │                      │                       │                  │         │
│   │   [If allowed]       │                       │                  │         │
│   │                      │  3. Upload to IPFS    │                  │         │
│   │                      │─────────▶ Pinata      │                  │         │
│   │                      │  4. Cache in R2       │                  │         │
│   │                      │─────────▶ R2          │                  │         │
│   │                      │                       │                  │         │
│   │  5. Create post      │                       │                  │         │
│   │─────────────────────▶│                       │                  │         │
│   │                      │  6. Build Solana tx   │                  │         │
│   │◀─────────────────────│                       │                  │         │
│   │     (unsigned tx)    │                       │                  │         │
│   │                      │                       │                  │         │
│   │  7. Sign & submit    │                       │                  │         │
│   │─────────────────────▶│                       │                  │         │
│   │                      │──────────────────────────────────────────▶│        │
│   │                      │                       │       8. Confirm │         │
│   │◀─────────────────────│◀──────────────────────────────────────────│        │
│   │     Success!         │                       │                  │         │
│   │                      │                       │                  │         │
│   │      [ASYNC]         │  9. Queue AI job      │                  │         │
│   │                      │──────────────────────▶│                  │         │
│   │                      │  10. Full analysis    │                  │         │
│   │                      │  11. Index embedding  │                  │         │
│   │                      │◀──────────────────────│                  │         │
│   │                      │  12. Update DB        │                  │         │
│   │                      │                       │                  │         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2. Semantic Search Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          SEMANTIC SEARCH FLOW                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  User: "cozy workspaces"                                                      │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────┐                                                         │
│  │   GPT Expand    │ → "Images of comfortable home offices, warm lighting,   │
│  │                 │    wooden desks, plants, minimalist setups..."          │
│  └────────┬────────┘                                                         │
│           │                                                                   │
│           ▼                                                                   │
│  ┌─────────────────┐                                                         │
│  │  Voyage Embed   │ → [0.12, -0.34, 0.56, ...]  (1024 dimensions)           │
│  └────────┬────────┘                                                         │
│           │                                                                   │
│           ▼                                                                   │
│  ┌─────────────────┐                                                         │
│  │  Qdrant Search  │ → Top 100 similar posts                                 │
│  └────────┬────────┘                                                         │
│           │                                                                   │
│           ▼                                                                   │
│  ┌─────────────────┐                                                         │
│  │   GPT Re-rank   │ → Top 20 most relevant                                  │
│  │   (optional)    │                                                         │
│  └────────┬────────┘                                                         │
│           │                                                                   │
│           ▼                                                                   │
│      Search Results                                                           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3. Payment Flow (Tips)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                             TIP PAYMENT FLOW                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Tipper Wallet          Backend              Solana            Creator Vault  │
│       │                    │                    │                    │        │
│       │  1. Tip request    │                    │                    │        │
│       │───────────────────▶│                    │                    │        │
│       │                    │  2. Build tx       │                    │        │
│       │◀───────────────────│    (tip_creator)   │                    │        │
│       │    unsigned tx     │                    │                    │        │
│       │                    │                    │                    │        │
│       │  3. Sign tx        │                    │                    │        │
│       │───────────────────▶│                    │                    │        │
│       │                    │  4. Submit         │                    │        │
│       │                    │───────────────────▶│                    │        │
│       │                    │                    │  5. Transfer       │        │
│       │                    │                    │────────────────────▶        │
│       │                    │                    │    98% to vault    │        │
│       │                    │                    │    2% platform fee │        │
│       │                    │◀───────────────────│                    │        │
│       │◀───────────────────│  6. Confirm        │                    │        │
│       │     Success!       │                    │                    │        │
│       │                    │  7. Update DB      │                    │        │
│       │                    │  8. Notify creator │                    │        │
│       │                    │                    │                    │        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Structure

```
/workspace/
├── solshare/tests/            # Solana program tests (Anchor/TS)
│   ├── social.ts              #   Social program tests
│   ├── payment.ts             #   Payment program tests
│   └── token-gate.ts          #   Token-gate program tests
│
├── backend/tests/             # API tests (Vitest)
│   ├── auth.test.ts           #   Auth flow tests
│   ├── posts.test.ts          #   Post operations tests
│   ├── users.test.ts          #   User operations tests
│   └── setup.ts               #   Test configuration
│
├── ai-service/tests/          # AI service tests (Pytest)
│   └── test_api.py            #   API endpoint tests
│
└── scripts/integration-tests/ # E2E integration tests
    ├── test-all.ts            #   Run all integration tests
    ├── test-auth.ts           #   Auth integration
    ├── test-posts.ts          #   Posts integration
    ├── test-search.ts         #   Search integration
    ├── test-payments.ts       #   Payments integration
    └── test-access.ts         #   Token-gate integration
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT TOPOLOGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           VERCEL (Frontend)                            │  │
│  │                         solshare.app                                   │  │
│  │                     [Not yet implemented]                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          RAILWAY                                       │  │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐             │  │
│  │  │   Backend API Service   │  │   Backend Worker        │             │  │
│  │  │   api.solshare.app      │  │   (BullMQ processor)    │             │  │
│  │  │   npm run start:api     │  │   npm run start:worker  │             │  │
│  │  └─────────────────────────┘  └─────────────────────────┘             │  │
│  │  ┌─────────────────────────┐                                          │  │
│  │  │   AI Service            │                                          │  │
│  │  │   (FastAPI)             │                                          │  │
│  │  │   Internal URL only     │                                          │  │
│  │  └─────────────────────────┘                                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                    │              │              │                           │
│         ┌─────────┴────┬─────────┴────┬─────────┴────┬──────────┐          │
│         ▼              ▼              ▼              ▼          ▼           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────┐   │
│  │ Supabase  │  │  Upstash  │  │  Qdrant   │  │Cloudflare │  │ Solana │   │
│  │ PostgreSQL│  │   Redis   │  │  Cloud    │  │    R2     │  │ Devnet │   │
│  │ + Realtime│  │ + BullMQ  │  │           │  │  + IPFS   │  │        │   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key External Dependencies

| Service | Purpose | Used By |
|---------|---------|---------|
| **Supabase** | PostgreSQL + Realtime | Backend |
| **Upstash** | Redis + Job Queues | Backend |
| **Qdrant Cloud** | Vector Search | AI Service |
| **Cloudflare R2** | Object Storage | Backend |
| **Pinata** | IPFS Uploads | Backend |
| **Helius** | Solana RPC | Backend |
| **OpenAI** | GPT Vision + Text | AI Service |
| **Voyage AI** | Embeddings | AI Service |

---

## 📝 Configuration Files

| File | Purpose |
|------|---------|
| `backend/.env.example` | Backend environment template |
| `ai-service/.env.example` | AI service environment template |
| `solshare/.env.example` | Solana programs environment |
| `docker-compose.yml` | Production Docker setup |
| `docker-compose.dev.yml` | Development Docker setup |
| `solshare/Anchor.toml` | Anchor framework config |
| `backend/tsconfig.json` | TypeScript config |
| `backend/vitest.config.ts` | Test runner config |

---

## 🎯 Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Solana Programs** | ✅ Complete | 3 programs deployed to devnet |
| **Backend API** | ✅ Complete | All endpoints implemented |
| **AI Service** | ✅ Complete | Analysis, search, moderation |
| **Database Migrations** | ✅ Complete | 5 migration files |
| **Background Jobs** | ✅ Complete | 5 job processors |
| **Frontend** | ❌ Not Started | Next.js app not yet built |
| **Integration Tests** | ✅ Complete | Full E2E test suite |

---

## 🔗 Quick Reference Links

- **Spec Document:** `/workspace/SOLSHARE_SPEC.md`
- **Backend README:** `/workspace/backend/README.md`
- **AI Service README:** `/workspace/ai-service/README.md`
- **Solana Programs:** `/workspace/solshare/docs/AGENT1_SOLANA_PROGRAMS.md`
- **API Collection:** `/workspace/postman/SolShare_API.postman_collection.json`
