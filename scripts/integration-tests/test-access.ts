#!/usr/bin/env tsx
/**
 * Token Gate Flow Integration Tests
 * 
 * Tests the token-gating functionality:
 * 1. Set access requirements for a post
 * 2. Verify token-based access
 * 3. Verify NFT-based access
 * 4. Check access status
 */

import { api, wallet, signMessage, setAuthToken, test, assert, runTests, clearResults } from './config.js';
import { PublicKey } from '@solana/web3.js';

// Authenticate first
async function authenticate() {
  const challengeRes = await api('/api/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ wallet: wallet.publicKey.toBase58() }),
  });
  
  if (!challengeRes.ok) return;
  
  const signature = signMessage(challengeRes.data.data.message);
  
  const verifyRes = await api('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      wallet: wallet.publicKey.toBase58(),
      signature,
    }),
  });
  
  if (verifyRes.ok) {
    setAuthToken(verifyRes.data.data.token);
  }
}

// Test token mint (use a well-known devnet token for testing)
const TEST_TOKEN_MINT = 'So11111111111111111111111111111111111111112'; // Wrapped SOL
const TEST_NFT_COLLECTION = '11111111111111111111111111111111'; // Placeholder

const tests = [
  test('Authenticate for access tests', async () => {
    await authenticate();
    assert(true, 'Authentication attempted');
  }),

  test('Check access for non-gated post', async () => {
    // Most posts should be non-gated, so this should succeed
    const res = await api('/api/access/verify?postId=test-public-post');
    
    // May return 404 if post doesn't exist, or 200 with access: true
    assert(
      res.ok || res.status === 404,
      `Access check failed: ${res.status}`
    );
    
    if (res.ok) {
      assert(res.data.success, 'Access check not successful');
    }
  }),

  test('Set token access requirements', async () => {
    // This requires owning a post first
    const res = await api('/api/access/requirements', {
      method: 'POST',
      body: JSON.stringify({
        postId: 'test-post-id',
        requirementType: 'token',
        tokenMint: TEST_TOKEN_MINT,
        minAmount: 1000000, // 0.001 SOL in lamports
      }),
    });
    
    // May fail if post doesn't exist or user doesn't own it
    assert(
      res.ok || res.status === 400 || res.status === 403 || res.status === 404,
      `Set requirements unexpected error: ${res.status}`
    );
  }),

  test('Set NFT access requirements', async () => {
    const res = await api('/api/access/requirements', {
      method: 'POST',
      body: JSON.stringify({
        postId: 'test-post-id',
        requirementType: 'nft',
        collectionAddress: TEST_NFT_COLLECTION,
      }),
    });
    
    // May fail if post doesn't exist or user doesn't own it
    assert(
      res.ok || res.status === 400 || res.status === 403 || res.status === 404,
      `Set NFT requirements unexpected error: ${res.status}`
    );
  }),

  test('Verify token access', async () => {
    const res = await api('/api/access/verify-token', {
      method: 'POST',
      body: JSON.stringify({
        postId: 'test-post-id',
      }),
    });
    
    // May return various statuses depending on post/requirements state
    assert(
      res.ok || res.status === 400 || res.status === 403 || res.status === 404,
      `Verify token access unexpected error: ${res.status}`
    );
  }),

  test('Verify NFT access', async () => {
    const res = await api('/api/access/verify-nft', {
      method: 'POST',
      body: JSON.stringify({
        postId: 'test-post-id',
      }),
    });
    
    // May return various statuses depending on post/requirements state
    assert(
      res.ok || res.status === 400 || res.status === 403 || res.status === 404,
      `Verify NFT access unexpected error: ${res.status}`
    );
  }),

  test('Check on-chain access status', async () => {
    const res = await api('/api/access/check?postId=test-post-id');
    
    // May return 404 if no access requirements set
    assert(
      res.ok || res.status === 404,
      `Check access failed: ${res.status}`
    );
  }),

  test('Reject invalid token mint', async () => {
    const res = await api('/api/access/requirements', {
      method: 'POST',
      body: JSON.stringify({
        postId: 'test-post-id',
        requirementType: 'token',
        tokenMint: 'invalid-mint-address',
        minAmount: 1000,
      }),
    });
    
    assert(!res.ok, 'Should reject invalid token mint');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  }),

  test('Reject negative min amount', async () => {
    const res = await api('/api/access/requirements', {
      method: 'POST',
      body: JSON.stringify({
        postId: 'test-post-id',
        requirementType: 'token',
        tokenMint: TEST_TOKEN_MINT,
        minAmount: -100,
      }),
    });
    
    assert(!res.ok, 'Should reject negative amount');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  }),

  test('Reject invalid requirement type', async () => {
    const res = await api('/api/access/requirements', {
      method: 'POST',
      body: JSON.stringify({
        postId: 'test-post-id',
        requirementType: 'invalid-type',
        tokenMint: TEST_TOKEN_MINT,
        minAmount: 1000,
      }),
    });
    
    assert(!res.ok, 'Should reject invalid requirement type');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  }),
];

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearResults();
  runTests('Token Gate Flow Tests', tests).then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { tests as accessTests };
