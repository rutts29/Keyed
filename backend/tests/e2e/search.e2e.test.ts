/**
 * E2E Search Tests
 *
 * Tests the user search, tag search, autocomplete suggestions, and
 * empty-query edge cases.
 *
 * Runs against a live backend (localhost:3001) with real Supabase + Redis.
 */
import { describe, it, expect } from 'vitest';
import { api } from './setup.js';

// ---------------------------------------------------------------------------
// User search
// ---------------------------------------------------------------------------

describe('Search - Users', () => {
  it('should return a users array for a valid query', async () => {
    const res = await api('/api/search/users?q=test');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('users');
    expect(Array.isArray(res.data.data.users)).toBe(true);
  });

  it('should return an empty array when query is too short', async () => {
    const res = await api('/api/search/users?q=a');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.users).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tag search
// ---------------------------------------------------------------------------

describe('Search - Tag', () => {
  it('should return posts array for a tag query', async () => {
    const res = await api('/api/search/tag?tag=photography');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('posts');
    expect(Array.isArray(res.data.data.posts)).toBe(true);
    expect(res.data.data).toHaveProperty('nextCursor');
  });

  it('should return empty posts when no tag is provided', async () => {
    const res = await api('/api/search/tag');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.posts).toEqual([]);
    expect(res.data.data.nextCursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Autocomplete suggestions
// ---------------------------------------------------------------------------

describe('Search - Suggestions', () => {
  it('should return suggestions array for a valid prefix', async () => {
    const res = await api('/api/search/suggest?q=test');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('suggestions');
    expect(Array.isArray(res.data.data.suggestions)).toBe(true);
  });

  it('should return empty suggestions for a single-character query', async () => {
    const res = await api('/api/search/suggest?q=x');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.suggestions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Empty / missing query edge cases
// ---------------------------------------------------------------------------

describe('Search - Empty query handling', () => {
  it('should handle missing q param on user search gracefully', async () => {
    const res = await api('/api/search/users');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    // Controller treats empty/missing q as q.length < 2 -> empty results
    expect(res.data.data.users).toEqual([]);
  });

  it('should handle missing q param on suggestions gracefully', async () => {
    const res = await api('/api/search/suggest');

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.suggestions).toEqual([]);
  });
});
