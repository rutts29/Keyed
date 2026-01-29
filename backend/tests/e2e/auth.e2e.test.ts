/**
 * E2E Auth Tests
 *
 * Tests the full authentication flow: challenge generation, signature
 * verification, JWT issuance, token refresh, and error handling.
 *
 * Runs against a live backend (localhost:3001) with real Supabase + Redis.
 */
import { describe, it, expect } from 'vitest';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { api, signMessage, authenticate, testWalletA } from './setup.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Decode a JWT payload without verification (for inspecting claims). */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1];
  return JSON.parse(Buffer.from(base64, 'base64url').toString());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth - Challenge', () => {
  it('should generate a challenge for a valid wallet', async () => {
    const wallet = Keypair.generate();
    const res = await api('/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ wallet: wallet.publicKey.toBase58() }),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('message');
    expect(res.data.data).toHaveProperty('nonce');
    expect(typeof res.data.data.message).toBe('string');
    expect(typeof res.data.data.nonce).toBe('string');
    expect(res.data.data.message.length).toBeGreaterThan(0);
    expect(res.data.data.nonce.length).toBeGreaterThan(0);
  });

  it('should reject a challenge request with missing wallet', async () => {
    const res = await api('/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    // The server should respond with an error (400 or 500) when wallet is missing
    expect(res.ok).toBe(false);
    expect(res.data.success).not.toBe(true);
  });
});

describe('Auth - Verify', () => {
  it('should verify a valid signature and return a JWT token', async () => {
    const wallet = Keypair.generate();
    const walletAddress = wallet.publicKey.toBase58();

    // Step 1: Get challenge
    const challengeRes = await api('/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ wallet: walletAddress }),
    });
    expect(challengeRes.ok).toBe(true);

    const { message } = challengeRes.data.data;

    // Step 2: Sign the challenge message
    const signature = signMessage(message, wallet);

    // Step 3: Verify
    const verifyRes = await api('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ wallet: walletAddress, signature }),
    });

    expect(verifyRes.ok).toBe(true);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.data.success).toBe(true);
    expect(verifyRes.data.data).toHaveProperty('token');
    expect(verifyRes.data.data).toHaveProperty('wallet', walletAddress);
    expect(typeof verifyRes.data.data.token).toBe('string');
    expect(verifyRes.data.data.token.split('.')).toHaveLength(3); // valid JWT structure
  });

  it('should reject an invalid signature', async () => {
    const wallet = Keypair.generate();
    const walletAddress = wallet.publicKey.toBase58();

    // Get a challenge
    const challengeRes = await api('/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ wallet: walletAddress }),
    });
    expect(challengeRes.ok).toBe(true);

    // Sign with a DIFFERENT wallet (wrong private key)
    const wrongWallet = Keypair.generate();
    const badSignature = signMessage(challengeRes.data.data.message, wrongWallet);

    const verifyRes = await api('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ wallet: walletAddress, signature: badSignature }),
    });

    expect(verifyRes.ok).toBe(false);
    expect(verifyRes.status).toBe(401);
    expect(verifyRes.data.success).toBe(false);
  });

  it('should reject an empty signature', async () => {
    const wallet = Keypair.generate();
    const walletAddress = wallet.publicKey.toBase58();

    // Get a challenge first so there is a stored nonce
    await api('/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ wallet: walletAddress }),
    });

    const verifyRes = await api('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ wallet: walletAddress, signature: '' }),
    });

    expect(verifyRes.ok).toBe(false);
    expect(verifyRes.data.success).not.toBe(true);
  });
});

describe('Auth - Full Flow', () => {
  it('should complete the full auth flow: challenge -> sign -> verify -> use token', async () => {
    const wallet = Keypair.generate();
    const walletAddress = wallet.publicKey.toBase58();

    // 1. Request challenge
    const challengeRes = await api('/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ wallet: walletAddress }),
    });
    expect(challengeRes.ok).toBe(true);
    const { message, nonce } = challengeRes.data.data;
    expect(message).toBeTruthy();
    expect(nonce).toBeTruthy();

    // 2. Sign the challenge
    const signature = signMessage(message, wallet);
    expect(signature).toBeTruthy();

    // 3. Verify signature and obtain token
    const verifyRes = await api('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ wallet: walletAddress, signature }),
    });
    expect(verifyRes.ok).toBe(true);
    const token = verifyRes.data.data.token;
    expect(token).toBeTruthy();

    // 4. Use the token on a protected endpoint (feed requires auth)
    const protectedRes = await api('/api/feed', {
      method: 'GET',
      token,
    });

    // The request should be authenticated (not 401).
    // It may return 200 or another non-auth-error status depending on data,
    // but it must NOT be a 401 Unauthorized.
    expect(protectedRes.status).not.toBe(401);
  });

  it('should verify JWT contains the correct wallet address', async () => {
    const wallet = Keypair.generate();
    const walletAddress = wallet.publicKey.toBase58();

    const token = await authenticate(wallet);
    expect(token).toBeTruthy();

    const payload = decodeJwtPayload(token);
    expect(payload.wallet).toBe(walletAddress);
    // JWT should have standard claims
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('exp');
    // Expiry should be ~7 days from issuance
    const iat = payload.iat as number;
    const exp = payload.exp as number;
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    expect(exp - iat).toBe(sevenDaysInSeconds);
  });
});

describe('Auth - Token Refresh', () => {
  it('should refresh a valid token', async () => {
    const wallet = Keypair.generate();
    const walletAddress = wallet.publicKey.toBase58();

    // Authenticate first
    const originalToken = await authenticate(wallet);

    // Refresh the token
    const refreshRes = await api('/api/auth/refresh', {
      method: 'POST',
      token: originalToken,
    });

    expect(refreshRes.ok).toBe(true);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.data.success).toBe(true);
    expect(refreshRes.data.data).toHaveProperty('token');
    expect(refreshRes.data.data).toHaveProperty('wallet', walletAddress);
    // New token should be a valid JWT (3 dot-separated parts)
    expect(refreshRes.data.data.token.split('.')).toHaveLength(3);
    // The new token should still contain the correct wallet
    const newPayload = decodeJwtPayload(refreshRes.data.data.token);
    expect(newPayload.wallet).toBe(walletAddress);
  });

  it('should reject refresh with an expired or invalid JWT', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJ3YWxsZXQiOiJmYWtlIiwiaWF0IjoxMDAwMDAwMDAwLCJleHAiOjEwMDAwMDAwMDF9.' +
      'invalidsignature';

    const refreshRes = await api('/api/auth/refresh', {
      method: 'POST',
      token: fakeToken,
    });

    expect(refreshRes.ok).toBe(false);
    expect(refreshRes.status).toBe(401);
    expect(refreshRes.data.success).toBe(false);
    expect(refreshRes.data.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should reject refresh without an authorization header', async () => {
    const refreshRes = await api('/api/auth/refresh', {
      method: 'POST',
    });

    expect(refreshRes.ok).toBe(false);
    expect(refreshRes.status).toBe(401);
    expect(refreshRes.data.success).toBe(false);
    expect(refreshRes.data.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

describe('Auth - Protected Endpoints', () => {
  it('should reject a request without an auth header on a protected endpoint', async () => {
    // /api/feed requires authMiddleware
    const res = await api('/api/feed', {
      method: 'GET',
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(res.data.success).toBe(false);
    expect(res.data.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});
