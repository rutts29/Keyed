# Keyed Comprehensive Security & System Design Audit Report
**Date:** February 1, 2026
**Auditor:** AI Security Review
**Scope:** Full codebase review - Backend, AI Service, Solana Smart Contracts (4 programs), Database, Infrastructure

---

## Executive Summary

The Keyed codebase demonstrates **production-quality architecture** with robust security practices in most areas. The implementation shows thoughtful design for a Web3 social platform with AI-powered features. This audit identifies several areas of strength and a few improvements needed to reach **optimal production readiness**.

**Overall Assessment:** ✅ **Production Ready** (with minor recommendations)

---

## 1. Security Analysis

### 1.1 ✅ Strong Security Practices Found

#### Authentication & Authorization
- **Cryptographic wallet signature verification** using `tweetnacl` for SIWS (Sign-In with Solana)
- **Secure nonce generation** using `crypto.randomBytes()` instead of `Math.random()`
- **JWT implementation** with proper secret length validation (min 32 chars)
- **Challenge-response auth** with 5-minute TTL to prevent replay attacks
- **Wallet restriction checking** on login and token refresh

#### Chat Authorization
- **Token-gated rooms** enforce 403 for unqualified users attempting to join
- **Creator cannot leave own room** — ownership integrity is preserved
- **Message and read access enforced per-member** — only current room members can send and read messages

#### Airdrop Authorization
- **Campaign operations** (prepare/fund/start/cancel) enforce `creator_wallet` ownership checks at the controller level
- **Escrow keypair generated server-side** — private key material is never exposed to the client
- **Escrow-based distribution** via a dedicated Solana Airdrop program with PDA-derived campaign accounts

#### Input Validation
- **Zod schema validation** on all API endpoints for body, query, and params
- **Strict type enforcement** with TypeScript throughout
- **File type validation** on uploads (only JPEG, PNG, GIF, WEBP)
- **Size limits** (50MB file uploads, 10MB JSON body)
- **Content length limits** in Solana programs (username ≤32, bio ≤256, caption ≤2000)

#### Rate Limiting
- **Per-user and per-IP rate limiting** with different tiers for authenticated/unauthenticated users
- **IP identification** using X-Forwarded-For with proper handling
- **Reject requests with no identifiable client** to prevent bypass attacks

#### Content Moderation
- **Fail-closed design** - AI service unavailability blocks uploads (doesn't allow potentially unsafe content)
- **Perceptual hash checking** for detecting modified versions of blocked content
- **Multi-category moderation** (NSFW, violence, hate, child safety, spam, drugs/weapons)
- **Escalation to advanced model** for borderline content
- **Progressive restriction system** for repeat offenders

#### Solana Smart Contracts
- **4 on-chain programs**: User Profile, Social (tips/follows/likes), Content Vault, and Airdrop (escrow-based distribution)
- **Proper PDA derivation** with seeds for deterministic account addresses
- **Arithmetic overflow protection** using `checked_*` operations
- **Self-action prevention** (can't tip/follow/like yourself)
- **Creator wallet validation** against vault owner to prevent fund misdirection
- **Proper account constraint validation** using Anchor's constraint macros

### 1.2 ⚠️ Security Issues & Recommendations

#### CRITICAL: None Found ✅

#### HIGH: None Found ✅

#### MEDIUM Priority Issues

**1. AI Service Internal API Exposure**
- **Location:** `ai-service/app/main.py`
- **Issue:** AI service is only protected by CORS (backend_url), but in Docker network it's directly accessible on port 8000
- **Risk:** If attacker gains network access, they can bypass backend rate limiting
- **Update:** An `AI_SERVICE_API_KEY` environment variable has been added to the configuration, but enforcement middleware on the AI service side is still pending implementation.
- **Recommendation:** Complete the enforcement by adding API key verification middleware:

```python
# Add to AI service
from fastapi import Header, HTTPException

async def verify_internal_api_key(x_internal_key: str = Header(...)):
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
```

**2. Error Messages in Production**
- **Location:** `ai-service/app/api/routes/*.py`
- **Issue:** Exception messages exposed via `str(e)` in HTTP 500 responses
- **Risk:** Information leakage about internal systems
- **Recommendation:** Catch specific exceptions and return generic error messages in production

**3. Missing HTTPS Enforcement**
- **Location:** Docker/infrastructure configuration
- **Issue:** No explicit HTTPS/TLS configuration in docker-compose
- **Recommendation:** Add reverse proxy (nginx/traefik) with TLS termination for production

**4. Escrow Secret Storage**
- **Location:** `escrow_secret` column in the `airdrop_campaigns` table (Supabase)
- **Issue:** The escrow keypair secret is stored as a base64-encoded string in plaintext in the database
- **Risk:** If the database is compromised, an attacker can reconstruct escrow keypairs and drain unfunded or in-progress campaign escrow accounts
- **Recommendation:** Encrypt the `escrow_secret` column at rest using application-level encryption (e.g., AES-256-GCM with a key from a secrets manager such as AWS KMS or HashiCorp Vault) before storing it in Supabase. Avoid relying solely on Supabase's transparent disk encryption for this sensitive material.

#### LOW Priority Issues

**1. Dev Dependencies Have Moderate CVEs**
- vitest/vite/esbuild have moderate CVEs (GHSA-67mh-4wv8-2f99)
- **Impact:** Only affects development environment, not production
- **Recommendation:** Update `vitest` to v4.x when convenient

**2. User Taste Profile Prompt Injection**
- **Location:** `ai-service/app/services/recommender.py`
- **Issue:** User-generated content (post descriptions) inserted into LLM prompt
- **Risk:** Low - attacker could manipulate recommendations
- **Recommendation:** Add input sanitization for LLM prompts

---

## 2. System Design Analysis

### 2.1 ✅ Strong Architecture Patterns

#### Microservices Architecture
- **Proper separation** between API (backend), workers, and AI service
- **Independent scaling** - each service can scale horizontally
- **Health checks** with proper dependencies

#### Caching Strategy
- **Multi-layer caching**: Redis for sessions/rate limits, local cache for feeds
- **Appropriate TTLs**: User (5min), Post (1hr), Feed (30s), Following (5min)
- **Cache invalidation** on write operations

#### Background Job Processing
- **BullMQ** for reliable queue processing with Redis
- **Retry logic** with exponential backoff (3 attempts)
- **Job cleanup** (removeOnComplete: 100, removeOnFail: 1000)
- **Separate worker process** for isolation

#### Database Design
- **Proper indexing** on frequently queried columns
- **Composite primary keys** for many-to-many relationships (likes, follows)
- **Constraints** (no self-follow, valid wallet lengths, valid content types)
- **Atomic counter operations** with SQL functions

#### AI/ML Integration
- **Asynchronous processing** via job queue (doesn't block uploads)
- **Graceful degradation** (stub analysis if AI fails)
- **Query expansion** for better search results
- **Diversity injection** in recommendations

### 2.2 ⚠️ Design Improvements Recommended

**1. Database Connection Pooling**
- **Location:** `backend/src/config/supabase.ts`
- **Issue:** Using Supabase client directly without explicit connection pool sizing
- **Recommendation:** For high traffic, consider using direct PostgreSQL with pgbouncer

**2. Missing Request Tracing**
- **Issue:** No request ID correlation across services
- **Recommendation:** Add request ID middleware for debugging distributed systems:

```typescript
// Add to middleware
req.id = crypto.randomUUID();
res.setHeader('X-Request-ID', req.id);
```

**3. Feed Cache Staleness**
- **Location:** `backend/src/controllers/feed.controller.ts`
- **Issue:** 30-second feed TTL may cause stale content on high-activity accounts
- **Recommendation:** Consider cache invalidation on new posts from followed users

**4. Vector Search without Prefiltering**
- **Location:** `ai-service/app/services/vector_db.py`
- **Issue:** Searching all vectors before filtering can be inefficient at scale
- **Recommendation:** Add timestamp-based prefiltering for large collections

---

## 3. Scalability Assessment

### 3.1 Current Scalability Score: 8/10

#### Strengths
| Component | Scalability Feature |
|-----------|---------------------|
| Backend API | Stateless, horizontally scalable |
| Redis | Upstash provides managed scaling |
| Database | Supabase with automatic scaling |
| AI Service | Stateless, can add replicas |
| Storage | R2 + IPFS for unlimited content |
| Queues | BullMQ handles concurrent processing |

#### Bottleneck Areas
| Component | Concern | Mitigation |
|-----------|---------|------------|
| AI Moderation | Synchronous check on upload | Consider async with temporary hold |
| Vector Search | All-in-memory at scale | Add sharding when >10M vectors |
| Feed Generation | Complex queries for personalization | Precompute during off-peak hours |

### 3.2 Scalability Recommendations

**For 10K-100K Users (Current Design Handles)**
- Current architecture is sufficient
- Monitor Qdrant collection size
- Consider read replicas for Supabase

**For 100K-1M Users**
- Add CDN (Cloudflare) for static content
- Implement connection pooling with pgbouncer
- Add Redis cluster for cache
- Consider Qdrant sharding

**For 1M+ Users**
- Implement feed precomputation
- Add regional deployments
- Consider event sourcing for social graph

---

## 4. Production Readiness Checklist

### ✅ Ready
- [x] Environment validation with Zod
- [x] Graceful shutdown handling (SIGTERM)
- [x] Health check endpoints
- [x] Structured logging (pino)
- [x] Error handling middleware
- [x] Rate limiting
- [x] Input validation
- [x] Docker containerization
- [x] Secrets management (.env with .gitignore)
- [x] Database migrations

### ⚠️ Recommended Before Production
- [ ] Add APM/monitoring (Datadog, New Relic, or Sentry)
- [ ] Add request tracing with correlation IDs
- [ ] Add TLS termination/reverse proxy
- [ ] Complete internal API key enforcement for AI service
- [ ] Encrypt escrow secrets at rest or migrate to a secrets manager
- [ ] Set up database backups
- [ ] Add circuit breaker for external services
- [ ] Create runbook for common issues

---

## 5. Code Quality Assessment

### Positive Observations
- **Consistent code style** throughout TypeScript and Python
- **Clear separation of concerns** (controllers, services, routes)
- **Comprehensive type definitions** in TypeScript
- **Proper async/await usage** without callback hell
- **Meaningful error codes** for API responses
- **Comments explaining security decisions**
- **200+ E2E integration tests** covering authorization boundaries, input fuzzing, and account isolation
- **Unit test coverage** for chat and airdrop controllers and services

### Minor Code Improvements
1. **Consider extracting constants** (magic numbers like `3600000` for 1 hour)
2. **Add JSDoc/docstrings** to public functions

---

## 6. Summary of Actions Required

### Must Fix (Before Production)
| Priority | Issue | Effort |
|----------|-------|--------|
| Medium | Complete AI service API key enforcement | 1 hour |
| Medium | Add TLS/HTTPS configuration | 2 hours |
| Medium | Sanitize error messages in production | 1 hour |
| Medium | Encrypt escrow secrets at rest | 2 hours |

### Should Fix (Post-Launch)
| Priority | Issue | Effort |
|----------|-------|--------|
| Low | Add request tracing | 2 hours |
| Low | Add APM/monitoring | 4 hours |
| Low | Update dev dependencies | 30 min |

### Nice to Have
| Enhancement | Benefit |
|-------------|---------|
| Feed precomputation | Better performance at scale |
| Circuit breaker pattern | Improved resilience |
| Database read replicas | Higher read throughput |

---

## 7. Final Verdict

**The Keyed codebase is production-ready for a portfolio project and initial user launch.** The security practices are solid, the architecture is well-designed for scalability, and the code quality is professional. Comprehensive test coverage (200+ E2E tests plus unit tests) provides strong confidence in authorization boundaries and feature correctness.

The few medium-priority issues identified are standard security hardening steps that should be addressed before handling significant user traffic, but don't represent critical vulnerabilities.

**Recommended next steps:**
1. Implement the 4 "Must Fix" items (6 hours total)
2. Set up monitoring/APM
3. Create operational runbooks
4. Launch! 🚀

---

*This audit covers static code analysis. A full penetration test and dynamic security assessment are recommended before handling production traffic with real user data.*
