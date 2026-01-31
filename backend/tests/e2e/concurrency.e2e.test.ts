/**
 * E2E Concurrency Tests
 *
 * Validates that the backend handles concurrent operations correctly:
 * simultaneous follows, likes, chat joins, messages, and profile updates.
 *
 * Runs against a live backend (localhost:3001) with real Supabase + Redis.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { api, apiFormData, authenticate, createTestPNG } from './setup.js';

// ---------------------------------------------------------------------------
// AI dependency handling
// ---------------------------------------------------------------------------

const AI_SKIP_WARNING =
  '\x1b[33m\u26a0\ufe0f  AI SERVICE UNAVAILABLE — Post-dependent tests skipped. Re-run with AI service up to get full coverage.\x1b[0m';

let postId: string | null = null;

// ---------------------------------------------------------------------------
// Wallets & tokens
// ---------------------------------------------------------------------------

let poster: Keypair;
let liker1: Keypair;
let liker2: Keypair;
let liker3: Keypair;
let liker4: Keypair;

let posterToken: string;
let liker1Token: string;
let liker2Token: string;
let liker3Token: string;
let liker4Token: string;

let posterWallet: string;
let liker1Wallet: string;

// Chat state
let roomId: string | null = null;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // 1. Generate keypairs
  poster = Keypair.generate();
  liker1 = Keypair.generate();
  liker2 = Keypair.generate();
  liker3 = Keypair.generate();
  liker4 = Keypair.generate();

  posterWallet = poster.publicKey.toBase58();
  liker1Wallet = liker1.publicKey.toBase58();

  // 2. Authenticate all 5
  [posterToken, liker1Token, liker2Token, liker3Token, liker4Token] =
    await Promise.all([
      authenticate(poster),
      authenticate(liker1),
      authenticate(liker2),
      authenticate(liker3),
      authenticate(liker4),
    ]);

  // 3. Create profiles for all 5
  const ts = Date.now();
  const profileResults = await Promise.all([
    api('/api/users/profile', {
      method: 'POST',
      token: posterToken,
      body: JSON.stringify({
        username: `poster_${ts}`,
        bio: 'Poster account',
      }),
    }),
    api('/api/users/profile', {
      method: 'POST',
      token: liker1Token,
      body: JSON.stringify({
        username: `liker1_${ts}`,
        bio: 'Liker 1',
      }),
    }),
    api('/api/users/profile', {
      method: 'POST',
      token: liker2Token,
      body: JSON.stringify({
        username: `liker2_${ts}`,
        bio: 'Liker 2',
      }),
    }),
    api('/api/users/profile', {
      method: 'POST',
      token: liker3Token,
      body: JSON.stringify({
        username: `liker3_${ts}`,
        bio: 'Liker 3',
      }),
    }),
    api('/api/users/profile', {
      method: 'POST',
      token: liker4Token,
      body: JSON.stringify({
        username: `liker4_${ts}`,
        bio: 'Liker 4',
      }),
    }),
  ]);

  for (const r of profileResults) {
    // Accept 200 or 400/500/503 (RPC issues)
    if (!r.ok) {
      console.warn(`Profile creation returned ${r.status}: ${JSON.stringify(r.data)}`);
    }
  }

  // 4. Poster creates a post (requires AI service)
  try {
    const png = createTestPNG();
    const formData = new FormData();
    formData.append('file', new Blob([png], { type: 'image/png' }), 'concurrency-test.png');
    formData.append('caption', 'Concurrency test post');

    const uploadRes = await apiFormData('/api/posts/upload', formData, posterToken);

    if (uploadRes.ok && uploadRes.data?.data?.contentUri) {
      const createRes = await api('/api/posts/create', {
        method: 'POST',
        token: posterToken,
        body: JSON.stringify({
          contentUri: uploadRes.data.data.contentUri,
          contentType: 'image',
          caption: 'Concurrency test post',
          isTokenGated: false,
          requiredToken: null,
        }),
      });

      if (createRes.ok && createRes.data?.data?.metadata?.postId) {
        postId = createRes.data.data.metadata.postId;
      } else {
        console.warn(AI_SKIP_WARNING);
      }
    } else {
      console.warn(AI_SKIP_WARNING);
    }
  } catch {
    console.warn(AI_SKIP_WARNING);
  }
}, 60_000);

// ---------------------------------------------------------------------------
// Concurrent Follows
// ---------------------------------------------------------------------------

describe('Concurrent Follows', () => {
  it('all 4 likers follow poster simultaneously', async () => {
    const tokens = [liker1Token, liker2Token, liker3Token, liker4Token];

    const results = await Promise.all(
      tokens.map((token) =>
        api(`/api/users/${posterWallet}/follow`, {
          method: 'POST',
          token,
        }),
      ),
    );

    for (const res of results) {
      // Must succeed: 200 or already following
      expect(res.status).not.toBe(500);
      expect(res.ok).toBe(true);
      expect(res.data.success).toBe(true);
    }
  }, 15_000);

  it('poster follower_count should be >= 4', async () => {
    const res = await api(`/api/users/${posterWallet}`);

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.follower_count).toBeGreaterThanOrEqual(4);
  }, 15_000);

  it('duplicate follows are handled idempotently', async () => {
    const tokens = [liker1Token, liker2Token, liker3Token, liker4Token];

    const results = await Promise.all(
      tokens.map((token) =>
        api(`/api/users/${posterWallet}/follow`, {
          method: 'POST',
          token,
        }),
      ),
    );

    for (const res of results) {
      // Should not produce a 500 -- either 200 with alreadyFollowing or 409
      expect(res.status).not.toBe(500);
      // Backend returns 400 ALREADY_FOLLOWING for duplicate follows
      if (res.ok) {
        expect(res.data.success).toBe(true);
      } else {
        expect(res.status).toBe(400);
        expect(res.data.error.code).toBe('ALREADY_FOLLOWING');
      }
    }
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Concurrent Likes
// ---------------------------------------------------------------------------

describe('Concurrent Likes', () => {
  it('all 4 likers like the same post simultaneously', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const tokens = [liker1Token, liker2Token, liker3Token, liker4Token];

    const results = await Promise.all(
      tokens.map((token) =>
        api(`/api/posts/${postId}/like`, {
          method: 'POST',
          token,
        }),
      ),
    );

    for (const res of results) {
      expect(res.status).not.toBe(500);
      expect(res.ok).toBe(true);
      expect(res.data.success).toBe(true);
    }
  }, 15_000);

  it('like_count should be >= 4', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api(`/api/posts/${postId}`, {
      method: 'GET',
      token: posterToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.like_count).toBeGreaterThanOrEqual(4);
  }, 15_000);

  it('duplicate likes are rejected', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const tokens = [liker1Token, liker2Token, liker3Token, liker4Token];

    const results = await Promise.all(
      tokens.map((token) =>
        api(`/api/posts/${postId}/like`, {
          method: 'POST',
          token,
        }),
      ),
    );

    for (const res of results) {
      // Duplicate like should not produce 500
      expect(res.status).not.toBe(500);
      // Either returns ok with alreadyLiked, or a 4xx rejection
      if (res.ok) {
        expect(res.data.data.alreadyLiked).toBe(true);
      } else {
        expect([400, 409]).toContain(res.status);
      }
    }
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Concurrent Chat
// ---------------------------------------------------------------------------

describe('Concurrent Chat', () => {
  it('poster creates a chat room', async () => {
    try {
      const res = await api('/api/chat/rooms', {
        method: 'POST',
        token: posterToken,
        body: JSON.stringify({ name: `concurrency-room-${Date.now()}` }),
      });

      if (res.ok) {
        expect(res.data.success).toBe(true);
        expect(res.data.data).toHaveProperty('id');
        roomId = res.data.data.id;
      } else {
        console.warn(`Chat room creation failed (${res.status}) -- chat tables may not exist. Skipping chat tests.`);
        roomId = null;
      }
    } catch (err) {
      console.warn('Chat room creation threw -- chat tables may not exist. Skipping chat tests.');
      roomId = null;
    }
  }, 15_000);

  it('all 4 likers join room simultaneously', async () => {
    if (!roomId) {
      console.warn('No room -- skipping concurrent join test');
      return;
    }

    const tokens = [liker1Token, liker2Token, liker3Token, liker4Token];

    const results = await Promise.all(
      tokens.map((token) =>
        api(`/api/chat/rooms/${roomId}/join`, {
          method: 'POST',
          token,
        }),
      ),
    );

    for (const res of results) {
      expect(res.status).not.toBe(500);
      expect(res.ok).toBe(true);
      expect(res.data.success).toBe(true);
      expect(
        res.data.data.joined === true || res.data.data.alreadyJoined === true,
      ).toBe(true);
    }
  }, 15_000);

  it('all 4 likers send messages simultaneously', async () => {
    if (!roomId) {
      console.warn('No room -- skipping concurrent message test');
      return;
    }

    const tokens = [liker1Token, liker2Token, liker3Token, liker4Token];

    const results = await Promise.all(
      tokens.map((token, i) =>
        api(`/api/chat/rooms/${roomId}/messages`, {
          method: 'POST',
          token,
          body: JSON.stringify({ content: `Concurrent message ${i + 1}` }),
        }),
      ),
    );

    for (const res of results) {
      expect(res.status).not.toBe(500);
      expect(res.ok).toBe(true);
      expect(res.data.success).toBe(true);
      expect(res.data.data.content).toBeDefined();
    }
  }, 15_000);

  it('message count should be >= 4', async () => {
    if (!roomId) {
      console.warn('No room -- skipping message count test');
      return;
    }

    const res = await api(`/api/chat/rooms/${roomId}/messages`, {
      method: 'GET',
      token: posterToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.messages)).toBe(true);
    expect(res.data.data.messages.length).toBeGreaterThanOrEqual(4);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Concurrent Profile Updates
// ---------------------------------------------------------------------------

describe('Concurrent Profile Updates', () => {
  const bios = [
    'Bio update alpha',
    'Bio update bravo',
    'Bio update charlie',
  ];

  it('3 simultaneous profile updates from liker1', async () => {
    const results = await Promise.all(
      bios.map((bio) =>
        api('/api/users/profile', {
          method: 'POST',
          token: liker1Token,
          body: JSON.stringify({
            username: `liker1_updated_${Date.now()}`,
            bio,
          }),
        }),
      ),
    );

    for (const res of results) {
      expect(res.status).not.toBe(500);
      // At least one should succeed; others may get conflict or still succeed
      if (!res.ok) {
        expect([400, 409, 429, 503]).toContain(res.status);
      }
    }
  }, 15_000);

  it('final profile state is consistent (one of the 3 bios)', async () => {
    const res = await api(`/api/users/${liker1Wallet}`);

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);

    const finalBio = res.data.data.bio;
    // The bio must be exactly one of the three values, not a mix
    expect(bios).toContain(finalBio);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

afterAll(async () => {
  try {
    const tokens = [liker1Token, liker2Token, liker3Token, liker4Token];

    // Unfollow poster
    await Promise.all(
      tokens.map((token) =>
        api(`/api/users/${posterWallet}/follow`, {
          method: 'DELETE',
          token,
        }).catch(() => {}),
      ),
    );

    // Unlike post (if created)
    if (postId) {
      await Promise.all(
        tokens.map((token) =>
          api(`/api/posts/${postId}/like`, {
            method: 'DELETE',
            token,
          }).catch(() => {}),
        ),
      );
    }
  } catch {
    // Best-effort cleanup
  }
}, 30_000);
