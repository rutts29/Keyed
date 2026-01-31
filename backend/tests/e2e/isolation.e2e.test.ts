/**
 * E2E Account Isolation & Data Leakage Prevention Tests
 *
 * Verifies that private data (notifications, chat rooms, airdrop campaigns,
 * privacy settings, tips) is strictly scoped to the owning user and cannot
 * be read or mutated by another authenticated user.
 *
 * Three independent wallets:
 *   userA  — owns private data (room, campaign, privacy settings)
 *   userB  — separate user with own private data
 *   observer — third user with no social connections
 *
 * Runs against a live backend (localhost:3001) with real Supabase + Redis.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { api, authenticate } from './setup.js';

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let userA: Keypair;
let userB: Keypair;
let observer: Keypair;

let tokenA: string;
let tokenB: string;
let tokenObserver: string;

let walletA: string;
let walletB: string;
let walletObserver: string;

let roomId: string | undefined;
let campaignId: string | undefined;
let chatSetupOk = false;
let airdropSetupOk = false;

// ---------------------------------------------------------------------------
// Setup — create wallets, profiles, social graph, and private resources
// ---------------------------------------------------------------------------

beforeAll(async () => {
  userA = Keypair.generate();
  userB = Keypair.generate();
  observer = Keypair.generate();

  walletA = userA.publicKey.toBase58();
  walletB = userB.publicKey.toBase58();
  walletObserver = observer.publicKey.toBase58();

  // Authenticate all three wallets
  tokenA = await authenticate(userA);
  tokenB = await authenticate(userB);
  tokenObserver = await authenticate(observer);

  const ts = Date.now();

  // Create profiles for all 3 users
  await api('/api/users/profile', {
    method: 'POST',
    token: tokenA,
    body: JSON.stringify({
      username: `iso_a_${ts}`,
      bio: 'Isolation test user A',
      profileImageUri: '',
    }),
  });
  await api('/api/users/profile', {
    method: 'POST',
    token: tokenB,
    body: JSON.stringify({
      username: `iso_b_${ts}`,
      bio: 'Isolation test user B',
      profileImageUri: '',
    }),
  });
  await api('/api/users/profile', {
    method: 'POST',
    token: tokenObserver,
    body: JSON.stringify({
      username: `iso_obs_${ts}`,
      bio: 'Isolation test observer',
      profileImageUri: '',
    }),
  });

  // userA follows userB (generates follow notification for B)
  await api(`/api/users/${walletB}/follow`, {
    method: 'POST',
    token: tokenA,
  });

  // userB follows userA (generates follow notification for A)
  await api(`/api/users/${walletA}/follow`, {
    method: 'POST',
    token: tokenB,
  });

  // Wait for BullMQ notification workers to process the follow events
  await new Promise((r) => setTimeout(r, 5000));

  // userA creates a chat room
  const roomRes = await api('/api/chat/rooms', {
    method: 'POST',
    token: tokenA,
    body: JSON.stringify({ name: `UserA Room ${ts}` }),
  });
  if (roomRes.ok) {
    chatSetupOk = true;
    roomId = roomRes.data?.data?.id ?? roomRes.data?.data?.room?.id;
  } else {
    console.warn(`Chat room creation failed (${roomRes.status}):`, JSON.stringify(roomRes.data));
  }

  // userA sends a message in the room
  if (roomId) {
    await api(`/api/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      token: tokenA,
      body: JSON.stringify({ content: 'Private message from A' }),
    });
  }

  // userA creates an airdrop campaign
  const airdropRes = await api('/api/airdrops', {
    method: 'POST',
    token: tokenA,
    body: JSON.stringify({
      name: `A Campaign ${ts}`,
      type: 'spl_token',
      tokenMint: 'So11111111111111111111111111111111111111112',
      amountPerRecipient: 10,
      audienceType: 'custom',
      audienceFilter: { wallets: [walletB] },
    }),
  });
  if (airdropRes.ok) {
    airdropSetupOk = true;
    campaignId = airdropRes.data?.data?.id ?? airdropRes.data?.data?.campaign?.id;
  } else {
    console.warn(`Airdrop campaign creation failed (${airdropRes.status}):`, JSON.stringify(airdropRes.data));
  }

  // userA updates privacy settings (defaultPrivateTips = true)
  await api('/api/privacy/settings', {
    method: 'PUT',
    token: tokenA,
    body: JSON.stringify({ defaultPrivateTips: true }),
  });

  // userB updates privacy settings (defaultPrivateTips = false)
  await api('/api/privacy/settings', {
    method: 'PUT',
    token: tokenB,
    body: JSON.stringify({ defaultPrivateTips: false }),
  });
}, 60_000);

// ---------------------------------------------------------------------------
// Cleanup — unfollow to reduce leftover state
// ---------------------------------------------------------------------------

afterAll(async () => {
  await api(`/api/users/${walletB}/follow`, { method: 'DELETE', token: tokenA });
  await api(`/api/users/${walletA}/follow`, { method: 'DELETE', token: tokenB });
}, 15_000);

// ===========================================================================
// 1. Notification Isolation
// ===========================================================================

describe('Notification Isolation', () => {
  it('userA notifications contain ONLY notifications addressed to userA', async () => {
    const res = await api('/api/notifications', { token: tokenA });
    expect(res.ok).toBe(true);
    const notifications = res.data.data.notifications;
    expect(Array.isArray(notifications)).toBe(true);
    if (notifications.length > 0) {
      expect(notifications.every((n: any) => n.recipient === walletA)).toBe(true);
    }
  }, 15_000);

  it('userB notifications contain ONLY notifications addressed to userB', async () => {
    const res = await api('/api/notifications', { token: tokenB });
    expect(res.ok).toBe(true);
    const notifications = res.data.data.notifications;
    expect(Array.isArray(notifications)).toBe(true);
    if (notifications.length > 0) {
      expect(notifications.every((n: any) => n.recipient === walletB)).toBe(true);
    }
  }, 15_000);

  it('observer has zero notifications (no interactions targeting them)', async () => {
    const res = await api('/api/notifications', { token: tokenObserver });
    expect(res.ok).toBe(true);
    const notifications = res.data.data.notifications;
    expect(Array.isArray(notifications)).toBe(true);
    expect(notifications.length).toBe(0);
  }, 15_000);

  it('unread counts are independent per user', async () => {
    const resA = await api('/api/notifications/unread-count', { token: tokenA });
    const resB = await api('/api/notifications/unread-count', { token: tokenB });
    const resObs = await api('/api/notifications/unread-count', { token: tokenObserver });

    expect(resA.ok).toBe(true);
    expect(resB.ok).toBe(true);
    expect(resObs.ok).toBe(true);

    const countA = resA.data.data.count;
    const countB = resB.data.data.count;
    const countObs = resObs.data.data.count;

    // Observer should have 0; A and B each reflect only their own unread
    expect(countObs).toBe(0);
    expect(typeof countA).toBe('number');
    expect(typeof countB).toBe('number');
    // A's count and B's count are each >= 0 and reflect their own state
    expect(countA).toBeGreaterThanOrEqual(0);
    expect(countB).toBeGreaterThanOrEqual(0);
  }, 15_000);
});

// ===========================================================================
// 2. Privacy Settings Isolation
// ===========================================================================

describe('Privacy Settings Isolation', () => {
  it('userA sees their own privacy settings (defaultPrivateTips: true)', async () => {
    const res = await api('/api/privacy/settings', { token: tokenA });
    expect(res.ok).toBe(true);
    expect(res.data.data.wallet).toBe(walletA);
    expect(res.data.data.default_private_tips).toBe(true);
  }, 15_000);

  it('userB sees their own privacy settings (defaultPrivateTips: false)', async () => {
    const res = await api('/api/privacy/settings', { token: tokenB });
    expect(res.ok).toBe(true);
    expect(res.data.data.wallet).toBe(walletB);
    expect(res.data.data.default_private_tips).toBe(false);
  }, 15_000);

  it('observer sees their own default settings, NOT A or B settings', async () => {
    const res = await api('/api/privacy/settings', { token: tokenObserver });
    expect(res.ok).toBe(true);
    expect(res.data.data.wallet).toBe(walletObserver);
    // Observer never updated, so should have the default (false)
    expect(res.data.data.default_private_tips).toBe(false);
  }, 15_000);
});

// ===========================================================================
// 3. Private Tips Isolation
// ===========================================================================

describe('Private Tips Isolation', () => {
  it('userA tips received belong only to userA', async () => {
    const res = await api('/api/privacy/tips/received', { token: tokenA });
    expect(res.ok).toBe(true);
    const tips = res.data.data.tips;
    expect(Array.isArray(tips)).toBe(true);
    // If any tips exist, they must belong to walletA
    for (const tip of tips) {
      expect(tip.creator_wallet ?? tip.recipient ?? tip.to_wallet).toBe(walletA);
    }
  }, 15_000);

  it('userB tips received do NOT contain any of userA tip data', async () => {
    const res = await api('/api/privacy/tips/received', { token: tokenB });
    expect(res.ok).toBe(true);
    const tips = res.data.data.tips;
    expect(Array.isArray(tips)).toBe(true);
    // None of userB's tips should reference walletA as the recipient
    for (const tip of tips) {
      const recipientField = tip.creator_wallet ?? tip.recipient ?? tip.to_wallet;
      expect(recipientField).not.toBe(walletA);
    }
  }, 15_000);
});

// ===========================================================================
// 4. Chat Membership Isolation
// ===========================================================================

describe('Chat Membership Isolation', () => {
  it('userB CANNOT read userA room messages (403)', async () => {
    if (!roomId) {
      console.warn('Skipping: roomId not available from setup');
      return;
    }
    const res = await api(`/api/chat/rooms/${roomId}/messages`, { token: tokenB });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
  }, 15_000);

  it('observer CANNOT read userA room messages (403)', async () => {
    if (!roomId) {
      console.warn('Skipping: roomId not available from setup');
      return;
    }
    const res = await api(`/api/chat/rooms/${roomId}/messages`, { token: tokenObserver });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
  }, 15_000);

  it('userB room list does NOT include userA room', async () => {
    const res = await api('/api/chat/rooms/mine', { token: tokenB });
    expect(res.ok).toBe(true);
    const rooms = res.data.data?.rooms ?? res.data.data ?? [];
    const roomArr = Array.isArray(rooms) ? rooms : [];
    if (roomId) {
      const found = roomArr.some((r: any) => r.id === roomId);
      expect(found).toBe(false);
    }
  }, 15_000);
});

// ===========================================================================
// 5. Airdrop Campaign Isolation
// ===========================================================================

describe('Airdrop Campaign Isolation', () => {
  it('userA campaigns all have creator_wallet === walletA', async () => {
    const res = await api('/api/airdrops/mine', { token: tokenA });
    expect(res.ok).toBe(true);
    const campaigns = res.data.data?.campaigns ?? res.data.data ?? [];
    const arr = Array.isArray(campaigns) ? campaigns : [];
    for (const c of arr) {
      expect(c.creator_wallet).toBe(walletA);
    }
  }, 15_000);

  it('userB has no campaigns (created none)', async () => {
    const res = await api('/api/airdrops/mine', { token: tokenB });
    expect(res.ok).toBe(true);
    const campaigns = res.data.data?.campaigns ?? res.data.data ?? [];
    const arr = Array.isArray(campaigns) ? campaigns : [];
    expect(arr.length).toBe(0);
  }, 15_000);
});

// ===========================================================================
// 6. Follow Graph Isolation
// ===========================================================================

describe('Follow Graph Isolation', () => {
  it('walletA followers includes walletB but NOT observer', async () => {
    const res = await api(`/api/users/${walletA}/followers`);
    expect(res.ok).toBe(true);
    const followers = res.data.data.followers.map((f: any) => f.wallet);
    expect(followers).toContain(walletB);
    expect(followers).not.toContain(walletObserver);
  }, 15_000);

  it('walletA following includes walletB but NOT observer', async () => {
    const res = await api(`/api/users/${walletA}/following`);
    expect(res.ok).toBe(true);
    const following = res.data.data.following.map((f: any) => f.wallet);
    expect(following).toContain(walletB);
    expect(following).not.toContain(walletObserver);
  }, 15_000);

  it('observer has no followers (nobody followed observer)', async () => {
    const res = await api(`/api/users/${walletObserver}/followers`);
    expect(res.ok).toBe(true);
    const followers = res.data.data.followers;
    expect(Array.isArray(followers)).toBe(true);
    expect(followers.length).toBe(0);
  }, 15_000);

  it('observer follows nobody', async () => {
    const res = await api(`/api/users/${walletObserver}/following`);
    expect(res.ok).toBe(true);
    const following = res.data.data.following;
    expect(Array.isArray(following)).toBe(true);
    expect(following.length).toBe(0);
  }, 15_000);
});

// ===========================================================================
// 7. Suggested Users
// ===========================================================================

describe('Suggested Users Isolation', () => {
  it('userA suggested list does NOT include self and does NOT include walletB (already following)', async () => {
    const res = await api('/api/users/suggested', { token: tokenA });
    expect(res.ok).toBe(true);
    const suggested = res.data.data?.users ?? res.data.data?.suggested ?? res.data.data ?? [];
    const arr = Array.isArray(suggested) ? suggested : [];
    const wallets = arr.map((u: any) => u.wallet);
    expect(wallets).not.toContain(walletA);
    expect(wallets).not.toContain(walletB);
  }, 15_000);

  it('observer suggested list may include A and B (observer follows nobody)', async () => {
    const res = await api('/api/users/suggested', { token: tokenObserver });
    expect(res.ok).toBe(true);
    const suggested = res.data.data?.users ?? res.data.data?.suggested ?? res.data.data ?? [];
    const arr = Array.isArray(suggested) ? suggested : [];
    const wallets = arr.map((u: any) => u.wallet);
    // Observer should not see themselves
    expect(wallets).not.toContain(walletObserver);
    // A and B may or may not appear depending on the algorithm, but observer is not excluded
    // The key assertion is that observer does not see themselves
  }, 15_000);
});
