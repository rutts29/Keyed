# Keyed Codemap

> A visual guide to the Keyed codebase — a decentralized social media platform built on Solana with AI-powered features.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
│                  (Frontend - Next.js 16 + React 19 + Dynamic Labs)              │
│                                                                                  │
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
│  • Chat, Airdrops, Privacy             • AI Analysis, Notifications             │
│  • Rate Limiting + Validation           • Airdrop Distribution                   │
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
│ • Airdrop    │   │ • Search        │   │              │   │  Qdrant         │
│              │   │ • Recommend     │   │              │   │  (Vector DB)    │
│              │   │ • Pipeline      │   │              │   │                 │
└──────────────┘   └─────────────────┘   └──────────────┘   └─────────────────┘
```

---

## Repository Structure

```
/workspace/
│
├── 📁 solshare/              # Solana Smart Contracts (Anchor/Rust)
│   ├── programs/             #    Four on-chain programs
│   └── tests/                #    TypeScript integration tests
│
├── 📁 backend/               # Node.js API Server (Express/TypeScript)
│   ├── src/                  #    Application source code
│   ├── migrations/           #    PostgreSQL migrations
│   ├── idl/                  #    Solana program IDL files
│   └── tests/                #    API tests (Vitest)
│
├── 📁 ai-service/            # Python AI/ML Microservice (FastAPI)
│   ├── app/                  #    FastAPI application
│   └── scripts/              #    Setup utilities
│
├── 📁 scripts/               # Deployment & Testing Utilities
│   └── integration-tests/    #    End-to-end test suite
│
├── 📁 postman/               # API Testing Collections
│
└── 📄 Config Files           # Docker, env examples, documentation
```

---

## Solana Programs (`/solshare/`)

Four Anchor programs handle all on-chain operations:

### Program Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SOLANA PROGRAMS (DEVNET)                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────┐ │
│  │  SOCIAL PROGRAM   │  │  PAYMENT PROGRAM  │  │ TOKEN-GATE PROG.  │  │ AIRDROP PROG. │ │
│  │                   │  │                   │  │                   │  │               │ │
│  │  User Profiles    │  │  Creator Vaults   │  │  Access Control   │  │ Campaign      │ │
│  │  Posts & Content  │  │  Tips & Payments  │  │  Token Verify     │  │ Escrow        │ │
│  │  Follows & Likes  │  │  Subscriptions    │  │  NFT Verify       │  │ Batch Distrib │ │
│  │  Comments         │  │  Withdrawals      │  │                   │  │ Refunds       │ │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘  └───────────────┘ │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Social Program (`programs/solshare-social/`)

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

### Payment Program (`programs/solshare-payment/`)

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

### Token-Gate Program (`programs/solshare-token-gate/`)

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

### Airdrop Program (`programs/solshare-airdrop/`)

**Purpose:** Campaign escrow, batch distribution, refunds

| File | Purpose |
|------|---------|
| `lib.rs` | Program entry + instructions |
| `state.rs` | Campaign, EscrowVault, RecipientBatch |
| `error.rs` | Airdrop-specific errors |
| `instructions/` | Campaign and distribution logic |

**Instructions:**
- `create_campaign` → Initialize airdrop campaign with parameters
- `fund_campaign` → Deposit SOL/tokens into escrow vault
- `distribute_batch` → Send tokens to a batch of recipients
- `refund` → Return remaining funds to campaign creator

---

## Backend API (`/backend/`)

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
│   ├── access.routes.ts        #   /api/access/*
│   ├── chat.routes.ts          #   /api/chat/*
│   ├── airdrop.routes.ts       #   /api/airdrops/*
│   ├── privacy.routes.ts       #   /api/privacy/*
│   └── notification.routes.ts  #   /api/notifications/*
│
├── 📁 controllers/             # Request handlers (business logic)
│   ├── auth.controller.ts      #   Wallet auth, JWT tokens
│   ├── users.controller.ts     #   Profile CRUD
│   ├── posts.controller.ts     #   Post creation, likes, comments
│   ├── feed.controller.ts      #   Personalized/explore feeds
│   ├── payments.controller.ts  #   Tips, subscriptions, earnings
│   ├── search.controller.ts    #   Semantic search proxy
│   ├── access.controller.ts    #   Token-gate verification
│   ├── chat.controller.ts      #   Chat rooms, messages, membership
│   ├── airdrop.controller.ts   #   Campaign CRUD, prepare, fund, start, cancel
│   ├── privacy.controller.ts   #   Anonymous tipping, privacy settings
│   └── notification.controller.ts #  Notifications, unread counts
│
├── 📁 services/                # External service integrations
│   ├── solana.service.ts       #   Transaction building, PDAs
│   ├── ipfs.service.ts         #   Pinata upload + R2 caching
│   ├── ai.service.ts           #   AI service HTTP client
│   ├── cache.service.ts        #   Redis caching helpers
│   ├── realtime.service.ts     #   Supabase Realtime broadcasts
│   ├── airdrop.service.ts      #   Audience resolution, escrow transactions
│   ├── privacy.service.ts      #   Privacy Cash SDK wrapper
│   ├── notification.service.ts #   Real-time notifications
│   └── payment.service.ts      #   Payment transaction building
│
├── 📁 jobs/                    # Background job processors
│   ├── queues.ts               #   Queue definitions
│   ├── ai-analysis.job.ts      #   Process AI content analysis
│   ├── embedding.job.ts        #   Index embeddings in Qdrant
│   ├── notification.job.ts     #   Send notifications
│   ├── feed-refresh.job.ts     #   Recompute personalized feeds
│   ├── sync-chain.job.ts       #   Sync on-chain data to DB
│   └── airdrop.job.ts          #   Airdrop distribution worker
│
├── 📁 pipeline/                # Recommendation engine (x-algorithm)
│   ├── feed-pipeline.ts        #   Main orchestrator
│   ├── candidate-pipeline.ts   #   Candidate sourcing
│   ├── hydrators.ts            #   Post enrichment
│   ├── filters.ts              #   Dedup, age, visibility
│   ├── scorers.ts              #   Multi-action engagement scoring
│   ├── selector.ts             #   Top-K with diversity
│   ├── side-effects.ts         #   Metrics & caching
│   └── types.ts                #   Pipeline type definitions
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
│  CHAT (/api/chat/)                    AIRDROPS (/api/airdrops/)              │
│  ├── POST /rooms      → Create room   ├── POST /          → Create campaign  │
│  ├── GET /rooms       → List rooms    ├── GET /           → List campaigns   │
│  ├── POST /rooms/:id/messages → Send  ├── POST /:id/fund  → Fund campaign   │
│  ├── GET /rooms/:id/messages → Read   ├── POST /:id/start → Start airdrop   │
│  └── POST /rooms/:id/members → Join   └── POST /:id/cancel → Cancel/refund  │
│                                                                              │
│  PRIVACY (/api/privacy/)              NOTIFICATIONS (/api/notifications/)    │
│  ├── POST /tip        → Anonymous tip  ├── GET /           → List notifs     │
│  ├── GET /settings    → Get settings   ├── GET /unread     → Unread count    │
│  └── PUT /settings    → Update prefs   └── PUT /:id/read  → Mark as read    │
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
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │  feed-refresh   │    │   sync-chain    │    │    airdrop      │          │
│  │                 │    │                 │    │                 │          │
│  │  • Recompute    │    │  • Sync on-chain│    │  • Batch distro │          │
│  │    personalized │    │    data to DB   │    │  • Escrow mgmt  │          │
│  │    feeds        │    │  • Profiles     │    │  • Status track │          │
│  │                 │    │  • Posts        │    │                 │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
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
| `006_privacy_tables.sql` | Private tips, privacy settings, shield cache |
| `007_chat_tables.sql` | Chat rooms, members, messages |
| `008_airdrop_tables.sql` | Airdrop campaigns, recipients |
| `20260201_add_escrow_secret.sql` | Escrow secret key migration |

---

## AI Service (`/ai-service/`)

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
│   ├── moderate.py             #   /api/moderate/* - Content moderation
│   └── pipeline.py             #   /api/pipeline/* - Engagement scoring & retrieval
│
├── 📁 services/                # Core AI services
│   ├── llm.py                  #   OpenAI GPT client (Vision + Text)
│   ├── embeddings.py           #   Voyage AI embedding generation
│   ├── vector_db.py            #   Qdrant operations
│   ├── content_analyzer.py     #   Analysis orchestration
│   ├── semantic_search.py      #   Search logic (expand + embed + search)
│   ├── recommender.py          #   Feed recommendation engine
│   ├── moderator.py            #   Content safety checking
│   ├── database.py             #   Supabase client
│   ├── engagement_scorer.py    #   Multi-action engagement scoring
│   └── retrieval.py            #   Candidate retrieval for pipeline
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

## Data Layer

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
│  CHAT TABLES                           │     feed_cache        │            │
│  ┌───────────────┐                     │ (pre-computed feeds)  │            │
│  │  chat_rooms   │                     └───────────────────────┘            │
│  │  (rooms)      │                                                          │
│  └───────────────┘                     AIRDROP TABLES                       │
│  ┌───────────────┐                     ┌───────────────────────┐            │
│  │ chat_members  │                     │  airdrop_campaigns    │            │
│  │ (membership)  │                     │  (campaign config)    │            │
│  └───────────────┘                     └───────────────────────┘            │
│  ┌───────────────┐                     ┌───────────────────────┐            │
│  │ chat_messages │                     │  airdrop_recipients   │            │
│  │ (messages)    │                     │  (recipient tracking) │            │
│  └───────────────┘                     └───────────────────────┘            │
│                                                                              │
│  PRIVACY TABLES                                                              │
│  ┌───────────────────────┐  ┌───────────────────────┐                       │
│  │    private_tips       │  │ user_privacy_settings  │                       │
│  │  (anonymous tips)     │  │  (user preferences)    │                       │
│  └───────────────────────┘  └───────────────────────┘                       │
│  ┌───────────────────────┐                                                  │
│  │  privacy_shield_cache │                                                  │
│  │  (shield state cache) │                                                  │
│  └───────────────────────┘                                                  │
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
│  │  ratelimit:*      1hr   │           │  bull:airdrop         │            │
│  └─────────────────────────┘           └───────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Vector Database (Qdrant)

```
Collection: keyed_posts
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

## Key Data Flows

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

## Testing Structure

```
/workspace/
├── solshare/tests/                 # Solana program tests (Anchor/TS)
│   ├── social.ts                   #   Social program tests
│   ├── payment.ts                  #   Payment program tests
│   ├── token-gate.ts               #   Token-gate program tests
│   └── airdrop.ts                  #   Airdrop program tests
│
├── backend/tests/
│   ├── e2e/                        # E2E integration tests (Vitest)
│   │   ├── setup.ts                #   Shared helpers (api, authenticate, signMessage)
│   │   ├── chat.e2e.test.ts        #   Chat room lifecycle
│   │   ├── airdrop.e2e.test.ts     #   Airdrop campaigns (real DevNet)
│   │   ├── social-flow.e2e.test.ts #   Full social lifecycle
│   │   ├── authz-boundaries.e2e.test.ts # Authorization + IDOR
│   │   ├── input-fuzzing.e2e.test.ts    # SQL injection, XSS, overflow
│   │   ├── concurrency.e2e.test.ts      # Concurrent operations
│   │   └── isolation.e2e.test.ts        # Account data isolation
│   ├── chat/                       # Chat unit tests
│   ├── airdrop/                    # Airdrop unit tests
│   ├── pipeline/                   # Pipeline unit tests
│   ├── auth.test.ts                #   Auth flow tests
│   ├── posts.test.ts               #   Post operations tests
│   ├── users.test.ts               #   User operations tests
│   └── setup.ts                    #   Test configuration
│
├── ai-service/tests/               # AI service tests (Pytest)
│   └── test_api.py                 #   API endpoint tests
│
└── scripts/integration-tests/      # E2E integration tests
    ├── test-all.ts                 #   Run all integration tests
    ├── test-auth.ts                #   Auth integration
    ├── test-posts.ts               #   Posts integration
    ├── test-search.ts              #   Search integration
    ├── test-payments.ts            #   Payments integration
    └── test-access.ts              #   Token-gate integration
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT TOPOLOGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           VERCEL (Frontend)                            │  │
│  │                         keyed.app                                      │  │
│  │               Next.js 16 + React 19 + Dynamic Labs                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          RAILWAY                                       │  │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐             │  │
│  │  │   Backend API Service   │  │   Backend Worker        │             │  │
│  │  │   api.keyed.app         │  │   (BullMQ processor)    │             │  │
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

## Key External Dependencies

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

## Configuration Files

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

## Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Solana Programs** | ✅ Complete | 4 programs deployed to devnet |
| **Backend API** | ✅ Complete | All endpoints implemented |
| **AI Service** | ✅ Complete | Analysis, search, moderation, pipeline |
| **Database Migrations** | ✅ Complete | 8+ migration files |
| **Background Jobs** | ✅ Complete | 6 job processors |
| **Frontend** | ✅ Built | Next.js 16 + React 19 + Dynamic Labs |
| **Chat** | ✅ Complete | Real-time rooms and messaging |
| **Airdrops** | ✅ Complete | Campaign escrow and batch distribution |
| **Privacy** | ✅ Complete | Anonymous tipping and privacy settings |
| **Integration Tests** | ✅ Complete | Full E2E test suite |

---

## Quick Reference Links

- **Spec Document:** `/workspace/KEYED_SPEC.md`
- **Backend README:** `/workspace/backend/README.md`
- **AI Service README:** `/workspace/ai-service/README.md`
- **Solana Programs:** `/workspace/solshare/docs/AGENT1_SOLANA_PROGRAMS.md`
- **API Collection:** `/workspace/postman/Keyed_API.postman_collection.json`
