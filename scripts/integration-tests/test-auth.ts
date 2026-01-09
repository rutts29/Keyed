#!/usr/bin/env tsx
/**
 * Auth Flow Integration Tests
 * 
 * Tests the complete authentication flow:
 * 1. Request challenge from backend
 * 2. Sign challenge with wallet
 * 3. Verify signature and receive JWT
 * 4. Refresh token
 */

import { api, wallet, signMessage, setAuthToken, getAuthToken, test, assert, runTests, clearResults } from './config.js';

let challengeMessage: string;
let challengeNonce: string;

const tests = [
  test('Health check', async () => {
    const res = await api('/health');
    assert(res.ok, `Health check failed: ${res.status}`);
    assert(res.data.status === 'ok', 'Health status not ok');
  }),

  test('Request auth challenge', async () => {
    const res = await api('/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ wallet: wallet.publicKey.toBase58() }),
    });
    
    assert(res.ok, `Challenge request failed: ${res.status}`);
    assert(res.data.success, 'Challenge request not successful');
    assert(res.data.data.message, 'No challenge message returned');
    assert(res.data.data.nonce, 'No nonce returned');
    
    challengeMessage = res.data.data.message;
    challengeNonce = res.data.data.nonce;
  }),

  test('Verify signature and get JWT', async () => {
    const signature = signMessage(challengeMessage);
    
    const res = await api('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({
        wallet: wallet.publicKey.toBase58(),
        signature,
      }),
    });
    
    assert(res.ok, `Verify failed: ${res.status} - ${JSON.stringify(res.data)}`);
    assert(res.data.success, 'Verify not successful');
    assert(res.data.data.token, 'No JWT token returned');
    assert(res.data.data.wallet === wallet.publicKey.toBase58(), 'Wallet mismatch');
    
    setAuthToken(res.data.data.token);
  }),

  test('Access protected endpoint with JWT', async () => {
    const res = await api(`/api/users/${wallet.publicKey.toBase58()}`);
    
    // Should succeed (user was created during auth)
    assert(res.ok || res.status === 404, `Protected endpoint failed: ${res.status}`);
  }),

  test('Refresh token', async () => {
    const res = await api('/api/auth/refresh', {
      method: 'POST',
    });
    
    assert(res.ok, `Refresh failed: ${res.status}`);
    assert(res.data.success, 'Refresh not successful');
    assert(res.data.data.token, 'No new token returned');
    
    // Update stored token
    setAuthToken(res.data.data.token);
  }),

  test('Reject invalid signature', async () => {
    // First get a new challenge
    const challengeRes = await api('/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ wallet: wallet.publicKey.toBase58() }),
    });
    
    assert(challengeRes.ok, 'Challenge request failed');
    
    // Send invalid signature
    const res = await api('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({
        wallet: wallet.publicKey.toBase58(),
        signature: 'invalid-signature-abc123',
      }),
    });
    
    assert(!res.ok, 'Should reject invalid signature');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  }),

  test('Reject request without token', async () => {
    // Temporarily clear token
    const savedToken = getAuthToken();
    setAuthToken('');
    
    const res = await api('/api/payments/vault');
    
    // Restore token
    if (savedToken) setAuthToken(savedToken);
    
    assert(!res.ok, 'Should reject without token');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  }),
];

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearResults();
  runTests('Auth Flow Tests', tests).then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { tests as authTests };
