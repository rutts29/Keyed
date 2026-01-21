# SolShare

A decentralized social media platform built on Solana with AI-powered content discovery and creator monetization.

## What is SolShare?

SolShare reimagines social media for Web3 — combining the best of decentralized technology with modern AI capabilities to create a platform where **creators own their content and monetize directly**.

## Key Features

| Feature | Description |
|---------|-------------|
| **Wallet-Based Identity** | No passwords. Sign in with Phantom, Solflare, or any Solana wallet |
| **AI-Powered Discovery** | Semantic search finds content by meaning, not just keywords |
| **Creator Monetization** | Native tips, subscriptions, and withdrawals via Solana — no middlemen |
| **Anonymous Tipping** | Privacy-preserving tips using zero-knowledge proofs — support creators without revealing your identity |
| **Token-Gated Content** | Restrict access by token or NFT ownership for exclusive content |
| **Decentralized Storage** | Content stored on IPFS, ensuring permanence and censorship resistance |
| **Smart Moderation** | AI-driven content safety without centralized control |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SolShare Platform                           │
├─────────────────┬─────────────────┬─────────────────┬───────────────┤
│   Frontend      │   Backend API   │   AI Service    │    Solana     │
│   (Next.js)     │   (Express.js)  │   (FastAPI)     │   Programs    │
└────────┬────────┴────────┬────────┴────────┬────────┴───────┬───────┘
         │                 │                 │                │
    ┌────▼────┐      ┌─────▼─────┐     ┌─────▼─────┐    ┌─────▼─────┐
    │ Supabase│      │Cloudflare │     │  Qdrant   │    │  Devnet   │
    │PostgreSQL      │  R2/IPFS  │     │ (Vectors) │    │ (Anchor)  │
    └─────────┘      └───────────┘     └───────────┘    └───────────┘
```

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Blockchain** | Solana, Anchor (Rust), SPL Tokens |
| **Backend** | Express.js, TypeScript, BullMQ |
| **AI/ML** | FastAPI, OpenAI GPT-5.2, Voyage AI Embeddings |
| **Database** | Supabase (PostgreSQL), Qdrant (Vector DB), Upstash Redis |
| **Storage** | Cloudflare R2, IPFS (Pinata) |
| **Infrastructure** | Railway, Docker |

## Solana Programs

Three on-chain programs power SolShare's Web3 functionality:

| Program | Purpose |
|---------|---------|
| **Social** | Profiles, posts, follows, likes — the social graph on-chain |
| **Payment** | Creator vaults, tips, subscriptions, withdrawals |
| **Token Gate** | Access control via token/NFT ownership verification |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/solshare.git
cd solshare

# Install dependencies
cd backend && npm install
cd ../ai-service && pip install -r requirements.txt

# Configure environment
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env

# Start services
cd backend && npm run dev          # API server
cd ai-service && uvicorn app.main:app --reload  # AI service
```

## Project Structure

```
solshare/
├── frontend/          # Next.js web application
├── backend/           # Express.js API + BullMQ workers
├── ai-service/        # FastAPI AI/ML microservice
├── solshare/          # Anchor programs (Rust)
└── scripts/           # Deployment & integration tests
```

## Documentation

- **[Technical Documentation](docs/TECHNICAL_DOCS.md)** — Deployment guides, API reference, environment setup
- **[Privacy Integration](docs/PRIVACY_INTEGRATION_STATUS.md)** — Anonymous tipping architecture and ZK implementation
- **[Frontend Spec](docs/FRONTEND_TECHNICAL_SPEC.md)** — Frontend architecture and components
- **[AI Service Docs](ai-service/docs/AI_SERVICE_IMPLEMENTATION.md)** — ML pipeline details
- **[Security Audit](docs/SECURITY_AUDIT_REPORT.md)** — Security considerations and audit findings

## Status

Currently deployed on **Solana Devnet** with full functionality:
- ✅ Wallet authentication
- ✅ Content creation & AI analysis
- ✅ Semantic search
- ✅ Creator payments (tips & subscriptions)
- ✅ Token-gated content
- ✅ Real-time notifications
- ✅ Privacy-preserving anonymous tipping (ZK proofs)

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built for the decentralized future of social media.*
