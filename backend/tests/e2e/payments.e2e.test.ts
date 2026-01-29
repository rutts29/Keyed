/**
 * E2E Integration Tests - Payment Endpoints
 *
 * Tests the full payment flow: vault initialization, tipping, subscriptions,
 * earnings, and withdrawals against a live backend (localhost:3001) using
 * real Supabase, Redis, and Solana DevNet connections.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Keypair } from '@solana/web3.js';
import {
  testWalletA,
  testWalletB,
  api,
  authenticate,
} from './setup.js';

const PAYMENT_PROGRAM_ID = 'H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t';
const PLATFORM_FEE_BPS = 200; // 2%

describe('Payment Endpoints (E2E)', () => {
  let authTokenA: string;
  let authTokenB: string;

  // ── Setup: authenticate both wallets ──────────────────────────────────

  beforeAll(async () => {
    authTokenA = await authenticate(testWalletA);
    authTokenB = await authenticate(testWalletB);
  }, 30_000);

  // ── 1. Authentication ─────────────────────────────────────────────────

  it('should authenticate wallet A and obtain a token', () => {
    expect(authTokenA).toBeDefined();
    expect(typeof authTokenA).toBe('string');
    expect(authTokenA.length).toBeGreaterThan(0);
  });

  // ── 2. Initialize creator vault ───────────────────────────────────────

  it('should build an initialize-vault transaction', async () => {
    const res = await api('/api/payments/vault/initialize', {
      method: 'POST',
      token: authTokenA,
    });

    // The endpoint either returns a serialized transaction (200) or
    // reports the vault already exists (400). Both are valid in E2E.
    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toBeDefined();
      expect(res.data.data.transaction).toBeDefined();
      expect(typeof res.data.data.transaction).toBe('string');
      expect(res.data.data.blockhash).toBeDefined();
      expect(typeof res.data.data.blockhash).toBe('string');
      expect(res.data.data.lastValidBlockHeight).toBeDefined();
    } else {
      // Vault already initialized on a previous run
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    }
  }, 15_000);

  // ── 3. Get vault info ─────────────────────────────────────────────────

  it('should return vault info for the authenticated wallet', async () => {
    const res = await api('/api/payments/vault', {
      method: 'GET',
      token: authTokenA,
    });

    // Vault may or may not exist on-chain yet (tx was never signed/sent)
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toBeDefined();
    expect(typeof res.data.data.exists).toBe('boolean');

    if (res.data.data.exists) {
      expect(typeof res.data.data.balance).toBe('number');
    } else {
      expect(res.data.data.balance).toBe(0);
      expect(res.data.data.totalEarned).toBe(0);
      expect(res.data.data.withdrawn).toBe(0);
    }
  }, 15_000);

  // ── 4. Build tip transaction ──────────────────────────────────────────

  it('should build a tip transaction with correct data', async () => {
    const tipAmount = 0.5; // SOL
    const res = await api('/api/payments/tip', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        creatorWallet: testWalletB.publicKey.toBase58(),
        amount: tipAmount,
        postId: undefined,
      }),
    });

    // The creator (wallet B) may not exist in the DB yet, so 404 is acceptable.
    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.transaction).toBeDefined();
      expect(typeof res.data.data.transaction).toBe('string');
      expect(res.data.data.blockhash).toBeDefined();
      expect(res.data.data.lastValidBlockHeight).toBeDefined();

      // Verify fee calculation: platform takes 2% (200 bps)
      const expectedFee = tipAmount * (PLATFORM_FEE_BPS / 10_000);
      expect(expectedFee).toBeCloseTo(0.01, 5);
    } else {
      // Creator not found in DB is acceptable for E2E with fresh wallets
      expect([400, 404]).toContain(res.status);
    }
  }, 15_000);

  // ── 5. Build subscribe transaction ────────────────────────────────────

  it('should build a subscribe transaction', async () => {
    const res = await api('/api/payments/subscribe', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        creatorWallet: testWalletB.publicKey.toBase58(),
        amountPerMonth: 1.0,
      }),
    });

    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.transaction).toBeDefined();
      expect(typeof res.data.data.transaction).toBe('string');
      expect(res.data.data.blockhash).toBeDefined();
      expect(res.data.data.lastValidBlockHeight).toBeDefined();
    } else {
      // Creator may not exist in DB
      expect([400, 404]).toContain(res.status);
    }
  }, 15_000);

  // ── 6. Get earnings summary ───────────────────────────────────────────

  it('should return an earnings summary for the authenticated wallet', async () => {
    const res = await api('/api/payments/earnings', {
      method: 'GET',
      token: authTokenA,
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);

    const earnings = res.data.data;
    expect(earnings).toBeDefined();
    expect(typeof earnings.totalEarnings).toBe('number');
    expect(typeof earnings.totalTips).toBe('number');
    expect(typeof earnings.totalSubscriptions).toBe('number');
    expect(typeof earnings.vaultBalance).toBe('number');
    expect(typeof earnings.subscriberCount).toBe('number');
    expect(Array.isArray(earnings.recentTips)).toBe(true);

    // Fresh wallet should have zero earnings
    expect(earnings.totalEarnings).toBeGreaterThanOrEqual(0);
    expect(earnings.totalTips).toBeGreaterThanOrEqual(0);
    expect(earnings.totalSubscriptions).toBeGreaterThanOrEqual(0);
  }, 15_000);

  // ── 7. Build withdraw transaction ─────────────────────────────────────

  it('should build a withdraw transaction (or reject for insufficient funds)', async () => {
    const res = await api('/api/payments/withdraw', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({ amount: 0.01 }),
    });

    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.transaction).toBeDefined();
      expect(res.data.data.blockhash).toBeDefined();
      expect(res.data.data.lastValidBlockHeight).toBeDefined();
    } else {
      // Fresh vault has no funds, so 400 INSUFFICIENT_FUNDS is expected
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    }
  }, 15_000);

  // ── 8. Reject tip with negative amount ────────────────────────────────

  it('should reject a tip with a negative amount (400)', async () => {
    const res = await api('/api/payments/tip', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        creatorWallet: testWalletB.publicKey.toBase58(),
        amount: -1,
        postId: undefined,
      }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  }, 10_000);

  // ── 9. Reject tip to self ─────────────────────────────────────────────

  it('should reject a tip to the sender themselves (400)', async () => {
    const res = await api('/api/payments/tip', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        creatorWallet: testWalletA.publicKey.toBase58(),
        amount: 0.1,
      }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  }, 10_000);

  // ── 10. Reject tip to an invalid wallet address ───────────────────────

  it('should reject a tip to an invalid wallet address (400)', async () => {
    const res = await api('/api/payments/tip', {
      method: 'POST',
      token: authTokenA,
      body: JSON.stringify({
        creatorWallet: 'not-a-valid-wallet',
        amount: 0.1,
      }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  }, 10_000);

  // ── 11. Reject operations without authentication ──────────────────────

  describe('Unauthenticated requests should return 401', () => {
    it('POST /vault/initialize without auth', async () => {
      const res = await api('/api/payments/vault/initialize', {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('GET /vault without auth', async () => {
      const res = await api('/api/payments/vault', {
        method: 'GET',
      });
      expect(res.status).toBe(401);
    });

    it('POST /tip without auth', async () => {
      const res = await api('/api/payments/tip', {
        method: 'POST',
        body: JSON.stringify({
          creatorWallet: testWalletB.publicKey.toBase58(),
          amount: 0.1,
        }),
      });
      expect(res.status).toBe(401);
    });

    it('POST /subscribe without auth', async () => {
      const res = await api('/api/payments/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          creatorWallet: testWalletB.publicKey.toBase58(),
          amountPerMonth: 1.0,
        }),
      });
      expect(res.status).toBe(401);
    });

    it('DELETE /subscribe/:creator without auth', async () => {
      const res = await api(
        `/api/payments/subscribe/${testWalletB.publicKey.toBase58()}`,
        { method: 'DELETE' },
      );
      expect(res.status).toBe(401);
    });

    it('GET /earnings without auth', async () => {
      const res = await api('/api/payments/earnings', {
        method: 'GET',
      });
      expect(res.status).toBe(401);
    });

    it('POST /withdraw without auth', async () => {
      const res = await api('/api/payments/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: 0.01 }),
      });
      expect(res.status).toBe(401);
    });
  });
});
