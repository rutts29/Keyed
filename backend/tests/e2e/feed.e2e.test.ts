/**
 * E2E Feed Tests
 *
 * Tests the explore, trending, personalized, and following feed endpoints.
 * Validates response shapes, pagination params, and auth behaviour.
 *
 * Runs against a live backend (localhost:3001) with real Supabase + Redis.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  api,
  authenticate,
  testWalletA,
} from './setup.js';

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let tokenA: string;

beforeAll(async () => {
  tokenA = await authenticate(testWalletA);
}, 30000);

// ---------------------------------------------------------------------------
// Explore & Trending (public / optional-auth)
// ---------------------------------------------------------------------------

describe('Feed - Explore', () => {
  it('should return the explore feed with correct shape', async () => {
    const res = await api('/api/feed/explore');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('posts');
    expect(Array.isArray(res.data.data.posts)).toBe(true);
    expect(res.data.data).toHaveProperty('nextCursor');
  });

  it('should respect the limit query parameter', async () => {
    const res = await api('/api/feed/explore?limit=5');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.posts.length).toBeLessThanOrEqual(5);
  });
});

describe('Feed - Trending', () => {
  it('should return trending posts', async () => {
    const res = await api('/api/feed/trending');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('posts');
    expect(Array.isArray(res.data.data.posts)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Auth-required feeds
// ---------------------------------------------------------------------------

describe('Feed - Personalized (auth required)', () => {
  it('should return personalized feed when authenticated', async () => {
    const res = await api('/api/feed', { token: tokenA });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('posts');
    expect(Array.isArray(res.data.data.posts)).toBe(true);
    expect(res.data.data).toHaveProperty('nextCursor');
  });

  it('should reject personalized feed without auth', async () => {
    const res = await api('/api/feed');

    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(res.data.success).toBe(false);
    expect(res.data.error.code).toBe('UNAUTHORIZED');
  });
});

describe('Feed - Following (auth required)', () => {
  it('should return following feed when authenticated', async () => {
    const res = await api('/api/feed/following', { token: tokenA });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('posts');
    expect(Array.isArray(res.data.data.posts)).toBe(true);
    expect(res.data.data).toHaveProperty('nextCursor');
  });

  it('should reject following feed without auth', async () => {
    const res = await api('/api/feed/following');

    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(res.data.success).toBe(false);
    expect(res.data.error.code).toBe('UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe('Feed - Pagination', () => {
  it('should accept limit and cursor query params on explore', async () => {
    const firstPage = await api('/api/feed/explore?limit=2');

    expect(firstPage.ok).toBe(true);
    expect(firstPage.data.data.posts.length).toBeLessThanOrEqual(2);

    // If a cursor is returned, fetch the next page
    const cursor = firstPage.data.data.nextCursor;
    if (cursor) {
      const secondPage = await api(
        `/api/feed/explore?limit=2&cursor=${encodeURIComponent(cursor)}`,
      );

      expect(secondPage.ok).toBe(true);
      expect(secondPage.data.success).toBe(true);
      expect(secondPage.data.data).toHaveProperty('posts');
    }
  });

  it('should accept limit and cursor query params on following feed', async () => {
    const res = await api('/api/feed/following?limit=5', { token: tokenA });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.posts.length).toBeLessThanOrEqual(5);
  });
});
