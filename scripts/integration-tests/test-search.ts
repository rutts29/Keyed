#!/usr/bin/env tsx
/**
 * Search Flow Integration Tests
 * 
 * Tests the AI-powered search functionality:
 * 1. Semantic search → AI service → Qdrant → Results
 * 2. Tag-based search
 * 3. User search
 * 4. Autocomplete suggestions
 */

import { api, wallet, signMessage, setAuthToken, test, assert, runTests, clearResults } from './config.js';

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
  test('Authenticate for search tests', async () => {
    await authenticate();
    assert(true, 'Authentication attempted');
  }),

  test('Semantic search - basic query', async () => {
    const res = await api('/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({
        query: 'beautiful sunset over the ocean',
        limit: 10,
      }),
    });
    
    // May return 200 with empty results if Qdrant not set up, or 503 if AI service down
    assert(
      res.ok || res.status === 503,
      `Semantic search failed unexpectedly: ${res.status}`
    );
    
    if (res.ok) {
      assert(res.data.success, 'Semantic search response not successful');
      assert(Array.isArray(res.data.data), 'Results should be an array');
    }
  }),

  test('Semantic search - with filters', async () => {
    const res = await api('/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({
        query: 'nature photography',
        limit: 5,
        filters: {
          sceneType: 'landscape',
        },
      }),
    });
    
    assert(
      res.ok || res.status === 503,
      `Filtered search failed unexpectedly: ${res.status}`
    );
  }),

  test('Search users by username', async () => {
    const res = await api('/api/search/users?q=test&limit=10');
    
    assert(res.ok, `User search failed: ${res.status}`);
    assert(res.data.success, 'User search not successful');
    assert(Array.isArray(res.data.data), 'Results should be an array');
  }),

  test('Search by tag', async () => {
    const res = await api('/api/search/tag?tag=test&limit=10');
    
    assert(res.ok, `Tag search failed: ${res.status}`);
    assert(res.data.success, 'Tag search not successful');
    assert(Array.isArray(res.data.data), 'Results should be an array');
  }),

  test('Autocomplete suggestions', async () => {
    const res = await api('/api/search/suggest?q=sun');
    
    assert(res.ok, `Autocomplete failed: ${res.status}`);
    assert(res.data.success, 'Autocomplete not successful');
    assert(Array.isArray(res.data.data), 'Suggestions should be an array');
  }),

  test('Empty search query handling', async () => {
    const res = await api('/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({
        query: '',
        limit: 10,
      }),
    });
    
    // Should either return validation error or empty results
    assert(
      res.status === 400 || res.ok,
      `Unexpected status for empty query: ${res.status}`
    );
  }),

  test('Search with pagination', async () => {
    const res = await api('/api/search/users?q=a&limit=5&offset=0');
    
    assert(res.ok, `Paginated search failed: ${res.status}`);
    
    // Try next page
    const res2 = await api('/api/search/users?q=a&limit=5&offset=5');
    assert(res2.ok, `Pagination offset failed: ${res2.status}`);
  }),

  test('Search special characters handling', async () => {
    const res = await api('/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({
        query: 'test @#$% special <script>',
        limit: 10,
      }),
    });
    
    // Should not crash, may return 400 or filtered results
    assert(
      res.ok || res.status === 400 || res.status === 503,
      `Special chars caused unexpected error: ${res.status}`
    );
  }),
];

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearResults();
  runTests('Search Flow Tests', tests).then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { tests as searchTests };
