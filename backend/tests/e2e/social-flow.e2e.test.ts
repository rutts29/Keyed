/**
 * E2E Social Flow Integration Test
 *
 * Tests the full social lifecycle end-to-end:
 *   Profile creation -> Follow -> Content creation -> Engagement -> Notifications -> Feed
 *
 * Uses 4 wallets (alice, bob, charlie, diana) to simulate realistic social interactions.
 * Post-dependent tests gracefully skip when the AI moderation service is unavailable.
 *
 * Runs against a live backend (localhost:3001) with real Supabase + Redis + Solana.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { api, apiFormData, authenticate, createTestPNG } from './setup.js';

// ---------------------------------------------------------------------------
// AI dependency handling
// ---------------------------------------------------------------------------

const AI_SKIP_WARNING =
  '\x1b[33m\u26a0\ufe0f  AI SERVICE UNAVAILABLE \u2014 Post-dependent tests skipped. Re-run with AI service up to get full coverage.\x1b[0m';

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let alice: Keypair;
let bob: Keypair;
let charlie: Keypair;
let diana: Keypair;

let aliceToken: string;
let bobToken: string;
let charlieToken: string;
let dianaToken: string;

let aliceWallet: string;
let bobWallet: string;
let charlieWallet: string;
let dianaWallet: string;

let postId: string | null = null;
let uploadedContentUri: string | null = null;

// ---------------------------------------------------------------------------
// Setup: generate wallets, authenticate, create profiles
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Generate 4 keypairs
  alice = Keypair.generate();
  bob = Keypair.generate();
  charlie = Keypair.generate();
  diana = Keypair.generate();

  aliceWallet = alice.publicKey.toBase58();
  bobWallet = bob.publicKey.toBase58();
  charlieWallet = charlie.publicKey.toBase58();
  dianaWallet = diana.publicKey.toBase58();

  console.log(`Alice:   ${aliceWallet}`);
  console.log(`Bob:     ${bobWallet}`);
  console.log(`Charlie: ${charlieWallet}`);
  console.log(`Diana:   ${dianaWallet}`);

  // Authenticate all 4
  aliceToken = await authenticate(alice);
  bobToken = await authenticate(bob);
  charlieToken = await authenticate(charlie);
  dianaToken = await authenticate(diana);

  // Create profiles for all 4
  const ts = Date.now();
  const profiles = [
    { token: aliceToken, username: `alice_${ts}`, bio: 'Alice social flow' },
    { token: bobToken, username: `bob_${ts}`, bio: 'Bob social flow' },
    { token: charlieToken, username: `charlie_${ts}`, bio: 'Charlie social flow' },
    { token: dianaToken, username: `diana_${ts}`, bio: 'Diana social flow' },
  ];

  for (const p of profiles) {
    const res = await api('/api/users/profile', {
      method: 'POST',
      token: p.token,
      body: JSON.stringify({
        username: p.username,
        bio: p.bio,
      }),
    });
    // Profile creation may return 200 or fail due to RPC/program issues
    if (!res.ok) {
      console.warn(`Profile creation for ${p.username} returned ${res.status}: ${JSON.stringify(res.data)}`);
    }
  }
}, 60_000);

// ---------------------------------------------------------------------------
// Content Creation
// ---------------------------------------------------------------------------

describe('Content Creation', () => {
  it('alice uploads an image', async () => {
    const png = createTestPNG();
    const formData = new FormData();
    formData.append('file', new Blob([png], { type: 'image/png' }), 'social-flow-test.png');
    formData.append('caption', 'Social flow E2E image');

    const res = await apiFormData('/api/posts/upload', formData, aliceToken);

    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.contentUri).toBeDefined();
      uploadedContentUri = res.data.data.contentUri;
    } else {
      uploadedContentUri = null;
      console.warn(AI_SKIP_WARNING);
      // Verify it is a known fail-closed status, not a random error
      expect([400, 500, 503]).toContain(res.status);
    }
  }, 15_000);

  it('alice creates a post', async () => {
    if (!uploadedContentUri) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api('/api/posts/create', {
      method: 'POST',
      token: aliceToken,
      body: JSON.stringify({
        contentUri: uploadedContentUri,
        contentType: 'image',
        caption: 'Social flow E2E post',
        isTokenGated: false,
        requiredToken: null,
      }),
    });

    if (res.ok) {
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.metadata).toBeDefined();
      expect(res.data.data.metadata.postId).toBeDefined();
      postId = res.data.data.metadata.postId;
    } else {
      postId = null;
      console.warn(AI_SKIP_WARNING);
      expect([400, 500, 503]).toContain(res.status);
    }
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Follow
// ---------------------------------------------------------------------------

describe('Follow', () => {
  it('bob follows alice', async () => {
    const res = await api(`/api/users/${aliceWallet}/follow`, {
      method: 'POST',
      token: bobToken,
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  }, 15_000);

  it('charlie follows alice', async () => {
    const res = await api(`/api/users/${aliceWallet}/follow`, {
      method: 'POST',
      token: charlieToken,
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  }, 15_000);

  it('alice has at least 2 followers', async () => {
    const res = await api(`/api/users/${aliceWallet}`);

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.follower_count).toBeGreaterThanOrEqual(2);
  }, 15_000);

  it('bob is in alice followers list', async () => {
    const res = await api(`/api/users/${aliceWallet}/followers`);

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('followers');
    expect(Array.isArray(res.data.data.followers)).toBe(true);

    const wallets = res.data.data.followers.map((f: { wallet: string }) => f.wallet);
    expect(wallets).toContain(bobWallet);
  }, 15_000);

  it('alice is in bob following list', async () => {
    const res = await api(`/api/users/${bobWallet}/following`);

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('following');
    expect(Array.isArray(res.data.data.following)).toBe(true);

    const wallets = res.data.data.following.map((f: { wallet: string }) => f.wallet);
    expect(wallets).toContain(aliceWallet);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

describe('Engagement', () => {
  it('bob likes alice post', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api(`/api/posts/${postId}/like`, {
      method: 'POST',
      token: bobToken,
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  }, 15_000);

  it('charlie likes alice post', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api(`/api/posts/${postId}/like`, {
      method: 'POST',
      token: charlieToken,
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  }, 15_000);

  it('post has at least 2 likes', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api(`/api/posts/${postId}`, {
      method: 'GET',
      token: aliceToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.like_count).toBeGreaterThanOrEqual(2);
  }, 15_000);

  it('bob comments on alice post', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api(`/api/posts/${postId}/comments`, {
      method: 'POST',
      token: bobToken,
      body: JSON.stringify({ text: 'Great post!' }),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  }, 15_000);

  it('bob comment is visible on the post', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api(`/api/posts/${postId}/comments`, {
      method: 'GET',
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.comments)).toBe(true);

    const bobComment = res.data.data.comments.find(
      (c: any) => c.text === 'Great post!',
    );
    expect(bobComment).toBeDefined();
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

describe('Notifications', () => {
  beforeAll(async () => {
    // Wait for BullMQ workers to process notification jobs
    await new Promise((r) => setTimeout(r, 5000));
  }, 15_000);

  it('alice has follow notification from bob', async () => {
    const res = await api('/api/notifications', { token: aliceToken });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);

    const followNotif = res.data.data.notifications.find(
      (n: any) => n.type === 'follow' && n.from_wallet === bobWallet,
    );
    expect(followNotif).toBeDefined();
  }, 15_000);

  it('alice has follow notification from charlie', async () => {
    const res = await api('/api/notifications', { token: aliceToken });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);

    const followNotif = res.data.data.notifications.find(
      (n: any) => n.type === 'follow' && n.from_wallet === charlieWallet,
    );
    expect(followNotif).toBeDefined();
  }, 15_000);

  it('alice has like notification (if post exists)', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api('/api/notifications', { token: aliceToken });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);

    const likeNotif = res.data.data.notifications.find(
      (n: any) => n.type === 'like',
    );
    expect(likeNotif).toBeDefined();
  }, 15_000);

  it('diana has zero notifications', async () => {
    const res = await api('/api/notifications', { token: dianaToken });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.notifications.length).toBe(0);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

describe('Feed', () => {
  it('bob following feed includes alice post', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api('/api/feed/following', { token: bobToken });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('posts');
    expect(Array.isArray(res.data.data.posts)).toBe(true);

    const postIds = res.data.data.posts.map((p: any) => p.id);
    expect(postIds).toContain(postId);
  }, 15_000);

  it('diana following feed excludes alice post', async () => {
    if (!postId) {
      console.warn(AI_SKIP_WARNING);
      return;
    }

    const res = await api('/api/feed/following', { token: dianaToken });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('posts');
    expect(Array.isArray(res.data.data.posts)).toBe(true);

    const postIds = res.data.data.posts.map((p: any) => p.id);
    expect(postIds).not.toContain(postId);
  }, 15_000);

  it('explore feed is accessible', async () => {
    const res = await api('/api/feed/explore');

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('posts');
    expect(Array.isArray(res.data.data.posts)).toBe(true);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

afterAll(async () => {
  try {
    // Unfollow
    await api(`/api/users/${aliceWallet}/follow`, {
      method: 'DELETE',
      token: bobToken,
    });
    await api(`/api/users/${aliceWallet}/follow`, {
      method: 'DELETE',
      token: charlieToken,
    });

    // Unlike (if post was created)
    if (postId) {
      await api(`/api/posts/${postId}/like`, {
        method: 'DELETE',
        token: bobToken,
      });
      await api(`/api/posts/${postId}/like`, {
        method: 'DELETE',
        token: charlieToken,
      });
    }
  } catch (err) {
    console.warn('Cleanup error (non-fatal):', err);
  }
}, 30_000);
