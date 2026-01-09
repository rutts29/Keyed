---
name: Non-Frontend Remaining Work
overview: "This plan covers all remaining work beyond frontend: infrastructure setup, deployment, integration testing, and documentation. The code for Solana programs, Backend, and AI Service is complete but not yet deployed or integrated."
todos:
  - id: service-accounts
    content: Create accounts and obtain API keys for Supabase, Upstash, Qdrant, Cloudflare R2, Pinata, Helius, OpenAI, Voyage AI
    status: pending
    notes: "MANUAL - Requires human to create accounts on external services"
  - id: supabase-migrations
    content: Run database migrations (001-005) in Supabase SQL Editor and enable Realtime
    status: pending
    notes: "MANUAL - Requires Supabase account. Migration files verified at backend/migrations/"
  - id: qdrant-setup
    content: Run ai-service/scripts/setup_qdrant.py to create vector collection
    status: pending
    notes: "Script ready at ai-service/scripts/setup_qdrant.py"
  - id: solana-deploy
    content: Deploy Solana programs to devnet with anchor deploy --provider.cluster devnet
    status: pending
    notes: "Programs ready at solshare/programs/. Requires Anchor CLI and funded wallet"
  - id: backend-deploy
    content: Deploy backend to Railway with all environment variables configured
    status: pending
    notes: "Backend ready - Procfile, railway.json, .env.example all configured"
  - id: ai-service-deploy
    content: Deploy AI service to Railway and configure internal networking
    status: pending
    notes: "AI service ready - Dockerfile, railway.json, .env.example all configured"
  - id: integration-test
    content: "Test end-to-end flows: auth, post creation, search, payments, token-gating"
    status: completed
    notes: "Test suite created at scripts/integration-tests/"
  - id: documentation
    content: Update README.md with setup instructions, architecture, and deployment guide
    status: completed
    notes: "Comprehensive README.md created with full documentation"
---

# SolShare Non-Frontend Remaining Work

## Current State Summary

| Component | Code Status | Deployment Status |

|-----------|------------|-------------------|

| Solana Programs | Complete (37 tests) | NOT deployed |

| Backend API | Complete | NOT deployed |

| AI/ML Service | Complete | NOT deployed |

| Database Migrations | Defined (5 SQL files) | NOT executed |

| Infrastructure | Not set up | Accounts needed |

---

## Phase A: External Service Accounts (Manual Setup)

These require human action to create accounts and obtain API keys:

**Required Services:**

- **Supabase** - Create project at [supabase.com](https://supabase.com)
  - Get: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

- **Upstash** - Create Redis database at [upstash.com](https://upstash.com)
  - Get: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

- **Qdrant Cloud** - Create cluster at [cloud.qdrant.io](https://cloud.qdrant.io)
  - Get: `QDRANT_URL`, `QDRANT_API_KEY`

- **Cloudflare R2** - Create bucket in Cloudflare dashboard
  - Get: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

- **Pinata** - Create account at [pinata.cloud](https://pinata.cloud)
  - Get: `PINATA_API_KEY`, `PINATA_SECRET_KEY`

- **Helius** - Create account at [helius.dev](https://helius.dev)
  - Get: `HELIUS_API_KEY` for Solana RPC

- **OpenAI** - Ensure API key has GPT-5.2 access
  - Get: `OPENAI_API_KEY`

- **Voyage AI** - Create account at [voyageai.com](https://voyageai.com)
  - Get: `VOYAGE_API_KEY`

---

## Phase B: Database Setup

**Files:** `backend/migrations/001-005_*.sql`

After creating Supabase project:

1. Run migrations in Supabase SQL Editor in order:

   - `001_extensions.sql` - Enable pgcrypto, vector extensions
   - `002_core_tables.sql` - users, posts, follows, likes, comments, transactions
   - `003_moderation_tables.sql` - content_violations, blocked_content_hashes, wallet_restrictions
   - `004_functions.sql` - get_wallet_upload_limit function
   - `005_realtime.sql` - Enable Supabase Realtime for relevant tables

2. Enable Realtime in Supabase Dashboard for: `posts`, `likes`, `comments`, `follows`

---

## Phase C: Qdrant Vector DB Setup

**Script:** [`ai-service/scripts/setup_qdrant.py`](ai-service/scripts/setup_qdrant.py)

After Qdrant Cloud cluster is created:

```bash
cd ai-service
QDRANT_URL=xxx QDRANT_API_KEY=xxx python scripts/setup_qdrant.py
```

Creates `solshare_posts` collection with:

- 1024-dimension vectors (Voyage 3.5)
- Payload indexes: creator_wallet, scene_type, timestamp

---

## Phase D: Solana Program Deployment

**Location:** `solshare/` directory

1. Configure wallet with devnet SOL:
   ```bash
   solana config set --url devnet
   solana airdrop 5
   ```

2. Build and deploy:
   ```bash
   cd solshare
   anchor build
   anchor deploy --provider.cluster devnet
   ```

3. Update program IDs in backend environment after deployment

4. Copy updated IDLs if regenerated:
   ```bash
   cp target/idl/*.json ../backend/idl/
   ```


**Current Program IDs (will change on redeploy):**

- Social: `G2USoTtbNw78NYvPJSeuYVZQS9oVQNLrLE5zJb7wsM3L`
- Payment: `H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t`
- Token Gate: `EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi`

---

## Phase E: Backend Deployment (Railway)

**Location:** `backend/`

1. Create Railway project and service
2. Connect to GitHub repo (or deploy via CLI)
3. Set environment variables (all from Phase A + program IDs)
4. Enable both processes via Procfile:

   - `web: npm run start:api`
   - `worker: npm run start:worker`

5. Configure custom domain if needed (e.g., `api.solshare.app`)

**Test locally first:**

```bash
cd backend
npm install
npm run build
npm run start:api  # In terminal 1
npm run start:worker  # In terminal 2
```

---

## Phase F: AI Service Deployment (Railway)

**Location:** `ai-service/`

1. Create Railway service for AI
2. Set environment variables:

   - `OPENAI_API_KEY`
   - `VOYAGE_API_KEY`
   - `QDRANT_URL`, `QDRANT_API_KEY`
   - `BACKEND_URL` (internal Railway URL)

3. Deploy using Dockerfile

**Internal URL:** `http://solshare-ai.railway.internal:8000`

**Test locally first:**

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Phase G: Integration Testing

After all services are deployed:

1. **Auth Flow Test:**

   - Request challenge from backend
   - Sign with wallet
   - Verify JWT issuance

2. **Post Creation Flow:**

   - Upload image → Backend → AI moderation check
   - Store in IPFS → Create on-chain → Queue AI analysis
   - Verify Qdrant indexing

3. **Search Flow:**

   - Semantic search → AI service → Qdrant → Results

4. **Payment Flow:**

   - Tip → Solana transaction → Confirmation

5. **Token Gate Flow:**

   - Set access requirements → Verify access

---

## Phase H: Documentation Updates

1. **Update [`README.md`](README.md)** with:

   - Project overview
   - Architecture diagram
   - Setup instructions
   - Environment variables list
   - Deployment guide

2. **Create API documentation** (optional: OpenAPI/Swagger export from backend)

3. **Create deployment runbook** with step-by-step commands

---

## Estimated Timeline

| Phase | Duration | Dependencies |

|-------|----------|--------------|

| A: Service Accounts | 1-2 hours | None (manual) |

| B: Database Setup | 30 minutes | Phase A (Supabase) |

| C: Qdrant Setup | 15 minutes | Phase A (Qdrant) |

| D: Solana Deploy | 30 minutes | None |

| E: Backend Deploy | 1 hour | Phase A, B, D |

| F: AI Deploy | 30 minutes | Phase A, C |

| G: Integration Test | 2-3 hours | All above |

| H: Documentation | 1-2 hours | After testing |

**Total: 6-10 hours** (can be parallelized)

---

## Risk Areas

1. **API Key Rate Limits** - GPT 5.2 and Voyage may have usage limits on new accounts
2. **Solana Devnet SOL** - May need multiple airdrops for testing
3. **Supabase Free Tier** - 500MB database limit
4. **Railway Credits** - Check free tier limits for 2 services

---

## What Can Be Automated vs Manual

**Must be manual:**

- Creating accounts on external services
- Getting API keys
- Running Supabase migrations (via dashboard)
- Initial Solana wallet funding

**Can be scripted:**

- Qdrant collection setup (script exists)
- Backend/AI service deployment (Railway CLI)
- Integration tests (can write test scripts)
- Environment variable validation

---

## Completed Automation Work

The following was automated/created:

### Integration Test Suite (`scripts/integration-tests/`)

- `test-auth.ts` - Authentication flow tests (challenge, verify, refresh)
- `test-posts.ts` - Post creation flow tests (upload, create, like, comment)
- `test-search.ts` - Search flow tests (semantic, tag, user search)
- `test-payments.ts` - Payment flow tests (vault, tip, subscribe, withdraw)
- `test-access.ts` - Token gate flow tests (requirements, verify access)
- `test-all.ts` - Run all test suites
- `config.ts` - Shared configuration and test utilities
- `package.json` - Dependencies and npm scripts
- `.env.example` - Environment variable template

### Documentation

- `README.md` - Comprehensive project documentation with:
  - Architecture overview and diagram
  - Project structure
  - Prerequisites and quick start guide
  - Full deployment guide (all 6 phases)
  - API reference
  - Environment variables documentation
  - Testing instructions

### Deployment Files

- `backend/railway.json` - Railway deployment config
- `solshare/.env.example` - Solana environment template
- `scripts/deploy-checklist.sh` - Deployment readiness checker

### Verified Files

All required files verified to exist:
- ✅ Database migrations (001-005)
- ✅ Qdrant setup script
- ✅ Solana programs (social, payment, token-gate)
- ✅ Backend Procfile and configs
- ✅ AI Service Dockerfile and configs
- ✅ IDL files for Solana programs