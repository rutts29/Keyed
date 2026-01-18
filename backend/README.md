# SolShare Backend API

Backend API service for SolShare - an AI-native decentralized social platform on Solana.

## Architecture Overview

```
backend/
├── src/
│   ├── index.ts              # API server entry point
│   ├── worker.ts             # BullMQ worker entry point
│   ├── config/               # Configuration modules
│   ├── middleware/           # Express middleware
│   ├── routes/               # API route definitions
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic services
│   ├── jobs/                 # BullMQ job processors
│   ├── models/               # Database schemas
│   ├── types/                # TypeScript types
│   └── utils/                # Helper functions
├── migrations/               # Supabase SQL migrations
├── idl/                      # Solana program IDLs (from Agent 1)
└── tests/                    # Test files
```

## Quick Start

### Prerequisites

- Node.js 22+
- Supabase project
- Upstash Redis
- Cloudflare R2 bucket
- Pinata account

### Installation

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
```

### Database Setup

Run migrations in Supabase SQL Editor in order:
1. `migrations/001_extensions.sql`
2. `migrations/002_core_tables.sql`
3. `migrations/003_moderation_tables.sql`
4. `migrations/004_functions.sql`
5. `migrations/005_realtime.sql`
6. `migrations/006_privacy_tables.sql` (for Privacy Cash integration)

### Development

```bash
# Start API server
npm run dev

# Start worker (separate terminal)
npm run dev:worker
```

### Production

```bash
npm run build
npm run start:api    # API server
npm run start:worker # Background worker
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/challenge` | Generate signing challenge |
| POST | `/api/auth/verify` | Verify signature, get JWT |
| POST | `/api/auth/refresh` | Refresh JWT token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:wallet` | Get user profile |
| POST | `/api/users/profile` | Create/update profile |
| GET | `/api/users/:wallet/posts` | Get user's posts |
| GET | `/api/users/:wallet/followers` | Get followers |
| GET | `/api/users/:wallet/following` | Get following |
| POST | `/api/users/:wallet/follow` | Follow user |
| DELETE | `/api/users/:wallet/follow` | Unfollow user |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts/upload` | Upload content (with AI guardrail) |
| POST | `/api/posts/create` | Create post |
| GET | `/api/posts/:postId` | Get post |
| POST | `/api/posts/:postId/like` | Like post |
| DELETE | `/api/posts/:postId/like` | Unlike post |
| GET | `/api/posts/:postId/comments` | Get comments |
| POST | `/api/posts/:postId/comments` | Add comment |
| POST | `/api/posts/:postId/report` | Report post |

### Feed
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feed` | Personalized feed (auth required) |
| GET | `/api/feed/explore` | Explore/trending |
| GET | `/api/feed/following` | Following feed |
| GET | `/api/feed/trending` | Trending posts |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/tip` | Tip creator |
| POST | `/api/payments/subscribe` | Subscribe to creator |
| DELETE | `/api/payments/subscribe/:creator` | Cancel subscription |
| GET | `/api/payments/earnings` | Get earnings |
| POST | `/api/payments/withdraw` | Withdraw earnings |

### Privacy (Private Tipping)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/privacy/shield` | Shield SOL into privacy pool |
| POST | `/api/privacy/tip` | Send private anonymous tip |
| GET | `/api/privacy/balance` | Get shielded balance |
| GET | `/api/privacy/tips/received` | Get private tips received |
| GET | `/api/privacy/tips/sent` | Get private tips sent |
| GET | `/api/privacy/settings` | Get privacy preferences |
| PUT | `/api/privacy/settings` | Update privacy preferences |
| GET | `/api/privacy/pool/info` | Get privacy pool stats |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search/semantic` | AI-powered semantic search |
| GET | `/api/search/suggest` | Search autocomplete |
| GET | `/api/search/users` | Search users |

### Access Control
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/access/verify` | Verify token-gated access |
| POST | `/api/access/requirements` | Set access requirements |

## Solana Program Integration

The backend integrates with three Solana programs via Anchor:

### Program IDs (Devnet)
- **Social**: `G2USoTtbNw78NYvPJSeuYVZQS9oVQNLrLE5zJb7wsM3L`
- **Payment**: `H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t`
- **Token Gate**: `EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi`

### Transaction Building
All write operations return **unsigned transactions** for frontend signing:
- Profile creation/update → `create_profile` / `update_profile`
- Post creation → `create_post`
- Likes → `like_post` / `unlike_post`
- Follows → `follow_user` / `unfollow_user`
- Comments → `comment_post`
- Tips → `tip_creator`
- Subscriptions → `subscribe` / `cancel_subscription`
- Withdrawals → `withdraw`
- Token gating → `set_access_requirements` / `verify_token_access`

### PDA Derivation
PDAs are derived using standard seeds:
- Profile: `["profile", authority]`
- Post: `["post", creator, post_index]`
- Follow: `["follow", follower, following]`
- Like: `["like", post, user]`
- Comment: `["comment", post, comment_index]`
- Vault: `["vault", creator]`
- Subscription: `["subscription", subscriber, creator]`
- Access Control: `["access", post]`

## Privacy Cash Integration (Solana Privacy Hackathon)

SolShare integrates Privacy Cash SDK for anonymous tipping, enabling creators to receive tips without revealing the tipper's identity.

### Architecture

```
User → Shield SOL → Privacy Pool (Zero-Knowledge Commitment)
         ↓
    Private Tip (ZK Proof) → Creator Wallet
         ↓
    Tipper Identity Hidden ✓
```

### How Private Tipping Works

1. **Shield**: User deposits SOL into Privacy Cash pool
   - Creates zero-knowledge commitment
   - SOL is pooled with other users' funds
   - User receives private balance

2. **Private Tip**: User sends tip from shielded balance
   - Generates zero-knowledge proof of balance
   - Withdraws to creator wallet via relayer
   - Transaction doesn't reveal tipper identity
   - Creator sees tip amount, not the source

3. **Privacy Preserved**: On-chain analysis cannot link tipper to tip

### Privacy Features

- **Anonymous Tipping**: Tips sent without revealing identity
- **Shielded Balance**: User's privacy pool balance
- **Private History**: Creator can see tips received (amounts only)
- **Privacy Settings**: Configure default privacy preferences

### Database Schema

**private_tips**: Stores tips received by creators (tipper NOT stored)
- `creator_wallet`: Who received the tip
- `amount`: Tip amount in lamports
- `tx_signature`: Transaction signature
- `post_id`: Optional post reference
- **NOTE**: Tipper wallet is intentionally NOT stored

**user_privacy_settings**: User privacy preferences
- `wallet`: User wallet
- `default_private_tips`: Auto-enable private tips

**privacy_shield_cache**: Cached shielded balances
- `wallet`: User wallet
- `shielded_balance`: Cached balance (source of truth is on-chain)

### Privacy Cash SDK Integration

**Status**: Architecture ready, SDK pending integration

**TODO**:
1. Install Privacy Cash SDK when available
2. Update `privacy.service.ts` placeholder methods
3. Add `PRIVACY_CASH_RELAYER_URL` and `PRIVACY_CASH_PROGRAM_ID` to `.env`
4. Test shield → tip → verify flow

**SDK Documentation**: https://docs.privacy.cash

### Hackathon Bounties Targeted

- **Privacy Cash** ($6k): Best Integration to Existing App
- **Helius** ($5k): Best Privacy Project (using Helius RPC)
- **Open Track** ($18k pool): Innovative privacy features

## AI Service Integration

The backend integrates with the AI microservice for:
- **Content Moderation** (`POST /api/moderate/check`) - Pre-upload safety check
- **Hash Check** (`POST /api/moderate/check-hash`) - Instant block of known bad content
- **Content Analysis** (`POST /api/analyze/content`) - Description, tags, embeddings
- **Semantic Search** (`POST /api/search/semantic`) - Query expansion and vector search
- **Recommendations** (`POST /api/recommend/feed`) - Personalized feed based on likes

### AI Service Endpoints Used
| Endpoint | Purpose | When Called |
|----------|---------|-------------|
| `/api/moderate/check` | Content safety check | Before IPFS upload |
| `/api/moderate/check-hash` | Block known bad content | Before IPFS upload |
| `/api/analyze/content` | Full content analysis | Async after post creation |
| `/api/search/semantic` | Semantic search | User search requests |
| `/api/recommend/feed` | Personalized feed | Personalized feed request |

### Graceful Degradation
When the AI service is unavailable:
- Moderation: Content is allowed with stub response
- Analysis: Returns basic stub with caption
- Search: Returns empty results
- Recommendations: Falls back to following-based feed

## Key Features

### Upload Guardrail Flow
Content is checked BEFORE storage:
1. Check wallet restrictions
2. Check perceptual hash against blocklist
3. AI moderation check (stubbed until AI service ready)
4. Upload to IPFS
5. Cache in R2

### Rate Limiting
- GET: 1000/hour (auth), 100/hour (unauth)
- POST: 100/hour
- Upload: 50/hour
- Search: 200/hour (auth), 50/hour (unauth)

### Background Jobs (BullMQ)
- `ai-analysis`: Process AI content analysis
- `embedding`: Index embeddings in vector DB
- `notification`: Send realtime notifications
- `feed-refresh`: Recompute personalized feeds
- `sync-chain`: Sync on-chain data to DB

## Environment Variables

See `.env.example` for all required variables.

## Testing

```bash
npm test        # Watch mode
npm run test:run # Single run
```

## Deployment

The service is designed for Railway with two processes:
- `web`: API server
- `worker`: BullMQ worker

See `Procfile` for process definitions.
