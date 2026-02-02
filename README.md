# Keyed

*Formerly SolShare*

A decentralized social media platform built on Solana with AI-powered content discovery and creator monetization.

## What is Keyed?

Keyed reimagines social media for Web3 — combining decentralized technology with modern AI to create a platform where **creators own their content and monetize directly**. No middlemen, no data harvesting, no algorithmic suppression.

The entire codebase is open source for transparency and trust.

## Features

| Feature | Description |
|---------|-------------|
| **Wallet-Based Identity** | No passwords. Sign in with Phantom, Solflare, or any Solana wallet |
| **AI-Powered Discovery** | Semantic search and personalized feed powered by GPT-5.2 + Voyage embeddings |
| **Creator Monetization** | Native tips, subscriptions, and withdrawals via Solana |
| **Anonymous Tipping** | Privacy-preserving tips using zero-knowledge proofs |
| **Token-Gated Content** | Restrict posts and chat rooms by token/NFT ownership |
| **Airdrop Campaigns** | Distribute SPL tokens or cNFTs to followers, tippers, or custom audiences |
| **Real-Time Chat** | Creator-hosted chat rooms with optional token gating |
| **Decentralized Storage** | Content stored on IPFS with Cloudflare R2 CDN |
| **Smart Moderation** | Multi-stage AI content safety pipeline with perceptual hashing |

## How It Works

### Architecture

```
+-----------------------------------------------------------------+
|                        Keyed Platform                            |
+----------------+----------------+----------------+--------------+
|   Frontend     |   Backend API  |   AI Service   |   Solana     |
|   (Next.js 16) |   (Express.js) |   (FastAPI)    |   Programs   |
+-------+--------+-------+--------+-------+--------+------+-------+
        |                |                |               |
   +----v----+     +-----v-----+    +-----v-----+   +----v-----+
   | Supabase|     |Cloudflare |    |  Qdrant   |   |  Devnet  |
   |PostgreSQL|    |  R2/IPFS  |    | (Vectors) |   | (Anchor) |
   +---------+     +-----------+    +-----------+   +----+-----+
                                                         |
                                                    +----v-----+
                                                    |  Mainnet  |
                                                    | (Privacy) |
                                                    +----------+
```

### Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Blockchain** | Solana (Devnet + Mainnet), Anchor (Rust), SPL Tokens, Helius RPC |
| **Backend** | Express.js, TypeScript, BullMQ, Zod |
| **AI/ML** | FastAPI, OpenAI GPT-5.2, Voyage AI 3.5 (1024-dim embeddings) |
| **Database** | Supabase (PostgreSQL), Qdrant (Vector DB), Redis |
| **Storage** | Cloudflare R2, IPFS (Pinata) |
| **Frontend** | Next.js 16, React 19, Tailwind CSS, Radix UI, Zustand |

### Solana Programs

Four on-chain programs deployed on Devnet:

| Program | Purpose |
|---------|---------|
| **Social** | Profiles, posts, follows, likes, comments |
| **Payment** | Creator vaults, tips, subscriptions, withdrawals (2% platform fee) |
| **Token Gate** | Access control via token/NFT ownership verification |
| **Airdrop** | Campaign escrow, batch distribution, refunds |

### AI Pipelines

**Content Moderation** — Pre-upload safety check using GPT-5.2 with escalation for borderline content. Scores across NSFW, violence, hate speech, child safety, spam, and drugs/weapons.

**Content Analysis** — Vision analysis of uploaded images generating descriptions, tags, scene types, mood, and alt text. Produces 1024-dimension embeddings indexed in Qdrant for discovery.

**Recommendation Engine** — Multi-stage pipeline inspired by Twitter's open-source algorithm: candidate sourcing (in-network + out-of-network), hydration, filtering, multi-action engagement scoring with freshness bonus, and top-K selection with creator diversity enforcement.

**Semantic Search** — Query expansion via LLM, Voyage embedding, Qdrant vector similarity, and optional re-ranking.

## Security

- Rate limiting on all API endpoints
- JWT authentication with 7-day expiry
- AI content moderation before indexing
- Perceptual hashing blocklist for repeat violations
- CORS restricted to frontend origin
- AI service isolated on internal network
- Parameterized queries prevent SQL injection
- Zod input validation on all endpoints
- Zero-knowledge proofs for anonymous tipping on mainnet (no tipper identity stored)

See the [Security Audit Report](docs/SECURITY_AUDIT_REPORT.md) for the full assessment.

## Project Structure

```
keyed/
├── frontend/          # Next.js 16 web application
├── backend/           # Express.js API + BullMQ workers
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── services/      # Business logic
│   │   ├── pipeline/      # Recommendation engine
│   │   ├── jobs/          # Background processors
│   │   └── middleware/    # Auth, rate limiting, validation
│   └── tests/             # Unit + E2E test suites
├── ai-service/        # FastAPI AI/ML microservice
├── solshare/          # Anchor programs (Rust)
├── privacy-cash-sdk/  # Zero-knowledge proofs library
└── docs/              # Technical documentation
```

## Network Architecture

Keyed uses a **hybrid devnet/mainnet** deployment strategy as the platform evolves toward full mainnet launch:

| Network | What runs there | Why |
|---------|----------------|-----|
| **Devnet** | Social graph, payments, token gating, airdrops (4 custom Anchor programs) | Rapid iteration on core social features without transaction costs during development |
| **Mainnet** | Privacy-preserving anonymous tips (Privacy Cash ZK proofs) | The Privacy Cash protocol and its relayer are mainnet-only — ZK proof verification and the shielded pool operate exclusively on mainnet |

The privacy layer is **fully independent** from the social/payment programs. It uses the [Privacy Cash](https://privacycash.org) SDK to generate client-side zero-knowledge proofs, shield SOL into a privacy pool, and withdraw to recipients without linking sender and receiver on-chain. This architecture allows anonymous tipping to work today on mainnet while the rest of the platform continues iterating on devnet ahead of a full mainnet deployment.

## Status

**Core platform (Devnet):**
- Wallet authentication (Dynamic.xyz)
- Content creation with AI analysis
- Semantic search and personalized feed
- Creator payments (tips, subscriptions, withdrawals)
- Token-gated content and chat rooms
- Real-time notifications
- Airdrop campaigns with on-chain distribution

**Privacy layer (Mainnet):**
- Anonymous tipping via zero-knowledge proofs
- Client-side ZK proof generation (no server-side trust)
- Shielded SOL pool with encrypted UTXO scanning

## Documentation

| Document | Description |
|----------|-------------|
| [Technical Docs](docs/TECHNICAL_DOCS.md) | Setup, deployment, API reference, environment configuration |
| [Docker Setup](docs/DOCKER.md) | Container orchestration and local development |
| [Codemap](docs/CODEMAP.md) | Detailed codebase walkthrough and data flows |
| [AI Service](ai-service/docs/AI_SERVICE_IMPLEMENTATION.md) | ML pipeline implementation details |
| [Privacy Integration](docs/PRIVACY_INTEGRATION_STATUS.md) | ZK anonymous tipping architecture |
| [Security Audit](docs/SECURITY_AUDIT_REPORT.md) | Security findings and recommendations |
| [Frontend Spec](docs/FRONTEND_TECHNICAL_SPEC.md) | Component architecture and design system |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests and verify your changes
4. Submit a pull request

See [Technical Docs](docs/TECHNICAL_DOCS.md) for development setup and architecture details.

## Support

- [GitHub Issues](https://github.com/rutts29/solShare/issues)

## License

MIT License — see [LICENSE](LICENSE) for details.
