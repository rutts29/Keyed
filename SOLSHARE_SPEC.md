# SolShare - Complete Technical Specification

> **Version:** 3.0 | **Target:** Multi-Agent Autonomous Development | **Last Updated:** January 2026

---

## Executive Summary

SolShare is an **AI-native decentralized social platform** built on Solana that combines:
- Instagram-like content sharing with wallet-based authentication
- Instant creator monetization (tips, subscriptions) via Solana
- Token-gated exclusive content for NFT/token holders
- **AI-powered semantic search** (find content by meaning, not keywords - like Netflix)
- **Multimodal content understanding** (LLM analyzes images for recommendations)
- Decentralized storage (IPFS)

**Key Differentiator:** Unlike traditional social platforms that only understand text captions, SolShare uses Vision LLMs to actually *understand* image content, enabling semantic search like "cozy workspaces" to find relevant posts even without those exact words.

---

## Table of Contents

1. [Technology Stack (Centralized Reference)](#1-technology-stack-centralized-reference)
2. [System Architecture](#2-system-architecture)
3. [Module Breakdown & Dependencies](#3-module-breakdown--dependencies)
4. [Phase 1: Solana Programs](#phase-1-solana-programs-on-chain)
5. [Phase 2: Backend API](#phase-2-backend-api)
6. [Phase 3: AI/ML Service](#phase-3-aiml-service)
7. [Phase 4: Frontend Application](#phase-4-frontend-application)
8. [Phase 5: Database & Storage](#phase-5-database--storage)
9. [Phase 6: Integration & Real-Time](#phase-6-integration--real-time)
10. [Security Requirements](#security-requirements)
11. [API Contracts](#api-contracts)
12. [Deployment Strategy](#deployment-strategy)
13. [Testing Requirements](#testing-requirements)
14. [Success Criteria](#success-criteria)

---

## 1. Technology Stack (Centralized Reference)

> ⚠️ **IMPORTANT**: All technology choices are defined here. Modify this section to change any dependency across the project.

### 1.1 Core Infrastructure

| Layer | Technology | Version | Purpose | Alternative Options |
|-------|-----------|---------|---------|---------------------|
| **Blockchain** | Solana | Latest | Smart contracts, payments | - |
| **Smart Contract Framework** | Anchor | 0.30.x | Type-safe Solana programs | Native Rust |
| **Language (Contracts)** | Rust | 1.77+ | Solana programs | - |

### 1.2 Backend Services

| Component | Technology | Version | Purpose | Alternative Options |
|-----------|-----------|---------|---------|---------------------|
| **Runtime** | Node.js | 22.x LTS | Backend API server | Bun, Deno |
| **Framework** | Express.js | 4.21+ | REST API | Fastify, Hono |
| **Language** | TypeScript | 5.5+ | Type safety | - |
| **WebSocket** | Socket.io | 4.7+ | Real-time updates | ws, uWebSockets |
| **Package Manager** | pnpm | 9.x | Dependency management | npm, yarn |

### 1.3 AI/ML Services

| Component | Technology | Version/Model | Purpose | Alternative Options |
|-----------|-----------|---------------|---------|---------------------|
| **Runtime** | Python | 3.12+ | ML service | - |
| **Framework** | FastAPI | 0.115+ | ML API server | - |
| **Vision + Text LLM** | OpenAI GPT 5.2 | gpt-5.2-thinking / gpt-5.2-instant | Image analysis, moderation, query expansion | Claude claude-4-sonnet |
| **Embedding Model** | Voyage AI | voyage-3.5 | Semantic embeddings (1024 dim) | OpenAI text-embedding-3-large |
| **Vector Database** | Qdrant | 1.11+ | Semantic search | Pinecone, Weaviate, Milvus |

### 1.4 Frontend

| Component | Technology | Version | Purpose | Alternative Options |
|-----------|-----------|---------|---------|---------------------|
| **Framework** | Next.js | 15.x | React framework with App Router | Remix |
| **Language** | TypeScript | 5.5+ | Type safety | - |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS | - |
| **UI Components** | shadcn/ui | Latest | Component library | Radix, Headless UI |
| **State Management** | Zustand | 5.x | Global state | Jotai, Redux Toolkit |
| **Data Fetching** | TanStack Query | 5.x | Server state | SWR |
| **Wallet Auth** | Dynamic.xyz | Latest SDK | Multi-chain wallet connection | Privy, Web3Modal |

### 1.5 Databases & Storage

| Component | Technology | Version | Purpose | Alternative Options |
|-----------|-----------|---------|---------|---------------------|
| **Primary Database** | Supabase (PostgreSQL) | Latest | Relational data + Auth + Realtime | Railway PostgreSQL |
| **Cache & Queue** | Upstash Redis | Serverless | Caching, BullMQ job queues | Railway Redis |
| **Vector Storage** | Qdrant Cloud | 1.11+ | Embeddings search | Pinecone, Weaviate |
| **IPFS Provider** | Pinata | Latest API | Decentralized file storage | NFT.Storage, Filebase |
| **IPFS Cache** | Cloudflare R2 | - | Fast IPFS content caching (S3-compatible) | - |
| **CDN** | Cloudflare | - | Content delivery, DDoS protection | - |

### 1.6 Infrastructure & Deployment

| Component | Technology | Purpose | Why This Choice |
|-----------|-----------|---------|-----------------|
| **Frontend Hosting** | Vercel | Next.js deployment | Best Next.js support, edge network |
| **Backend Hosting** | Railway | Node.js API + AI Service | WebSocket support, easy deploy |
| **Database** | Supabase | PostgreSQL + Auth + Realtime | All-in-one, generous free tier |
| **Cache/Queue** | Upstash | Redis + BullMQ queues | Serverless, pay-per-use |
| **Object Storage** | Cloudflare R2 | IPFS content cache | No egress fees, S3-compatible |
| **Vector DB** | Qdrant Cloud | Semantic search | Managed, scales well |
| **Solana RPC** | Helius (primary) | Blockchain access | Best Solana RPC provider |
| **Monitoring** | Sentry | Error tracking | Industry standard |
| **Analytics** | PostHog | Product analytics | Open source, self-hostable |

### 1.7 External APIs & Services

| Service | Purpose | Required Keys |
|---------|---------|---------------|
| OpenAI | GPT 5.2 Vision + Text LLM | `OPENAI_API_KEY` |
| Voyage AI | Embeddings (voyage-3.5) | `VOYAGE_API_KEY` |
| Dynamic.xyz | Wallet authentication | `DYNAMIC_ENVIRONMENT_ID` |
| Pinata | IPFS storage (upload) | `PINATA_API_KEY`, `PINATA_SECRET_KEY` |
| Cloudflare R2 | IPFS cache (read) | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| Supabase | Database + Auth | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Upstash | Redis + Queues | `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` |
| Helius | Solana RPC | `HELIUS_API_KEY` |
| Qdrant Cloud | Vector search | `QDRANT_URL`, `QDRANT_API_KEY` |

### 1.8 Background Job Queue (BullMQ via Upstash)

> AI analysis should NOT block post creation. Use background jobs for async processing.

| Queue | Purpose | Priority | Retry |
|-------|---------|----------|-------|
| `ai-analysis` | Image analysis after upload | Normal | 3x |
| `embedding-generation` | Generate + index embeddings | Normal | 3x |
| `feed-refresh` | Recompute user feeds | Low | 1x |
| `notification` | Send push/WebSocket notifications | High | 2x |
| `subscription-crank` | Process monthly subscriptions | Low | 5x |
| `sync-chain` | Sync on-chain data to DB | Normal | 3x |

**Job Flow for Post Creation:**
```
1. User uploads image → IPFS upload (sync, fast)
2. Return success to user immediately
3. Queue 'ai-analysis' job with { postId, contentUri }
4. Worker processes:
   - Call Claude Vision API
   - Generate embedding
   - Index in Qdrant
   - Update PostgreSQL with AI metadata
5. Queue 'notification' job to notify followers
```

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                 │
│                      (Next.js 15 + TypeScript + Vercel)                 │
├─────────────────────────────────────────────────────────────────────────┤
│  • Wallet Connection (Dynamic.xyz - multi-chain)                        │
│  • Content Feed (Infinite Scroll, Personalized)                         │
│  • Semantic Search ("cozy workspaces" → finds relevant images)          │
│  • Post Creation with AI Analysis Preview                               │
│  • Creator Dashboard (Earnings, Analytics)                              │
└─────────────────────────────────────────────────────────────────────────┘
                         ↕ REST API + Supabase Realtime
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API LAYER                                │
│                     (Node.js + Express + Railway)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  • RESTful API (all CRUD operations)                                    │
│  • BullMQ Workers (async AI processing)                                 │
│  • Auth Middleware (JWT + Dynamic.xyz verification)                     │
│  • Transaction Builder (Solana tx construction)                         │
│  • Cache Layer (Upstash Redis)                                          │
└─────────────────────────────────────────────────────────────────────────┘
     ↕              ↕                ↕                    ↕
┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌─────────────────────────┐
│ SOLANA   │  │ AI/ML     │  │ JOB QUEUE    │  │   DATA LAYER            │
│ CHAIN    │  │ SERVICE   │  │ (BullMQ)     │  │                         │
├──────────┤  ├───────────┤  ├──────────────┤  ├─────────────────────────┤
│Programs: │  │• Vision   │  │• ai-analysis │  │• Supabase (PostgreSQL)  │
│• Social  │  │  LLM      │  │• embeddings  │  │• Upstash (Redis cache)  │
│• Payment │  │• Embed    │  │• feed-refresh│  │• Qdrant (vectors)       │
│• TokenGt │  │• Search   │  │• notify      │  │• Pinata (IPFS upload)   │
│          │  │• Moderate │  │• sync-chain  │  │• R2 (IPFS cache/CDN)    │
└──────────┘  └───────────┘  └──────────────┘  └─────────────────────────┘
```

### 2.2 Content Delivery Flow (IPFS + R2 Caching)

```
User requests image
    → Cloudflare CDN checks cache
    → If miss: Check R2 bucket
        → If miss: Fetch from Pinata IPFS gateway
            → Store in R2 for future requests
            → Cache in Cloudflare edge
        → If hit: Return from R2
    → Return cached content

Benefits:
- Pinata: Pay for storage only (upload)
- R2: No egress fees (read-heavy workload)
- Cloudflare: Edge caching worldwide
- Result: Fast image loading, low costs
```

### 2.2 Data Flow Patterns

#### Post Creation Flow (With AI Guardrails)
```
STAGE 1 - GUARDRAIL CHECK (User waits ~2s, shows "Checking content..."):
┌─────────────────────────────────────────────────────────────────┐
│ 1. User uploads image → Frontend sends to Backend               │
│ 2. Backend stores in TEMP memory (NOT IPFS yet)                │
│ 3. Backend calls AI Service /api/moderate/check (SYNCHRONOUS)  │
│    └── Claude Vision safety scan (~1-2s)                       │
│ 4. AI returns safety verdict:                                   │
│    ├── SAFE → Continue to Stage 2                              │
│    ├── WARN → Continue with flag, add to review queue          │
│    └── BLOCK → Return error, delete temp file, LOG violation   │
└─────────────────────────────────────────────────────────────────┘
        │
        │ If BLOCKED: "Content violates community guidelines"
        │             → User cannot proceed
        │             → Image NEVER stored permanently
        │             → Violation logged for abuse tracking
        ▼
STAGE 2 - STORAGE (User waits ~1s):
┌─────────────────────────────────────────────────────────────────┐
│ 5. Backend uploads approved image to IPFS (Pinata)             │
│ 6. Cache in R2 for fast reads                                   │
│ 7. Create post record in Supabase (status: 'processing')        │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
STAGE 3 - BLOCKCHAIN (User waits ~2s):
┌─────────────────────────────────────────────────────────────────┐
│ 8. Backend builds Solana transaction (create_post)             │
│ 9. Frontend signs transaction with wallet                       │
│ 10. Backend submits to Solana                                   │
│ 11. Return success → Post shows with "Processing..." badge      │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
STAGE 4 - ASYNC ENRICHMENT (Background, no user wait):
┌─────────────────────────────────────────────────────────────────┐
│ 12. Queue 'ai-analysis' job → Full content analysis:           │
│     - Description, tags, mood, scene type                       │
│     - Generate embedding                                        │
│ 13. Queue 'embedding-index' → Index in Qdrant                  │
│ 14. Update Supabase (status: 'ready', add AI metadata)          │
│ 15. Supabase Realtime → UI removes "Processing..." badge        │
│ 16. Queue 'notification' → Notify followers                     │
└─────────────────────────────────────────────────────────────────┘

TOTAL USER WAIT: ~5s (2s guardrail + 1s upload + 2s blockchain)
vs WITHOUT GUARDRAIL: ~3s (but unsafe content could go live)
```

**Why This Design:**
- ✅ Unsafe content NEVER reaches IPFS or blockchain
- ✅ No "oops" moment where bad content is visible even briefly
- ✅ Similar to DALL-E/Midjourney blocking flow
- ✅ Violation logging enables abuse tracking
- ✅ 2s extra latency is acceptable for safety

#### Semantic Search Flow
```
User searches "cozy coffee shops"
    → Backend calls AI Service /api/search/semantic
    → AI Service:
        - Claude expands query ("images of warm cafe interiors, latte art...")
        - OpenAI generates query embedding
        - Qdrant vector similarity search
        - Claude re-ranks top results for relevance
    → Backend enriches with user/post data from PostgreSQL
    → Frontend displays results
```

#### Tip Payment Flow
```
User clicks "Tip $1"
    → Frontend calls Backend /api/payments/tip
    → Backend builds Solana transaction:
        - Transfer SOL from tipper to creator vault
        - Record tip in TipRecord account
    → Frontend signs transaction
    → Backend submits to Solana
    → On confirmation:
        - Update DB (tip count, earnings)
        - WebSocket notification to creator
        - Update UI
```

---

## 3. Module Breakdown & Dependencies

### 3.1 Module Dependency Graph

```
                    ┌─────────────────┐
                    │  Phase 5: DB    │
                    │  (PostgreSQL,   │
                    │   Redis, Qdrant)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Phase 1:     │  │  Phase 2:       │  │  Phase 3:       │
│  Solana       │  │  Backend API    │  │  AI/ML Service  │
│  Programs     │  │                 │  │                 │
└───────┬───────┘  └────────┬────────┘  └────────┬────────┘
        │                   │                    │
        └───────────────────┼────────────────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │  Phase 6:       │
                  │  Integration    │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Phase 4:       │
                  │  Frontend       │
                  └─────────────────┘
```

### 3.2 Parallel vs Sequential Execution

| Phase | Can Run In Parallel With | Must Wait For |
|-------|-------------------------|---------------|
| Phase 1 (Solana) | Phase 3, Phase 5 | Nothing |
| Phase 2 (Backend) | Phase 3 | Phase 5 (DB setup) |
| Phase 3 (AI/ML) | Phase 1, Phase 2 | Phase 5 (Qdrant setup) |
| Phase 4 (Frontend) | - | Phase 2, Phase 6 |
| Phase 5 (Database) | Phase 1 | Nothing |
| Phase 6 (Integration) | - | Phase 1, Phase 2, Phase 3 |

### 3.3 Recommended Agent Assignment

| Agent | Modules | Estimated Time |
|-------|---------|----------------|
| **Agent A** | Phase 1 (Solana Programs) | 2-3 days |
| **Agent B** | Phase 5 (Database) + Phase 2 (Backend) | 3-4 days |
| **Agent C** | Phase 3 (AI/ML Service) | 2-3 days |
| **Agent D** | Phase 4 (Frontend) | 3-4 days |
| **Coordinator** | Phase 6 (Integration) + Testing | 2-3 days |

---

## Phase 1: Solana Programs (On-Chain)

### 1.1 Overview

Build three Anchor programs that handle all on-chain logic:

| Program | Purpose | Key Accounts |
|---------|---------|--------------|
| **solshare_social** | User profiles, posts, follows, likes | UserProfile, Post, Follow, Like, Comment |
| **solshare_payment** | Tips, subscriptions, earnings | CreatorVault, TipRecord, Subscription |
| **solshare_token_gate** | NFT/token access control | AccessControl, AccessVerification |

### 1.2 Program 1: Social Program

**Program ID Seed:** `SoLSHr...` (generate on deployment)

#### Account Structures

**UserProfile**
| Field | Type | Size | Description |
|-------|------|------|-------------|
| authority | Pubkey | 32 | Owner wallet address |
| username | String | 4+32 | Unique username (max 32 chars) |
| bio | String | 4+256 | Profile bio |
| profile_image_uri | String | 4+200 | IPFS URI for avatar |
| follower_count | u64 | 8 | Total followers |
| following_count | u64 | 8 | Total following |
| post_count | u64 | 8 | Total posts created |
| created_at | i64 | 8 | Unix timestamp |
| is_verified | bool | 1 | Verification badge |
| bump | u8 | 1 | PDA bump seed |

**PDA Seeds:** `["profile", authority.key()]`

**Post**
| Field | Type | Size | Description |
|-------|------|------|-------------|
| creator | Pubkey | 32 | Creator's wallet |
| content_uri | String | 4+200 | IPFS URI for content |
| content_type | Enum | 1 | Image/Video/Text/Multi |
| caption | String | 4+2000 | Post caption |
| timestamp | i64 | 8 | Creation time |
| likes | u64 | 8 | Like count |
| comments | u64 | 8 | Comment count |
| tips_received | u64 | 8 | Total tips in lamports |
| is_token_gated | bool | 1 | Requires token access |
| required_token | Option<Pubkey> | 33 | Token mint for gating |
| bump | u8 | 1 | PDA bump seed |

**PDA Seeds:** `["post", creator.key(), post_count.to_le_bytes()]`

**Follow**
| Field | Type | Size |
|-------|------|------|
| follower | Pubkey | 32 |
| following | Pubkey | 32 |
| timestamp | i64 | 8 |
| bump | u8 | 1 |

**PDA Seeds:** `["follow", follower.key(), following.key()]`

**Like**
| Field | Type | Size |
|-------|------|------|
| user | Pubkey | 32 |
| post | Pubkey | 32 |
| timestamp | i64 | 8 |
| bump | u8 | 1 |

**PDA Seeds:** `["like", post.key(), user.key()]`

**Comment**
| Field | Type | Size |
|-------|------|------|
| post | Pubkey | 32 |
| commenter | Pubkey | 32 |
| text | String | 4+500 |
| timestamp | i64 | 8 |
| bump | u8 | 1 |

**PDA Seeds:** `["comment", post.key(), comment_count.to_le_bytes()]`

#### Instructions

| Instruction | Parameters | Required Accounts | Validations |
|-------------|------------|-------------------|-------------|
| `create_profile` | username, bio, profile_image_uri | profile (init), authority (signer), system_program | username ≤32 chars, bio ≤256 chars |
| `update_profile` | bio?, profile_image_uri? | profile (mut), authority (signer) | Must be owner |
| `create_post` | content_uri, content_type, caption, is_token_gated, required_token? | post (init), profile (mut), authority (signer) | caption ≤2000 chars |
| `like_post` | - | post (mut), like (init), user (signer) | Can't like own post |
| `unlike_post` | - | post (mut), like (close), user (signer) | Must have liked |
| `follow_user` | - | follow (init), follower_profile (mut), following_profile (mut), follower (signer) | Can't follow self |
| `unfollow_user` | - | follow (close), profiles (mut), follower (signer) | Must be following |
| `comment_post` | comment_text | post (mut), comment (init), commenter (signer) | comment ≤500 chars |

#### Events to Emit

```rust
ProfileCreated { authority, username, timestamp }
PostCreated { post, creator, content_uri, timestamp }
PostLiked { post, user, timestamp }
UserFollowed { follower, following, timestamp }
PostCommented { post, commenter, timestamp }
```

### 1.3 Program 2: Payment Program

**Program ID Seed:** `PAYMNt...`

#### Account Structures

**CreatorVault**
| Field | Type | Size | Description |
|-------|------|------|-------------|
| creator | Pubkey | 32 | Vault owner |
| total_earned | u64 | 8 | Lifetime earnings (lamports) |
| withdrawn | u64 | 8 | Total withdrawn |
| subscribers | u64 | 8 | Active subscriber count |
| bump | u8 | 1 | PDA bump |

**PDA Seeds:** `["vault", creator.key()]`

**TipRecord**
| Field | Type | Size |
|-------|------|------|
| from | Pubkey | 32 |
| to | Pubkey | 32 |
| amount | u64 | 8 |
| post | Option<Pubkey> | 33 |
| timestamp | i64 | 8 |
| bump | u8 | 1 |

**PDA Seeds:** `["tip", tipper.key(), timestamp.to_le_bytes()]`

**Subscription**
| Field | Type | Size |
|-------|------|------|
| subscriber | Pubkey | 32 |
| creator | Pubkey | 32 |
| amount_per_month | u64 | 8 |
| last_payment | i64 | 8 |
| started_at | i64 | 8 |
| is_active | bool | 1 |
| bump | u8 | 1 |

**PDA Seeds:** `["subscription", subscriber.key(), creator.key()]`

#### Instructions

| Instruction | Parameters | Description |
|-------------|------------|-------------|
| `initialize_vault` | - | Create creator vault (once per creator) |
| `tip_creator` | amount, post? | Transfer SOL to vault, record tip |
| `subscribe` | amount_per_month | Create subscription, make first payment |
| `process_subscription` | - | Process monthly payment (crank) |
| `cancel_subscription` | - | Deactivate subscription |
| `withdraw` | amount | Creator withdraws from vault |

#### Payment Logic

- Tips: Direct transfer from tipper to creator vault
- Platform fee: 2% (configurable, stored in program config)
- Subscriptions: Renewable every 30 days via crank
- Withdrawals: Instant, no lockup period

### 1.4 Program 3: Token-Gate Program

**Program ID Seed:** `TKNGt...`

#### Account Structures

**AccessControl**
| Field | Type | Size |
|-------|------|------|
| post | Pubkey | 32 |
| creator | Pubkey | 32 |
| required_token | Option<Pubkey> | 33 |
| minimum_balance | u64 | 8 |
| required_nft_collection | Option<Pubkey> | 33 |
| bump | u8 | 1 |

**PDA Seeds:** `["access", post.key()]`

**AccessVerification**
| Field | Type | Size |
|-------|------|------|
| user | Pubkey | 32 |
| post | Pubkey | 32 |
| verified | bool | 1 |
| verified_at | i64 | 8 |
| bump | u8 | 1 |

**PDA Seeds:** `["verification", user.key(), post.key()]`

#### Instructions

| Instruction | Parameters |
|-------------|------------|
| `set_access_requirements` | required_token?, minimum_balance?, required_nft_collection? |
| `verify_token_access` | - (checks user's token account) |
| `verify_nft_access` | - (checks NFT ownership via Metaplex) |

### 1.5 File Structure

```
programs/
├── solshare-social/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs              # Program entry, instructions
│       ├── state.rs            # Account structures
│       ├── context.rs          # Instruction contexts
│       ├── error.rs            # Custom errors
│       └── events.rs           # Event definitions
├── solshare-payment/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── state.rs
│       ├── context.rs
│       └── error.rs
└── solshare-token-gate/
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        ├── state.rs
        └── context.rs

tests/
├── social.ts
├── payment.ts
└── token-gate.ts

Anchor.toml
```

### 1.6 Deployment Steps

1. Build programs: `anchor build`
2. Deploy to devnet: `anchor deploy --provider.cluster devnet`
3. Store program IDs in environment variables
4. Run test suite: `anchor test`
5. Export IDL files to backend: `cp target/idl/*.json ../backend/idl/`

---

## Phase 2: Backend API

### 2.1 Overview

Node.js/Express server handling:
- REST API for all operations
- BullMQ workers for async processing (AI analysis, notifications)
- Supabase Realtime for live updates (replaces custom WebSocket)
- Solana transaction building
- IPFS integration (Pinata upload, R2 caching)
- AI service orchestration
- Caching (Upstash Redis) and rate limiting

### 2.2 File Structure

```
backend/
├── src/
│   ├── index.ts                    # API server entry point
│   ├── worker.ts                   # BullMQ worker entry point (separate process)
│   ├── config/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── redis.ts                # Upstash Redis + BullMQ connection
│   │   ├── solana.ts               # Solana connection + programs
│   │   ├── r2.ts                   # Cloudflare R2 client (S3 SDK)
│   │   └── env.ts                  # Environment validation (zod)
│   ├── middleware/
│   │   ├── auth.ts                 # JWT + Dynamic.xyz verification
│   │   ├── errorHandler.ts         # Global error handling
│   │   ├── rateLimiter.ts          # Rate limiting per wallet (Upstash)
│   │   └── validation.ts           # Request validation (zod)
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── posts.routes.ts
│   │   ├── feed.routes.ts
│   │   ├── payments.routes.ts
│   │   ├── search.routes.ts
│   │   └── access.routes.ts
│   ├── controllers/
│   │   └── [corresponding controllers]
│   ├── services/
│   │   ├── solana.service.ts       # Transaction building
│   │   ├── ipfs.service.ts         # Pinata upload + R2 caching
│   │   ├── ai.service.ts           # AI service HTTP client
│   │   ├── cache.service.ts        # Upstash Redis caching
│   │   └── realtime.service.ts     # Supabase Realtime broadcasts
│   ├── jobs/                       # BullMQ job processors
│   │   ├── queues.ts               # Queue definitions
│   │   ├── ai-analysis.job.ts      # Process AI analysis
│   │   ├── embedding.job.ts        # Index embeddings in Qdrant
│   │   ├── notification.job.ts     # Send notifications
│   │   ├── feed-refresh.job.ts     # Recompute personalized feeds
│   │   └── sync-chain.job.ts       # Sync on-chain data
│   ├── models/
│   │   └── [TypeScript interfaces]
│   ├── utils/
│   │   ├── logger.ts               # Structured logging (pino)
│   │   └── helpers.ts
│   └── types/
│       └── index.d.ts
├── idl/                            # Solana program IDLs (from Phase 1)
├── tests/
├── package.json
├── tsconfig.json
├── Procfile                        # For Railway: web + worker processes
└── .env.example
```

### 2.3 Process Architecture (Railway)

```
Railway Service: solshare-backend
├── Web Process (npm run start:api)
│   └── Express server on port 3001
│       - REST API endpoints
│       - Rate limiting
│       - Queue job producers
│
└── Worker Process (npm run start:worker)
    └── BullMQ worker
        - Consumes jobs from queues
        - Calls AI service
        - Updates Supabase
        - Broadcasts via Realtime
```

**Procfile:**
```
web: npm run start:api
worker: npm run start:worker
```

### 2.3 API Endpoint Specification

#### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/challenge` | Generate signing challenge | No |
| POST | `/api/auth/verify` | Verify signature, return JWT | No |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes |

**Challenge Flow:**
1. Frontend requests challenge with wallet address
2. Backend generates unique message with timestamp + nonce
3. User signs message with wallet
4. Backend verifies signature matches wallet
5. Backend issues JWT (7-day expiry)

#### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/:wallet` | Get user profile | No |
| POST | `/api/users/profile` | Create/update profile (returns unsigned tx) | Yes |
| GET | `/api/users/:wallet/posts` | Get user's posts (paginated) | No |
| GET | `/api/users/:wallet/followers` | Get followers list | No |
| GET | `/api/users/:wallet/following` | Get following list | No |
| POST | `/api/users/:wallet/follow` | Follow user (returns unsigned tx) | Yes |
| DELETE | `/api/users/:wallet/follow` | Unfollow user (returns unsigned tx) | Yes |

#### Posts

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/posts/upload` | **Guardrail check** + Upload to IPFS (blocks unsafe content) | Yes |
| POST | `/api/posts/create` | Create post (returns unsigned tx + AI analysis) | Yes |
| GET | `/api/posts/:postId` | Get single post | No |
| POST | `/api/posts/:postId/like` | Like post (returns unsigned tx) | Yes |
| DELETE | `/api/posts/:postId/like` | Unlike post (returns unsigned tx) | Yes |
| GET | `/api/posts/:postId/comments` | Get post comments | No |
| POST | `/api/posts/:postId/comments` | Add comment (returns unsigned tx) | Yes |
| POST | `/api/posts/:postId/report` | Report post for review | Yes |

**Upload Endpoint Detail (`/api/posts/upload`):**
```
1. Receive image file
2. Check wallet restriction level → may reject immediately
3. Check image hash against blocked_content_hashes → instant block if match
4. Call AI moderation check (synchronous, ~2s)
   - If blocked: Return 400 with violation details, log violation
   - If warn: Continue but flag for review
   - If allow: Continue
5. Upload to IPFS (Pinata)
6. Cache in R2
7. Return { contentUri, moderationResult }
```

#### Feed

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/feed` | Get personalized feed (AI-ranked) | Yes |
| GET | `/api/feed/explore` | Get explore/trending feed | No |
| GET | `/api/feed/following` | Get chronological following feed | Yes |
| GET | `/api/feed/trending` | Get trending posts | No |

**Query Parameters:**
- `limit`: Number of posts (default: 20, max: 50)
- `cursor`: Pagination cursor (timestamp or post ID)

#### Payments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/payments/tip` | Create tip transaction | Yes |
| POST | `/api/payments/subscribe` | Create subscription transaction | Yes |
| DELETE | `/api/payments/subscribe/:creator` | Cancel subscription | Yes |
| GET | `/api/payments/earnings` | Get creator earnings | Yes |
| POST | `/api/payments/withdraw` | Withdraw earnings transaction | Yes |

#### Search

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/search/semantic` | Semantic search (AI-powered) | No |
| GET | `/api/search/suggest` | Search autocomplete | No |
| GET | `/api/search/users` | Search users by username | No |

#### Access (Token-Gating)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/access/verify` | Check if user has access to post | Yes |
| POST | `/api/access/requirements` | Set post access requirements | Yes |

### 2.4 Transaction Building Pattern

All write operations return **unsigned transactions** for frontend signing:

```typescript
// Response format for transaction endpoints
interface TransactionResponse {
  transaction: string;        // Base64 serialized unsigned tx
  blockhash: string;          // Recent blockhash used
  lastValidBlockHeight: number;
  metadata?: {                // Additional info for UI
    postId?: string;
    aiAnalysis?: AIAnalysis;
  };
}

// Frontend flow:
// 1. Call API endpoint
// 2. Receive unsigned transaction
// 3. Sign with wallet (Dynamic.xyz)
// 4. Submit to /api/transactions/submit OR directly to Solana
```

### 2.5 Caching Strategy

| Data | Cache Key | TTL | Invalidation |
|------|-----------|-----|--------------|
| User profiles | `user:{wallet}` | 5 min | On profile update |
| Hot posts | `post:{postId}` | 1 hour | On like/comment |
| User feed | `feed:{wallet}` | 30 sec | On new follow/post |
| Social graph | `following:{wallet}` | 5 min | On follow/unfollow |
| IPFS content | CDN | 24 hours | Never (content-addressed) |

### 2.6 Rate Limiting

| Endpoint Category | Authenticated | Unauthenticated |
|-------------------|---------------|-----------------|
| GET requests | 1000/hour | 100/hour |
| POST requests | 100/hour | N/A |
| Upload | 50/hour | N/A |
| Search | 200/hour | 50/hour |

---

## Phase 3: AI/ML Service

### 3.1 Overview

Python/FastAPI microservice handling all AI operations:
- Vision LLM content analysis
- Embedding generation
- Semantic search
- Content recommendations
- Content moderation

### 3.2 File Structure

```
ai-service/
├── app/
│   ├── main.py                     # FastAPI entry point
│   ├── config.py                   # Settings (pydantic-settings)
│   ├── api/
│   │   └── routes/
│   │       ├── analyze.py          # Content analysis
│   │       ├── search.py           # Semantic search
│   │       ├── recommend.py        # Recommendations
│   │       └── moderate.py         # Content moderation
│   ├── services/
│   │   ├── llm.py                  # Claude API client
│   │   ├── embeddings.py           # OpenAI embeddings
│   │   ├── vector_db.py            # Qdrant operations
│   │   ├── content_analyzer.py     # Analysis orchestration
│   │   ├── semantic_search.py      # Search logic
│   │   ├── recommender.py          # Recommendation engine
│   │   └── moderator.py            # Moderation logic
│   ├── models/
│   │   └── schemas.py              # Pydantic models
│   └── utils/
│       └── image.py                # Image processing
├── requirements.txt
├── Dockerfile
└── .env.example
```

### 3.3 API Endpoints

#### Content Analysis

**POST `/api/analyze/content`**

Analyzes uploaded content using Vision LLM.

Request:
```json
{
  "content_uri": "ipfs://Qm...",
  "caption": "My morning coffee",
  "post_id": "optional_for_indexing",
  "creator_wallet": "optional_for_indexing"
}
```

Response:
```json
{
  "description": "A cozy coffee shop interior with warm lighting...",
  "tags": ["coffee", "cafe", "cozy", "morning", "productivity"],
  "scene_type": "indoor_commercial",
  "objects": ["coffee cup", "laptop", "wooden table"],
  "mood": "calm, focused, comfortable",
  "colors": ["warm brown", "amber", "cream"],
  "safety_score": 10,
  "alt_text": "Interior of a coffee shop with morning light...",
  "embedding": [0.123, -0.456, ...]  // 3072-dim vector
}
```

**Implementation Flow:**
1. Download image from IPFS (convert ipfs:// to gateway URL)
2. Call Claude Vision with structured analysis prompt
3. Generate embedding from `description + caption` using OpenAI
4. If post_id provided, index in Qdrant
5. Return combined analysis

#### Semantic Search

**POST `/api/search/semantic`**

Netflix-style search by meaning.

Request:
```json
{
  "query": "cozy workspaces",
  "limit": 50,
  "rerank": true
}
```

Response:
```json
{
  "results": [
    {
      "post_id": "abc123",
      "score": 0.92,
      "description": "A minimalist home office setup...",
      "creator_wallet": "wallet123"
    }
  ],
  "expanded_query": "Images showing comfortable work environments, home offices with natural light..."
}
```

**Implementation Flow:**
1. **Query Expansion**: Claude expands "cozy workspaces" → detailed visual description
2. **Embedding**: Generate embedding for expanded query
3. **Vector Search**: Qdrant similarity search (top 100 candidates)
4. **Re-ranking** (if enabled): Claude scores relevance of top candidates
5. Return ranked results

#### Recommendations

**POST `/api/recommend/feed`**

Get personalized recommendations based on user taste.

Request:
```json
{
  "user_wallet": "wallet123",
  "limit": 50,
  "exclude_seen": ["postId1", "postId2"]
}
```

**Implementation Flow:**
1. Fetch user's recent interactions from Backend API
2. Get descriptions of liked posts
3. Claude builds "taste profile" from liked content
4. Generate embedding for taste profile
5. Vector search for matching content
6. Apply diversity (no same creator repeatedly)
7. Return recommendations

#### Content Moderation (Guardrail)

> ⚠️ **CRITICAL:** This endpoint is SYNCHRONOUS and BLOCKING. It runs BEFORE content is stored.
> This is the guardrail that prevents unsafe content from ever going live.

**POST `/api/moderate/check`**

Pre-upload safety check. Called with raw image data (not IPFS URI).

Request:
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ...",
  "caption": "Check this out!",
  "wallet": "user-wallet-address"  // For rate limiting bad actors
}
```

Response (SAFE):
```json
{
  "verdict": "allow",
  "scores": {
    "nsfw": 0.5,
    "violence": 0.2,
    "hate": 0.0,
    "child_safety": 0.0,
    "spam": 1.8,
    "drugs_weapons": 0.1
  },
  "max_score": 1.8,
  "explanation": "Content appears safe. Minor promotional language detected.",
  "processing_time_ms": 1847
}
```

Response (BLOCKED):
```json
{
  "verdict": "block",
  "scores": {
    "nsfw": 8.5,
    "violence": 0.2,
    "hate": 0.0,
    "child_safety": 0.0,
    "spam": 0.5,
    "drugs_weapons": 0.1
  },
  "max_score": 8.5,
  "blocked_category": "nsfw",
  "explanation": "Content contains nudity which violates community guidelines.",
  "processing_time_ms": 1523,
  "violation_id": "viol_abc123"  // For appeals
}
```

**Verdict Logic:**
```python
def determine_verdict(scores: dict) -> str:
    thresholds = {
        "nsfw": 7,
        "violence": 6,
        "hate": 5,
        "child_safety": 3,  # Strictest
        "spam": 7,
        "drugs_weapons": 6
    }
    
    for category, score in scores.items():
        if score > thresholds.get(category, 5):
            return "block"
    
    # Check for borderline content (warn)
    if any(score > threshold * 0.6 for category, score in scores.items()):
        return "warn"
    
    return "allow"
```

**POST `/api/moderate/check-hash`**

Quick check against known bad content database (before full AI check).

Request:
```json
{
  "image_hash": "phash_abc123..."  // Perceptual hash
}
```

Response:
```json
{
  "known_bad": true,
  "reason": "Previously blocked for NSFW content",
  "blocked_at": "2025-01-01T00:00:00Z"
}
```

**Performance Requirements:**
| Endpoint | Target Latency | Why |
|----------|---------------|-----|
| `/check-hash` | <100ms | Database lookup only |
| `/check` | <2500ms | Claude Vision API call |

**Rate Limiting for Violators:**
```
Wallet with violations in last 24h:
- 0 violations: Normal rate (50 uploads/hour)
- 1 violation: 10 uploads/hour
- 2 violations: 2 uploads/hour
- 3+ violations: 0 uploads (24h cooldown)
```

### 3.4 Vector Database Schema

**Collection:** `solshare_posts`

| Field | Type | Indexed |
|-------|------|---------|
| id | string (post_id) | Primary |
| vector | float[3072] | HNSW index |
| creator_wallet | string | Filterable |
| description | string | Payload |
| caption | string | Payload |
| tags | string[] | Payload |
| scene_type | string | Filterable |
| mood | string | Payload |
| timestamp | int | Filterable |

### 3.5 LLM Prompts (Key Templates)

**Content Analysis Prompt:**
```
Analyze this image in detail for social media indexing.

Provide a comprehensive analysis in JSON format:
{
  "description": "2-3 sentence description of what's in the image",
  "tags": ["tag1", "tag2", ...] (5-10 relevant tags),
  "scene_type": "indoor/outdoor/urban/nature/etc",
  "objects": ["main objects visible"],
  "mood": "emotional tone/atmosphere",
  "colors": ["dominant colors"],
  "safety_score": 0-10 (0=unsafe, 10=safe),
  "alt_text": "accessibility description"
}
```

**Query Expansion Prompt:**
```
Analyze this search query and describe what visual content would match it.

Query: "{query}"

Describe the types of images that would satisfy this search. Include:
- Main subjects
- Settings/environments
- Mood/atmosphere
- Related concepts
- Visual elements

Be specific and comprehensive in 2-3 sentences.
```

---

## Phase 4: Frontend Application

### 4.1 Overview

Next.js 15 application with:
- Dynamic.xyz wallet integration
- Infinite scroll feeds
- Semantic search UI
- Post creation with AI preview
- Real-time notifications
- Creator dashboard

### 4.2 File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (providers)
│   │   ├── page.tsx                # Home (personalized feed)
│   │   ├── explore/page.tsx        # Explore feed
│   │   ├── search/page.tsx         # Search results
│   │   ├── create/page.tsx         # Create post
│   │   ├── profile/[wallet]/page.tsx
│   │   ├── post/[id]/page.tsx
│   │   └── dashboard/page.tsx      # Creator earnings
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── post/
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostFeed.tsx
│   │   │   ├── CreatePost.tsx
│   │   │   ├── TipModal.tsx
│   │   │   └── PostDetail.tsx
│   │   ├── user/
│   │   │   ├── ProfileCard.tsx
│   │   │   ├── FollowButton.tsx
│   │   │   └── UserAvatar.tsx
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── wallet/
│   │   │   └── ConnectButton.tsx
│   │   └── ui/                     # shadcn/ui components
│   ├── lib/
│   │   ├── api.ts                  # Axios client
│   │   ├── solana.ts               # Transaction helpers
│   │   ├── dynamic.ts              # Dynamic.xyz config
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useFeed.ts
│   │   ├── usePost.ts
│   │   ├── useSearch.ts
│   │   └── useWallet.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── notificationStore.ts
│   └── types/
│       └── index.ts
├── public/
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### 4.3 Key Pages

| Route | Purpose | Data Requirements |
|-------|---------|-------------------|
| `/` | Personalized feed (requires auth) | `GET /api/feed` |
| `/explore` | Trending/explore feed | `GET /api/feed/explore` |
| `/search?q=` | Search results | `POST /api/search/semantic` |
| `/create` | Post creation form | Auth required |
| `/profile/[wallet]` | User profile | `GET /api/users/:wallet` |
| `/post/[id]` | Post detail + comments | `GET /api/posts/:postId` |
| `/dashboard` | Creator earnings | `GET /api/payments/earnings` |

### 4.4 Key Components

**PostCard Requirements:**
- Display image from IPFS (via gateway)
- Show creator avatar, username, timestamp
- Like button with optimistic update
- Comment count link
- Tip button (opens modal)
- Share button
- Token-gated badge if applicable
- AI-generated tags (clickable for search)

**SearchBar Requirements:**
- Debounced input (300ms)
- Suggestions dropdown as user types
- Semantic search hint in placeholder
- Enter to search, click suggestion to navigate

**CreatePost Requirements:**
- Drag-and-drop image upload
- Caption textarea (2000 char limit)
- Token-gate toggle
- Preview of AI analysis after upload
- Submit: upload → analyze → create tx → sign → submit
- Loading states for each step

### 4.5 State Management

**Auth Store (Zustand):**
```typescript
interface AuthState {
  isAuthenticated: boolean;
  wallet: string | null;
  token: string | null;
  user: UserProfile | null;
  login: (wallet: string, token: string) => void;
  logout: () => void;
}
```

**Notification Store:**
```typescript
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markRead: (id: string) => void;
}
```

### 4.6 Dynamic.xyz Integration

```typescript
// Configuration
const dynamicConfig = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  walletConnectors: [
    SolanaWalletConnectors,
    EthereumWalletConnectors,  // Future multi-chain
  ],
  eventsCallbacks: {
    onAuthSuccess: async ({ user, primaryWallet }) => {
      // Get JWT from backend
      const challenge = await api.auth.getChallenge(primaryWallet.address);
      const signature = await primaryWallet.signMessage(challenge.message);
      const { token } = await api.auth.verify(primaryWallet.address, signature);
      authStore.login(primaryWallet.address, token);
    },
    onLogout: () => {
      authStore.logout();
    },
  },
};
```

### 4.7 Design Requirements

**Aesthetic Direction:**
- Clean, modern Instagram-inspired layout
- Dark mode support
- Card-based feed with subtle shadows
- Smooth animations (Framer Motion for page transitions)
- Mobile-first responsive design

**Color Palette:**
- Primary: Solana gradient (#9945FF → #14F195)
- Background: Neutral grays
- Accent: Bright interactions

---

## Phase 5: Database & Storage

### 5.1 Supabase Setup

> Supabase provides PostgreSQL + Auth + Realtime + Storage in one platform.

**Project Setup:**
1. Create project at [supabase.com](https://supabase.com)
2. Enable required extensions via SQL Editor
3. Create tables using migration below
4. Set up Row Level Security (RLS) policies
5. Configure Realtime for `posts`, `likes`, `comments`, `follows` tables

**Environment Variables from Supabase Dashboard:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...          # Public, safe for frontend
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Private, backend only
```

### 5.2 PostgreSQL Schema (Supabase)

```sql
-- Enable extensions (run in SQL Editor)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For fallback embeddings

-- Users (cache of on-chain profiles)
CREATE TABLE users (
    wallet VARCHAR(44) PRIMARY KEY,
    username VARCHAR(32) UNIQUE,
    bio TEXT,
    profile_image_uri TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_wallet CHECK (LENGTH(wallet) BETWEEN 32 AND 44)
);

CREATE INDEX idx_users_username ON users(username);

-- Posts (cache + AI metadata)
CREATE TABLE posts (
    id VARCHAR(44) PRIMARY KEY,  -- On-chain post account address
    creator_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    content_uri TEXT NOT NULL,
    content_type VARCHAR(10) DEFAULT 'image',
    caption TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    tips_received BIGINT DEFAULT 0,  -- In lamports
    is_token_gated BOOLEAN DEFAULT FALSE,
    required_token VARCHAR(44),
    
    -- AI-generated metadata
    llm_description TEXT,
    auto_tags TEXT[],
    scene_type VARCHAR(50),
    mood VARCHAR(100),
    safety_score FLOAT,
    alt_text TEXT,
    
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_content_type CHECK (content_type IN ('image', 'video', 'text', 'multi'))
);

CREATE INDEX idx_posts_creator ON posts(creator_wallet);
CREATE INDEX idx_posts_timestamp ON posts(timestamp DESC);
CREATE INDEX idx_posts_token_gated ON posts(is_token_gated) WHERE is_token_gated = TRUE;

-- Follows (cache)
CREATE TABLE follows (
    follower_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    following_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_wallet, following_wallet),
    
    CONSTRAINT no_self_follow CHECK (follower_wallet != following_wallet)
);

CREATE INDEX idx_follows_following ON follows(following_wallet);

-- Likes (cache)
CREATE TABLE likes (
    user_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    post_id VARCHAR(44) NOT NULL REFERENCES posts(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_wallet, post_id)
);

CREATE INDEX idx_likes_post ON likes(post_id);

-- Comments (cache)
CREATE TABLE comments (
    id VARCHAR(44) PRIMARY KEY,
    post_id VARCHAR(44) NOT NULL REFERENCES posts(id),
    commenter_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id, timestamp DESC);

-- User interactions (for ML - off-chain only)
CREATE TABLE interactions (
    id SERIAL PRIMARY KEY,
    user_wallet VARCHAR(44) NOT NULL,
    post_id VARCHAR(44) NOT NULL,
    interaction_type VARCHAR(20) NOT NULL,  -- view, like, comment, tip, skip
    dwell_time_seconds FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON interactions(user_wallet, timestamp DESC);
CREATE INDEX idx_interactions_type ON interactions(interaction_type);

-- User taste profiles (ML-generated)
CREATE TABLE user_taste_profiles (
    wallet VARCHAR(44) PRIMARY KEY REFERENCES users(wallet),
    taste_description TEXT,
    preferences JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed cache (pre-computed personalized feeds)
CREATE TABLE feed_cache (
    user_wallet VARCHAR(44) NOT NULL,
    post_id VARCHAR(44) NOT NULL,
    score FLOAT NOT NULL,
    position INTEGER NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_wallet, post_id)
);

CREATE INDEX idx_feed_cache_expiry ON feed_cache(expires_at);

-- Transaction history (off-chain index)
CREATE TABLE transactions (
    signature VARCHAR(88) PRIMARY KEY,
    type VARCHAR(20) NOT NULL,  -- tip, subscribe, post, follow, like
    from_wallet VARCHAR(44),
    to_wallet VARCHAR(44),
    amount BIGINT,  -- In lamports
    post_id VARCHAR(44),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending'  -- pending, confirmed, failed
);

CREATE INDEX idx_transactions_from ON transactions(from_wallet, timestamp DESC);
CREATE INDEX idx_transactions_to ON transactions(to_wallet, timestamp DESC);

-- ============================================
-- CONTENT MODERATION TABLES (AI Guardrails)
-- ============================================

-- Content violations log
CREATE TABLE content_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet VARCHAR(44) NOT NULL,
    violation_type VARCHAR(20) NOT NULL,  -- nsfw, violence, hate, child_safety, spam
    severity_score FLOAT NOT NULL,
    image_hash VARCHAR(64),  -- Perceptual hash for deduplication
    explanation TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Appeal handling
    appeal_status VARCHAR(20) DEFAULT 'none',  -- none, pending, approved, denied
    appeal_reason TEXT,
    reviewed_by VARCHAR(44),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_violations_wallet ON content_violations(wallet, timestamp DESC);
CREATE INDEX idx_violations_type ON content_violations(violation_type);
CREATE INDEX idx_violations_appeal ON content_violations(appeal_status) WHERE appeal_status = 'pending';

-- Known bad content hashes (instant block list)
CREATE TABLE blocked_content_hashes (
    image_hash VARCHAR(64) PRIMARY KEY,  -- Perceptual hash
    reason VARCHAR(20) NOT NULL,
    original_violation_id UUID REFERENCES content_violations(id),
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_by VARCHAR(20) DEFAULT 'system'  -- system, manual, user_report
);

-- Wallet restrictions (repeat offenders)
CREATE TABLE wallet_restrictions (
    wallet VARCHAR(44) PRIMARY KEY,
    restriction_level INTEGER DEFAULT 0,  -- 0=none, 1=limited, 2=restricted, 3=banned
    violation_count INTEGER DEFAULT 0,
    last_violation_at TIMESTAMP WITH TIME ZONE,
    restriction_until TIMESTAMP WITH TIME ZONE,  -- NULL for permanent
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User reports (community moderation)
CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_wallet VARCHAR(44) NOT NULL,
    reported_content_id VARCHAR(44),  -- Post ID
    reported_wallet VARCHAR(44),  -- User being reported
    reason VARCHAR(50) NOT NULL,  -- nsfw, spam, harassment, other
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, reviewed, actioned, dismissed
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON user_reports(status) WHERE status = 'pending';
CREATE INDEX idx_reports_content ON user_reports(reported_content_id);

-- Function to check wallet restriction status
CREATE OR REPLACE FUNCTION get_wallet_upload_limit(wallet_address VARCHAR(44))
RETURNS INTEGER AS $$
DECLARE
    restriction_level INTEGER;
    recent_violations INTEGER;
BEGIN
    -- Get restriction level
    SELECT COALESCE(wr.restriction_level, 0)
    INTO restriction_level
    FROM wallet_restrictions wr
    WHERE wr.wallet = wallet_address
    AND (wr.restriction_until IS NULL OR wr.restriction_until > NOW());
    
    -- Count recent violations (last 24h)
    SELECT COUNT(*)
    INTO recent_violations
    FROM content_violations cv
    WHERE cv.wallet = wallet_address
    AND cv.timestamp > NOW() - INTERVAL '24 hours';
    
    -- Return upload limit per hour
    CASE
        WHEN restriction_level >= 3 THEN RETURN 0;  -- Banned
        WHEN restriction_level = 2 OR recent_violations >= 3 THEN RETURN 2;
        WHEN restriction_level = 1 OR recent_violations >= 2 THEN RETURN 10;
        WHEN recent_violations >= 1 THEN RETURN 25;
        ELSE RETURN 50;  -- Normal limit
    END CASE;
END;
$$ LANGUAGE plpgsql;
```

### 5.3 Upstash Redis (Cache + Queues)

> Upstash provides serverless Redis with BullMQ support. Pay per request, scales to zero.

**Setup:**
1. Create Redis database at [upstash.com](https://upstash.com)
2. Copy REST URL and Token to environment

**Environment Variables:**
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

**Cache Key Patterns:**

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `user:{wallet}` | User profile JSON | 5 min |
| `post:{postId}` | Post data JSON | 1 hour |
| `feed:{wallet}` | Cached feed post IDs | 30 sec |
| `following:{wallet}` | Set of following wallets | 5 min |
| `auth:challenge:{wallet}` | Sign-in challenge | 5 min |
| `ratelimit:{wallet}:{endpoint}` | Rate limit counter | 1 hour |

**BullMQ Queues (same Redis):**

| Queue Name | Purpose |
|------------|---------|
| `bull:ai-analysis` | AI content analysis jobs |
| `bull:embedding` | Vector embedding jobs |
| `bull:notification` | Notification delivery |
| `bull:feed-refresh` | Feed recomputation |
| `bull:sync-chain` | On-chain data sync |

### 5.4 Cloudflare R2 (IPFS Cache)

> R2 is S3-compatible object storage with **zero egress fees**. Perfect for caching IPFS content.

**Setup:**
1. Create R2 bucket in Cloudflare dashboard
2. Enable public access or use Workers for auth
3. Set up custom domain (e.g., `cdn.solshare.app`)

**Environment Variables:**
```bash
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=solshare-content
R2_PUBLIC_URL=https://cdn.solshare.app
```

**Caching Logic:**
```
Request: GET /content/{ipfsHash}

1. Check R2: GET r2://solshare-content/{ipfsHash}
   - If exists: Return from R2 (fast, free egress)
   - If not: Continue to step 2

2. Fetch from Pinata: GET https://gateway.pinata.cloud/ipfs/{ipfsHash}
   - Store in R2 for future requests
   - Return content

3. Set Cloudflare cache headers (24h TTL)
```

**R2 Bucket Structure:**
```
solshare-content/
├── images/
│   ├── {ipfsHash1}
│   ├── {ipfsHash2}
│   └── ...
├── thumbnails/           # Generated thumbnails
│   ├── {ipfsHash1}_thumb
│   └── ...
└── metadata/             # Cached AI analysis JSON
    ├── {ipfsHash1}.json
    └── ...
```

### 5.5 Qdrant Collection Setup

```python
# Collection creation
client.create_collection(
    collection_name="solshare_posts",
    vectors_config=VectorParams(
        size=3072,  # OpenAI text-embedding-3-large
        distance=Distance.COSINE
    )
)

# Create payload indexes
client.create_payload_index(
    collection_name="solshare_posts",
    field_name="creator_wallet",
    field_schema=PayloadSchemaType.KEYWORD
)

client.create_payload_index(
    collection_name="solshare_posts",
    field_name="scene_type",
    field_schema=PayloadSchemaType.KEYWORD
)

client.create_payload_index(
    collection_name="solshare_posts",
    field_name="timestamp",
    field_schema=PayloadSchemaType.INTEGER
)
```

---

## Phase 6: Integration & Real-Time

### 6.1 WebSocket Events

**Server → Client:**
| Event | Payload | Trigger |
|-------|---------|---------|
| `post:new` | Post object | New post in followed feed |
| `post:liked` | { postId, userId } | Someone liked your post |
| `tip:received` | { from, amount, postId } | Someone tipped you |
| `follow:new` | { follower } | New follower |
| `comment:new` | Comment object | New comment on your post |

**Client → Server:**
| Event | Payload | Purpose |
|-------|---------|---------|
| `subscribe:feed` | - | Join global feed room |
| `unsubscribe:feed` | - | Leave global feed room |
| `mark:seen` | { postIds } | Mark posts as seen |

### 6.2 Integration Points

**Backend ↔ AI Service:**
- HTTP calls for analysis, search, recommendations
- Async processing for non-blocking operations
- Retry logic with exponential backoff

**Backend ↔ Solana:**
- Read program accounts for profile/post data
- Build unsigned transactions
- Submit signed transactions
- Listen to program events (optional webhooks)

**Backend ↔ Database:**
- Write-through cache pattern
- Eventual consistency with on-chain (sync jobs)
- Optimistic updates for UX

---

## Security Requirements

### Smart Contract Security
- [ ] Reentrancy protection on all payment functions
- [ ] Integer overflow/underflow checks (Anchor handles)
- [ ] Authority checks on all state mutations
- [ ] Rate limiting via account creation costs
- [ ] Emergency pause functionality (admin key)

### API Security
- [ ] JWT authentication with 7-day expiry
- [ ] Wallet signature verification on login
- [ ] Rate limiting per wallet address
- [ ] Input validation with Zod schemas
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (Content-Security-Policy headers)
- [ ] CORS restricted to frontend domain

### Content Security (AI Guardrails)

> **Critical:** Content is checked BEFORE it goes live. Unsafe content never reaches IPFS or the blockchain.
> This is similar to how DALL-E/Midjourney block unsafe content before showing results.

**Pre-Upload Guardrail Flow:**
```
User uploads image
    ↓
[STAGE 1: Client-side validation]
- File type check (jpg, png, gif, webp only)
- File size check (< 50MB)
- Basic NSFW detection (optional, using lightweight model)
    ↓
[STAGE 2: Server receives file - TEMPORARY storage only]
- Store in memory or temp file (NOT IPFS yet)
- Generate image hash for deduplication check
    ↓
[STAGE 3: AI Safety Check - BLOCKING]
- Call AI Service /api/moderate/check (synchronous)
- Claude Vision analyzes for:
  • NSFW/nudity
  • Violence/gore
  • Hate symbols
  • Child safety
  • Spam/scam patterns
    ↓
[DECISION POINT]
├── SAFE (score < 3): Continue to IPFS upload
├── WARN (score 3-6): Allow with warning, flag for review
└── BLOCK (score > 6): Reject immediately, no IPFS upload
    ↓
[If blocked]
- Return error to user immediately
- Log attempt (wallet, hash, reason) for abuse tracking
- DO NOT store image anywhere permanent
- Rate limit wallet if repeated violations
```

**Guardrail Response Times:**
| Check Type | Target Latency | Impact on UX |
|------------|---------------|--------------|
| Basic validation | <100ms | Instant |
| AI safety check | <2s | Acceptable (user sees "Checking content...") |
| Full analysis | Async | No UX impact |

**Safety Categories & Thresholds:**
| Category | Block Threshold | Action |
|----------|-----------------|--------|
| NSFW/Nudity | > 7 | Block |
| Violence/Gore | > 6 | Block |
| Hate/Extremism | > 5 | Block |
| Child Safety | > 3 | Block + Report |
| Spam/Scam | > 7 | Block |
| Drugs/Weapons | > 6 | Block |

**Repeat Offender Handling:**
```
1st violation: Block content, warning
2nd violation: Block content, 24h upload cooldown
3rd violation: Block content, 7d upload cooldown
4th violation: Account flagged, manual review required
5th violation: Permanent upload ban (wallet blacklist)
```

**Implementation Checklist:**
- [ ] AI moderation endpoint is SYNCHRONOUS (blocks upload)
- [ ] Temporary storage only until approved
- [ ] IPFS upload happens AFTER safety check passes
- [ ] Violation logging for abuse tracking
- [ ] Repeat offender rate limiting
- [ ] Appeal process (manual review queue)
- [ ] Wallet blacklist for severe violations
- [ ] IPFS hash deduplication (block known bad content)

**Known Bad Content Database:**
```
Table: blocked_content_hashes
├── image_hash (perceptual hash, survives minor edits)
├── reason (nsfw, violence, etc.)
├── blocked_at
└── reported_by (system, user, manual)

On upload: Check if hash matches known bad content → instant block
```

### Infrastructure Security
- [ ] Environment variables for all secrets
- [ ] HTTPS only
- [ ] Database connection encryption
- [ ] Redis password protection
- [ ] Secrets rotation plan

---

## API Contracts

### Request/Response Formats

All API responses follow:
```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `WALLET_MISMATCH` | 400 | JWT wallet doesn't match request |
| `INSUFFICIENT_FUNDS` | 400 | Not enough SOL |
| `TRANSACTION_FAILED` | 500 | Solana transaction error |
| `AI_SERVICE_ERROR` | 503 | AI service unavailable |

---

## Deployment Strategy

### Environment Configuration

```bash
# ============================================
# Backend (.env) - Railway Service
# ============================================
NODE_ENV=production
PORT=3001

# Supabase (Database + Realtime)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Upstash Redis (Cache + BullMQ)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...

# Cloudflare R2 (IPFS Cache)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=solshare-content
R2_PUBLIC_URL=https://cdn.solshare.app

# Solana
SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=YOUR_KEY
SOCIAL_PROGRAM_ID=SoLSHr...
PAYMENT_PROGRAM_ID=PAYMNt...
TOKEN_GATE_PROGRAM_ID=TKNGt...

# IPFS (Pinata - uploads)
PINATA_API_KEY=xxx
PINATA_SECRET_KEY=xxx

# Auth
JWT_SECRET=your-super-secret-jwt-key
DYNAMIC_PUBLIC_KEY=pk_...

# AI Service
AI_SERVICE_URL=https://ai.solshare.app  # Or internal Railway URL

# Misc
FRONTEND_URL=https://solshare.app
SENTRY_DSN=https://xxx@sentry.io/xxx

# ============================================
# AI Service (.env) - Railway Service
# ============================================
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
QDRANT_URL=https://xxx.qdrant.io
QDRANT_API_KEY=xxx
BACKEND_URL=http://solshare-backend.railway.internal:3001

# ============================================
# Frontend (.env.local) - Vercel
# ============================================
NEXT_PUBLIC_API_URL=https://api.solshare.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=xxx
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.solshare.app
```

### Service Setup Order

```
1. External Services (create accounts):
   ├── Supabase → Create project, run migrations
   ├── Upstash → Create Redis database
   ├── Qdrant Cloud → Create cluster + collection
   ├── Cloudflare → R2 bucket + DNS setup
   ├── Pinata → API keys
   ├── Helius → Solana RPC key
   └── Dynamic.xyz → Environment setup

2. Solana Programs:
   └── Deploy to devnet/mainnet → Get program IDs

3. Backend (Railway):
   ├── Create service from GitHub repo
   ├── Add environment variables
   ├── Enable web + worker processes (Procfile)
   └── Configure custom domain (api.solshare.app)

4. AI Service (Railway):
   ├── Create service from GitHub repo
   ├── Add environment variables
   └── Configure internal networking

5. Frontend (Vercel):
   ├── Import from GitHub
   ├── Add environment variables
   └── Configure domain (solshare.app)
```

### Deployment Checklist

**Infrastructure:**
- [ ] Supabase project created
- [ ] Supabase migrations run
- [ ] Supabase Realtime enabled for tables
- [ ] Upstash Redis created
- [ ] Qdrant Cloud cluster created
- [ ] Qdrant collection initialized
- [ ] Cloudflare R2 bucket created
- [ ] R2 public access configured
- [ ] DNS configured in Cloudflare

**Blockchain:**
- [ ] Solana programs deployed
- [ ] Program IDs stored in env
- [ ] IDL files copied to backend

**Services:**
- [ ] Backend deployed (Railway)
- [ ] Backend worker process running
- [ ] AI Service deployed (Railway)
- [ ] Frontend deployed (Vercel)

**Monitoring:**
- [ ] Sentry configured (backend + frontend)
- [ ] Railway logs accessible
- [ ] Upstash dashboard accessible
- [ ] Error alerts configured

---

## Testing Requirements

### Unit Tests

| Component | Coverage Target |
|-----------|-----------------|
| Solana Programs | 90%+ (all instructions) |
| Backend Controllers | 80%+ |
| Frontend Hooks | 80%+ |

### Integration Tests

- [ ] Post creation flow (upload → analyze → create → confirm)
- [ ] Tip payment flow (request → sign → submit → confirm)
- [ ] Follow/unfollow flow
- [ ] Token-gated access verification
- [ ] Feed personalization accuracy

### E2E Tests (Playwright)

- [ ] Login with wallet
- [ ] Create post with image
- [ ] Like and comment on post
- [ ] Tip creator
- [ ] Search for content
- [ ] View profile

---

## Cost Estimation

### Monthly Costs (100 DAU, 1000 MAU)

| Service | Tier | Est. Cost | Notes |
|---------|------|-----------|-------|
| **Supabase** | Free → Pro | $0-25 | 500MB DB free, Pro at scale |
| **Upstash Redis** | Pay-as-you-go | $0-10 | ~$0.2 per 100K commands |
| **Qdrant Cloud** | Free → Starter | $0-25 | 1GB free, scales with vectors |
| **Railway** | Usage-based | $5-20 | Backend + AI service |
| **Vercel** | Free → Pro | $0-20 | Free tier generous for frontend |
| **Cloudflare R2** | Pay-as-you-go | $0-5 | $0.015/GB storage, $0 egress |
| **Pinata** | Free → Picnic | $0-20 | 1GB free, uploads only |
| **Helius** | Free → Startup | $0-50 | 10M requests free |
| **Anthropic** | Pay-as-you-go | $10-50 | ~$0.02 per image analysis |
| **OpenAI** | Pay-as-you-go | $5-20 | ~$0.0001 per embedding |
| **Dynamic.xyz** | Free → Growth | $0-99 | Free for <1000 users |

**Total Estimated: $20-350/month** depending on scale

### Cost Optimization Tips

1. **Batch AI analysis** - Process multiple images in one API call
2. **Cache aggressively** - R2 + Cloudflare edge caching
3. **Use Supabase Realtime** - Cheaper than custom WebSocket at scale
4. **Lazy embedding generation** - Only generate when post is popular
5. **Use free tiers** - Most services have generous free tiers

---

## Success Criteria

### Functional Requirements
- [ ] Users can authenticate with any major Solana wallet
- [ ] Users can create posts with images
- [ ] Posts are analyzed by AI (description, tags, safety)
- [ ] Semantic search works ("cozy workspaces" finds relevant posts)
- [ ] Users can follow/unfollow others
- [ ] Users can like and comment on posts
- [ ] Creators can receive tips (settles on-chain <5s)
- [ ] Token-gated content shows lock icon, verifies ownership
- [ ] Feed is personalized based on user taste

### Performance Requirements
- [ ] Feed loads in <500ms
- [ ] Post creation (upload to visible) <8s
- [ ] Search results in <800ms
- [ ] Transaction confirmation <5s
- [ ] Support 100 concurrent users

### Quality Requirements
- [ ] AI analysis quality (relevant tags, accurate descriptions)
- [ ] Semantic search relevance (subjective evaluation)
- [ ] No critical security vulnerabilities
- [ ] Mobile-responsive UI
- [ ] Accessibility (alt-text, keyboard navigation)

---

## Future Enhancements (V2+)

### 1. Ban Evasion Detection (Wallet Cluster Analysis)

> **Problem:** Banned users can create new wallets and bypass restrictions.
> **Solution:** Detect related wallets and apply bans to the entire cluster.

**How Instagram/Facebook Detect Ban Evaders:**
```
Traditional Web2:
├── Same email → Blocked
├── Same phone number → Blocked
├── Same device ID/MAC → Blocked
├── Same IP address → Flagged
└── Behavioral patterns → AI detection
```

**Web3 Equivalent (Our Approach):**
```
On-Chain Analysis:
├── Wallet funded by banned wallet → Flag/Block
├── Wallet in same cluster (Helius/Bubble Maps) → Flag
├── Same withdrawal destination → Flag
└── Shared token holdings pattern → Flag

Off-Chain Signals:
├── Same browser fingerprint → Flag
├── Same IP address → Flag (with caution - VPNs)
├── Same device fingerprint → Flag
├── Similar behavioral patterns → AI detection
└── Same posting times/content style → AI detection
```

**Wallet Cluster Detection Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                  BAN EVASION DETECTION SYSTEM               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  On Login/Signup:                                           │
│  1. Check if wallet is directly banned                      │
│  2. Query Helius API for wallet relationships               │
│  3. Check if any related wallet is banned                   │
│  4. Collect device fingerprint + IP                         │
│  5. Check fingerprint against banned users                  │
│                                                             │
│  Scoring System:                                            │
│  ├── Direct funding from banned wallet: +100 (auto-block)  │
│  ├── Same cluster as banned wallet: +50                    │
│  ├── Same browser fingerprint: +40                         │
│  ├── Same IP (non-VPN): +30                                │
│  ├── Similar behavioral pattern: +20                       │
│  └── Score > 70 = Block, 40-70 = Review, <40 = Allow       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**External APIs for Wallet Analysis:**

| Service | Purpose | API |
|---------|---------|-----|
| **Helius** | Transaction history, wallet relationships | DAS API, Enhanced Transactions |
| **Bubble Maps** | Wallet cluster visualization | (Manual review, no public API yet) |
| **Arkham Intelligence** | Entity identification | Enterprise API |
| **Nansen** | Wallet labels, smart money tracking | Enterprise API |
| **Solana FM** | Transaction graph analysis | Public API |

**Database Schema (Future):**
```sql
-- Wallet clusters (related wallets)
CREATE TABLE wallet_clusters (
    cluster_id UUID PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT
);

-- Wallet to cluster mapping
CREATE TABLE wallet_cluster_members (
    wallet VARCHAR(44) PRIMARY KEY,
    cluster_id UUID REFERENCES wallet_clusters(cluster_id),
    relationship_type VARCHAR(20),  -- funded_by, funded, same_owner, shared_tokens
    confidence_score FLOAT,  -- 0-1
    detected_at TIMESTAMP DEFAULT NOW()
);

-- Device fingerprints
CREATE TABLE device_fingerprints (
    fingerprint_hash VARCHAR(64) PRIMARY KEY,
    first_seen_wallet VARCHAR(44),
    first_seen_at TIMESTAMP DEFAULT NOW(),
    is_banned BOOLEAN DEFAULT FALSE
);

-- Wallet-device associations
CREATE TABLE wallet_devices (
    wallet VARCHAR(44),
    fingerprint_hash VARCHAR(64),
    ip_address INET,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (wallet, fingerprint_hash)
);

-- Evasion detection logs
CREATE TABLE evasion_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    new_wallet VARCHAR(44) NOT NULL,
    detected_related_wallet VARCHAR(44),
    detection_method VARCHAR(30),  -- funding_chain, cluster, fingerprint, ip, behavior
    confidence_score FLOAT,
    action_taken VARCHAR(20),  -- blocked, flagged, allowed
    timestamp TIMESTAMP DEFAULT NOW()
);
```

**Implementation Priority:** LOW (V2)
**Complexity:** HIGH
**False Positive Risk:** MEDIUM (needs manual review queue)

### 2. Other V2 Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Creator Tokens** | Social tokens for creators | Medium |
| **NFT Minting** | Mint posts as NFTs | Medium |
| **Video Streaming** | Live streaming support | Low |
| **Direct Messages** | E2E encrypted DMs | Medium |
| **Stories** | Ephemeral 24h content | Low |
| **Multi-Chain** | Ethereum, Polygon support (via Dynamic.xyz) | Low |
| **DAO Governance** | Community voting on features | Low |
| **Creator Analytics** | Advanced dashboard | Medium |
| **Mobile Apps** | iOS/Android native apps | High |

### 3. Out of Scope (V1)

The following are explicitly NOT included in V1:
- Video streaming (only uploaded videos)
- Direct messaging
- Stories/ephemeral content
- Multi-chain support
- Mobile native apps
- Content editing after posting
- Advanced analytics dashboard
- Creator marketplace
- Advertising platform
- Ban evasion detection

---

## Appendix: File Tree Summary

```
solShare/
├── programs/                    # Phase 1: Solana Programs
│   ├── solshare-social/
│   ├── solshare-payment/
│   └── solshare-token-gate/
├── backend/                     # Phase 2: Backend API
│   ├── src/
│   ├── idl/
│   └── tests/
├── ai-service/                  # Phase 3: AI/ML Service
│   └── app/
├── frontend/                    # Phase 4: Frontend
│   └── src/
├── docs/                        # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
├── scripts/                     # Deployment & utilities
│   ├── deploy-programs.sh
│   ├── migrate-db.sh
│   └── seed-data.sh
├── docker-compose.yml           # Local development
├── .env.example
└── README.md
```

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 3.0 | Jan 2026 | Restructured for multi-agent execution, added tech stack table, removed code blocks |
| 2.0 | Jan 2025 | Added AI features, Dynamic.xyz, semantic search |
| 1.0 | Dec 2024 | Initial specification |
