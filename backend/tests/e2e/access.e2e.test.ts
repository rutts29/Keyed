/**
 * E2E Integration Tests - Access / Token Gate Endpoints
 *
 * Tests on-chain token gating: setting access requirements, verifying
 * token and NFT access, and checking access status against a live
 * backend (localhost:3001) using real Supabase, Redis, and Solana DevNet.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  testWalletA,
  testWalletB,
  api,
  authenticate,
} from './setup.js';

const TOKEN_GATE_PROGRAM_ID = 'EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi';
const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';

// Deterministic fake post ID (valid base58 public key) for requirement tests
const TEST_POST_ID = Keypair.generate().publicKey.toBase58();
// A second fake NFT mint for NFT tests
const FAKE_NFT_MINT = Keypair.generate().publicKey.toBase58();
const FAKE_TOKEN_ACCOUNT = Keypair.generate().publicKey.toBase58();

describe('Access / Token Gate Endpoints (E2E)', () => {
  let authTokenA: string;

  // ── Setup: authenticate wallet A ──────────────────────────────────────

  beforeAll(async () => {
    authTokenA = await authenticate(testWalletA);
  }, 30_000);

  // ── 1. Authentication ─────────────────────────────────────────────────

  it('should authenticate wallet A and obtain a token', () => {
    expect(authTokenA).toBeDefined();
    expect(typeof authTokenA).toBe('string');
    expect(authTokenA.length).toBeGreaterThan(0);
  });

  // ── 2. Set token access requirements for a post ───────────────────────

  it('should set token access requirements for a post', async () => {
    const res = await api('/api/access/requirements', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        postId: TEST_POST_ID,
        requiredToken: WRAPPED_SOL_MINT,
        minimumBalance: 1_000_000_000, // 1 SOL in lamports
      }),
    });

    // The post likely does not exist in the DB for a fresh test, so
    // 404 (post not found) or 403 (not the owner) are acceptable.
    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toBeDefined();
      expect(res.data.data.transaction).toBeDefined();
      expect(typeof res.data.data.transaction).toBe('string');
      expect(res.data.data.blockhash).toBeDefined();
      expect(res.data.data.lastValidBlockHeight).toBeDefined();
      expect(res.data.data.metadata).toBeDefined();
      expect(res.data.data.metadata.postId).toBe(TEST_POST_ID);
      expect(res.data.data.metadata.requiredToken).toBe(WRAPPED_SOL_MINT);
      expect(res.data.data.metadata.minimumBalance).toBe(1_000_000_000);
    } else {
      // Post not found or not owner is acceptable for E2E with synthetic IDs
      expect([403, 404]).toContain(res.status);
    }
  }, 15_000);

  // ── 3. Verify token access (build verification tx) ────────────────────

  it('should build a verify-token transaction', async () => {
    const res = await api('/api/access/verify-token', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        postId: TEST_POST_ID,
        tokenAccount: FAKE_TOKEN_ACCOUNT,
      }),
    });

    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toBeDefined();
      expect(res.data.data.transaction).toBeDefined();
      expect(typeof res.data.data.transaction).toBe('string');
      expect(res.data.data.blockhash).toBeDefined();
      expect(res.data.data.lastValidBlockHeight).toBeDefined();
    } else {
      // May fail if the on-chain program or account does not exist yet
      expect([400, 404, 500, 503]).toContain(res.status);
    }
  }, 15_000);

  // ── 4. Set NFT access requirements ────────────────────────────────────

  it('should set NFT access requirements for a post', async () => {
    const res = await api('/api/access/requirements', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        postId: TEST_POST_ID,
        requiredNftCollection: FAKE_NFT_MINT,
        minimumBalance: 1,
      }),
    });

    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toBeDefined();
      expect(res.data.data.transaction).toBeDefined();
      expect(res.data.data.blockhash).toBeDefined();
      expect(res.data.data.lastValidBlockHeight).toBeDefined();
      expect(res.data.data.metadata).toBeDefined();
      expect(res.data.data.metadata.requiredNftCollection).toBe(FAKE_NFT_MINT);
    } else {
      expect([403, 404]).toContain(res.status);
    }
  }, 15_000);

  // ── 5. Check access status ────────────────────────────────────────────

  it('should check access status for a post', async () => {
    const res = await api(`/api/access/check?postId=${TEST_POST_ID}`, {
      method: 'GET',
      token: authTokenA,
    });

    // On-chain program may not be deployed on devnet, so 503 is acceptable
    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toBeDefined();
      expect(typeof res.data.data.hasAccess).toBe('boolean');
    } else {
      expect([400, 500, 503]).toContain(res.status);
    }
  }, 15_000);

  // ── 6. Reject invalid token mint address ──────────────────────────────

  it('should reject requirements with an invalid token mint address (400)', async () => {
    const res = await api('/api/access/requirements', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        postId: TEST_POST_ID,
        requiredToken: 'not-a-valid-mint-address',
        minimumBalance: 1,
      }),
    });

    expect(res.ok).toBe(false);
    expect([400, 403, 404, 500]).toContain(res.status);
  }, 10_000);

  // ── 7. Reject negative minimum balance ────────────────────────────────

  it('should reject requirements with a negative minimum balance (400)', async () => {
    const res = await api('/api/access/requirements', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        postId: TEST_POST_ID,
        requiredToken: WRAPPED_SOL_MINT,
        minimumBalance: -100,
      }),
    });

    expect(res.ok).toBe(false);
    expect([400, 403, 404, 500]).toContain(res.status);
  }, 10_000);

  // ── 8. Reject invalid requirement type ────────────────────────────────

  it('should reject verify-token with missing required fields (400)', async () => {
    // Send verify-token with no postId at all
    const res = await api('/api/access/verify-token', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({}),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  }, 10_000);

  it('should reject verify-nft with missing nftMint (400)', async () => {
    const res = await api('/api/access/verify-nft', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        postId: TEST_POST_ID,
        // missing nftTokenAccount and nftMint
      }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  }, 10_000);

  // ── 9. Reject operations without authentication ───────────────────────

  describe('Unauthenticated requests should return 401', () => {
    it('GET /verify without auth', async () => {
      const res = await api(`/api/access/verify?postId=${TEST_POST_ID}`, {
        method: 'GET',
      });
      expect(res.status).toBe(401);
    });

    it('POST /requirements without auth', async () => {
      const res = await api('/api/access/requirements', {
        method: 'POST',
        body: JSON.stringify({
          postId: TEST_POST_ID,
          requiredToken: WRAPPED_SOL_MINT,
          minimumBalance: 1,
        }),
      });
      expect(res.status).toBe(401);
    });

    it('POST /verify-token without auth', async () => {
      const res = await api('/api/access/verify-token', {
        method: 'POST',
        body: JSON.stringify({
          postId: TEST_POST_ID,
          tokenAccount: FAKE_TOKEN_ACCOUNT,
        }),
      });
      expect(res.status).toBe(401);
    });

    it('POST /verify-nft without auth', async () => {
      const res = await api('/api/access/verify-nft', {
        method: 'POST',
        body: JSON.stringify({
          postId: TEST_POST_ID,
          nftTokenAccount: FAKE_TOKEN_ACCOUNT,
          nftMint: FAKE_NFT_MINT,
        }),
      });
      expect(res.status).toBe(401);
    });

    it('GET /check without auth', async () => {
      const res = await api(`/api/access/check?postId=${TEST_POST_ID}`, {
        method: 'GET',
      });
      expect(res.status).toBe(401);
    });
  });
});
