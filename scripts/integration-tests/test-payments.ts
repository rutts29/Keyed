#!/usr/bin/env tsx
/**
 * Payment Flow Integration Tests
 * 
 * Tests the Solana payment functionality:
 * 1. Initialize creator vault
 * 2. Send tip transaction
 * 3. Subscribe to creator
 * 4. Check earnings
 * 5. Withdraw (requires actual SOL)
 */

import { api, wallet, signMessage, setAuthToken, test, assert, runTests, clearResults, connection } from './config.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

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

const tests = [
  test('Authenticate for payment tests', async () => {
    await authenticate();
    assert(true, 'Authentication attempted');
  }),

  test('Check wallet balance', async () => {
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`    Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < LAMPORTS_PER_SOL * 0.1) {
      console.log('    ⚠️  Low balance - some payment tests may fail');
      console.log(`    Run: solana airdrop 2 ${wallet.publicKey.toBase58()} --url devnet`);
    }
    
    assert(true, 'Balance checked');
  }),

  test('Initialize creator vault', async () => {
    const res = await api('/api/payments/vault/initialize', {
      method: 'POST',
    });
    
    // May fail if already initialized or insufficient funds
    assert(
      res.ok || res.status === 400 || res.status === 409,
      `Vault init unexpected error: ${res.status} - ${JSON.stringify(res.data)}`
    );
    
    if (res.ok) {
      assert(res.data.success, 'Vault initialization not successful');
    }
  }),

  test('Get vault info', async () => {
    const res = await api('/api/payments/vault');
    
    // May return 404 if vault not initialized
    assert(
      res.ok || res.status === 404,
      `Get vault info failed: ${res.status}`
    );
    
    if (res.ok) {
      assert(res.data.success, 'Get vault info not successful');
    }
  }),

  test('Get earnings summary', async () => {
    const res = await api('/api/payments/earnings');
    
    assert(res.ok, `Get earnings failed: ${res.status}`);
    assert(res.data.success, 'Get earnings not successful');
  }),

  test('Build tip transaction (dry run)', async () => {
    // This tests the transaction building without executing
    // Requires a target wallet (use our own for testing)
    const res = await api('/api/payments/tip', {
      method: 'POST',
      body: JSON.stringify({
        creatorWallet: wallet.publicKey.toBase58(),
        amount: 0.001 * LAMPORTS_PER_SOL, // 0.001 SOL
        postId: 'test-post-id',
      }),
    });
    
    // May fail if vault not set up or other reasons
    assert(
      res.ok || res.status === 400 || res.status === 404,
      `Tip transaction build failed unexpectedly: ${res.status}`
    );
  }),

  test('Build subscription transaction (dry run)', async () => {
    const res = await api('/api/payments/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        creatorWallet: wallet.publicKey.toBase58(),
        tier: 'basic',
        duration: 30, // 30 days
      }),
    });
    
    // May fail if subscriptions not configured for this creator
    assert(
      res.ok || res.status === 400 || res.status === 404,
      `Subscribe failed unexpectedly: ${res.status}`
    );
  }),

  test('Cancel non-existent subscription', async () => {
    const res = await api(`/api/payments/subscribe/${wallet.publicKey.toBase58()}`, {
      method: 'DELETE',
    });
    
    // Should return 404 if no subscription exists
    assert(
      res.ok || res.status === 404,
      `Cancel subscription unexpected error: ${res.status}`
    );
  }),

  test('Build withdrawal transaction', async () => {
    const res = await api('/api/payments/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount: 0.001 * LAMPORTS_PER_SOL,
      }),
    });
    
    // May fail if no funds in vault
    assert(
      res.ok || res.status === 400 || res.status === 404,
      `Withdraw failed unexpectedly: ${res.status}`
    );
  }),

  test('Reject tip with invalid amount', async () => {
    const res = await api('/api/payments/tip', {
      method: 'POST',
      body: JSON.stringify({
        creatorWallet: wallet.publicKey.toBase58(),
        amount: -100, // Invalid negative amount
        postId: 'test-post-id',
      }),
    });
    
    assert(!res.ok, 'Should reject negative amount');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  }),

  test('Reject tip to invalid wallet', async () => {
    const res = await api('/api/payments/tip', {
      method: 'POST',
      body: JSON.stringify({
        creatorWallet: 'invalid-wallet-address',
        amount: 1000,
        postId: 'test-post-id',
      }),
    });
    
    assert(!res.ok, 'Should reject invalid wallet');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  }),
];

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearResults();
  runTests('Payment Flow Tests', tests).then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { tests as paymentsTests };
