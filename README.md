# Keyed

**Privacy-First Social Media on Solana**

A decentralized social platform where creators monetize directly, users own their data, and privacy is built into the protocol — not bolted on as an afterthought.

**Live Demo:** [https://frontend-beryl-omega-38.vercel.app](https://frontend-beryl-omega-38.vercel.app)

> **Privacy Hack Hackathon Note:** Privacy Cash features (anonymous tipping, shielded balances) run on **Solana Mainnet** via zero-knowledge proofs. All other features (social graph, payments, token gating, airdrops) run on **Devnet** for rapid iteration.

---

## Why Keyed?

Traditional social media harvests your data, suppresses your content, and takes 30%+ cuts from creators. Keyed flips this model:

- **Creators keep 98%** of tips and subscriptions
- **Anonymous tipping** via zero-knowledge proofs — support creators without revealing identity
- **No data harvesting** — your social graph, your control
- **Open source** — audit every line of code
- **AI-powered discovery** without algorithmic manipulation

The entire codebase is transparent. No hidden algorithms, no shadow bans, no corporate data mining.

---

## Features

| Feature | Description |
|---------|-------------|
| **Wallet-Based Identity** | No passwords, no email harvesting. Sign in with Phantom, Solflare, or any Solana wallet |
| **Anonymous Tipping** | Privacy-preserving tips using zero-knowledge proofs on mainnet |
| **Creator Monetization** | Native tips, subscriptions, and instant withdrawals via Solana |
| **Token-Gated Content** | Restrict posts and chat rooms by token/NFT ownership |
| **Airdrop Campaigns** | Distribute SPL tokens to followers, tippers, or custom audiences with on-chain escrow |
| **AI-Powered Discovery** | Semantic search and personalized feed powered by GPT-5.2 + Voyage embeddings |
| **Real-Time Chat** | Creator-hosted chat rooms with optional token gating |
| **Decentralized Storage** | Content stored on IPFS with Cloudflare R2 CDN |
| **Smart Moderation** | Multi-stage AI content safety pipeline with perceptual hashing |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          KEYED PLATFORM                             │
├────────────────┬────────────────┬────────────────┬─────────────────┤
│   Frontend     │   Backend API  │   AI Service   │  Solana         │
│   (Next.js 16) │   (Express.js) │   (FastAPI)    │  Programs       │
├────────────────┼────────────────┼────────────────┼─────────────────┤
│                │                │                │                 │
│   Supabase     │  Cloudflare    │    Qdrant      │  Devnet:        │
│   PostgreSQL   │  R2 + IPFS     │   (Vectors)    │  Payment        │
│                │                │                │  Token Gate     │
│                │                │                │  Airdrop        │
│                │                │                │                 │
│                │                │                │  Mainnet:       │
│                │                │                │  Privacy Cash   │
│                │                │                │  (ZK proofs)    │
└────────────────┴────────────────┴────────────────┴─────────────────┘
```

### Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Blockchain** | Solana (Devnet + Mainnet), Anchor (Rust), SPL Tokens, Helius RPC |
| **Backend** | Express.js, TypeScript, BullMQ, Zod validation |
| **AI/ML** | FastAPI, OpenAI GPT-5.2, Voyage AI embeddings (1024-dim), Qdrant vector DB |
| **Database** | Supabase (PostgreSQL), Redis (caching + queues) |
| **Storage** | Cloudflare R2, IPFS (Pinata) |
| **Frontend** | Next.js 16, React 19, Tailwind CSS, Radix UI, Zustand |

---

## Solana Programs

Three on-chain programs handle money flows with trustless verification:

| Program | Purpose |
|---------|---------|
| **Payment** | Creator vaults, tips, subscriptions, withdrawals (2% platform fee) |
| **Token Gate** | Access control via token/NFT ownership verification |
| **Airdrop** | Campaign escrow, batch distribution with crank authority, refunds |

Social interactions (posts, likes, follows, comments) use fast database operations for smooth UX — no wallet popups for every interaction.

---

## Privacy Layer

Keyed integrates [Privacy Cash](https://privacycash.org) for **anonymous tipping on Solana mainnet**:

- **Client-side ZK proof generation** — no server-side trust required
- **Shielded SOL pool** — break the link between tipper and recipient
- **Encrypted UTXO scanning** — only you can see your shielded balance
- **No tipper identity stored** — cryptographically impossible to trace

The privacy layer is fully independent from other features. Anonymous tips work on mainnet today while core platform features iterate on devnet.

---

## AI Pipelines

**Content Moderation** — Pre-upload safety check using GPT-5.2 with escalation for borderline content. Scores across NSFW, violence, hate speech, child safety, spam, and drugs/weapons. Perceptual hashing blocklist for repeat violations.

**Content Analysis** — Vision analysis of uploaded images generating descriptions, tags, scene types, mood, and alt text. Produces 1024-dimension embeddings indexed in Qdrant for discovery.

**Recommendation Engine** — Multi-stage pipeline inspired by Twitter's open-source algorithm:
1. Candidate sourcing (in-network + out-of-network)
2. Hydration with engagement signals
3. Multi-action engagement scoring with freshness bonus
4. Top-K selection with creator diversity enforcement

**Semantic Search** — Query expansion via LLM, Voyage embedding, Qdrant vector similarity, and optional re-ranking.

---

## Security

- Rate limiting on all API endpoints
- JWT authentication with 7-day expiry
- AI content moderation before indexing
- Perceptual hashing blocklist for repeat violations
- CORS restricted to frontend origin
- AI service isolated on internal network
- Parameterized queries prevent SQL injection
- Zod input validation on all endpoints
- Zero-knowledge proofs for anonymous tipping (no tipper identity stored)

See the [Security Audit Report](docs/SECURITY_AUDIT_REPORT.md) for full assessment.

---

## Current Status

**Live Features:**
- Wallet authentication (Dynamic.xyz)
- Content creation with AI analysis
- Semantic search and personalized feed
- Creator payments (tips, subscriptions, withdrawals)
- Token-gated content and chat rooms
- Airdrop campaigns with on-chain escrow
- Anonymous tipping via zero-knowledge proofs (mainnet)
- Real-time notifications

**Roadmap:**
- Encrypted end-to-end DMs
- Enhanced privacy controls for social graph
- Decentralized content moderation appeals
- Full mainnet deployment

---

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

---

## Documentation

| Document | Description |
|----------|-------------|
| [Technical Docs](docs/TECHNICAL_DOCS.md) | Setup, deployment, API reference |
| [Codemap](docs/CODEMAP.md) | Detailed codebase walkthrough and data flows |
| [AI Service](ai-service/docs/AI_SERVICE_IMPLEMENTATION.md) | ML pipeline implementation |
| [Privacy Integration](docs/PRIVACY_INTEGRATION_STATUS.md) | ZK anonymous tipping architecture |
| [Security Audit](docs/SECURITY_AUDIT_REPORT.md) | Security findings and recommendations |
| [Frontend Spec](docs/FRONTEND_TECHNICAL_SPEC.md) | Component architecture and design system |

---

## Quick Start

```bash
git clone https://github.com/rutts29/solShare.git
cd solShare

# Backend
cd backend && cp .env.example .env && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

See [Technical Docs](docs/TECHNICAL_DOCS.md) for full setup including Solana programs and AI service.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests and verify your changes
4. Submit a pull request

---

## Support

- [GitHub Issues](https://github.com/rutts29/solShare/issues)

## License

MIT License — see [LICENSE](LICENSE) for details.
