# SolShare Integration Tests

This directory contains integration test scripts for end-to-end testing of the deployed SolShare platform.

## Prerequisites

- Node.js 22+
- All services deployed and running (Backend, AI Service)
- Solana CLI with devnet wallet configured
- Environment variables set

## Setup

```bash
cd scripts/integration-tests
npm install
```

## Environment Variables

Create a `.env` file:

```bash
# Backend API URL
BACKEND_URL=https://api.solshare.app
# or for local testing: http://localhost:3001

# Test wallet (devnet)
TEST_WALLET_PRIVATE_KEY=your-base58-private-key

# AI Service URL (for direct testing)
AI_SERVICE_URL=http://localhost:8000
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:auth
npm run test:posts
npm run test:search
npm run test:payments
npm run test:access
```

## Test Suites

### 1. Auth Flow (`test-auth.ts`)
- Request challenge from backend
- Sign challenge with wallet
- Verify JWT issuance
- Test token refresh

### 2. Post Creation Flow (`test-posts.ts`)
- Upload image to backend
- AI moderation check
- Create post with IPFS storage
- Verify AI analysis queue
- Check Qdrant indexing

### 3. Search Flow (`test-search.ts`)
- Semantic search queries
- Tag-based search
- User search
- Autocomplete suggestions

### 4. Payment Flow (`test-payments.ts`)
- Initialize creator vault
- Send tip transaction
- Subscribe to creator
- Withdraw earnings

### 5. Token Gate Flow (`test-access.ts`)
- Set access requirements
- Verify token-based access
- Verify NFT-based access
- Check access status

## Manual Testing Checklist

- [ ] Auth: Can sign in with Phantom/Solflare wallet
- [ ] Auth: JWT token received and stored
- [ ] Posts: Can upload image (check R2 storage)
- [ ] Posts: Moderation passes for safe content
- [ ] Posts: Moderation blocks unsafe content
- [ ] Posts: AI description generated
- [ ] Posts: Post indexed in Qdrant
- [ ] Feed: Personalized feed loads
- [ ] Search: Semantic search returns relevant results
- [ ] Payments: Tip transaction succeeds
- [ ] Payments: Subscription active
- [ ] Access: Token-gated content access works
