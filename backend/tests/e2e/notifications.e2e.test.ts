/**
 * E2E Notifications Tests
 *
 * Tests notification endpoints: list, unread count, mark read, mark all read.
 * Triggers a follow notification to verify persistence through the job queue.
 *
 * Runs against a live backend (localhost:3001) with real Supabase + Redis.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  api,
  authenticate,
  testWalletA,
  testWalletB,
} from './setup.js';

let tokenA: string;
let tokenB: string;
let walletAddrA: string;
let walletAddrB: string;

beforeAll(async () => {
  walletAddrA = testWalletA.publicKey.toBase58();
  walletAddrB = testWalletB.publicKey.toBase58();

  tokenA = await authenticate(testWalletA);
  tokenB = await authenticate(testWalletB);
}, 30_000);

// ---------------------------------------------------------------------------
// Basic endpoint access
// ---------------------------------------------------------------------------

describe('Notifications - Auth & Empty State', () => {
  it('should reject unauthenticated access (401)', async () => {
    const res = await api('/api/notifications');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should return empty notifications for a new wallet', async () => {
    const res = await api('/api/notifications', { token: tokenA });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.notifications)).toBe(true);
    expect(res.data.data).toHaveProperty('nextCursor');
  });

  it('should return unread count of 0 for a new wallet', async () => {
    const res = await api('/api/notifications/unread-count', { token: tokenA });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Follow triggers a notification
// ---------------------------------------------------------------------------

describe('Notifications - Follow Trigger', () => {
  it('should create a follow notification when wallet A follows wallet B', async () => {
    // Ensure profiles exist (may already exist from other tests)
    await api('/api/users/profile', {
      method: 'POST',
      token: tokenA,
      body: JSON.stringify({
        username: `notif_a_${Date.now()}`,
        bio: 'Notification test A',
        profileImageUri: '',
      }),
    });
    await api('/api/users/profile', {
      method: 'POST',
      token: tokenB,
      body: JSON.stringify({
        username: `notif_b_${Date.now()}`,
        bio: 'Notification test B',
        profileImageUri: '',
      }),
    });

    // Wallet A follows wallet B
    const followRes = await api(`/api/users/${walletAddrB}/follow`, {
      method: 'POST',
      token: tokenA,
    });

    expect(followRes.ok).toBe(true);

    // Wait for the BullMQ notification job to be processed by the worker
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Wallet B should now have a follow notification
    const res = await api('/api/notifications', { token: tokenB });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);

    const followNotif = res.data.data.notifications.find(
      (n: any) => n.type === 'follow' && n.from_wallet === walletAddrA,
    );
    expect(followNotif).toBeDefined();
    expect(followNotif.recipient).toBe(walletAddrB);
    expect(followNotif.read).toBe(false);
  }, 15_000);

  it('should show unread count of at least 1 for wallet B', async () => {
    const res = await api('/api/notifications/unread-count', { token: tokenB });

    expect(res.ok).toBe(true);
    expect(res.data.data.count).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Mark as read
// ---------------------------------------------------------------------------

describe('Notifications - Mark Read', () => {
  let notificationId: string;

  it('should mark a single notification as read', async () => {
    // Get the first notification for wallet B
    const listRes = await api('/api/notifications', { token: tokenB });
    expect(listRes.ok).toBe(true);

    const notifications = listRes.data.data.notifications;
    expect(notifications.length).toBeGreaterThanOrEqual(1);
    notificationId = notifications[0].id;

    const markRes = await api(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      token: tokenB,
    });

    expect(markRes.ok).toBe(true);
    expect(markRes.data.success).toBe(true);
    expect(markRes.data.data.read).toBe(true);
  });

  it('should return 404 for non-existent notification', async () => {
    const res = await api('/api/notifications/00000000-0000-0000-0000-000000000000/read', {
      method: 'PUT',
      token: tokenB,
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  it('should not let wallet A mark wallet B notifications as read', async () => {
    // Get a notification belonging to wallet B
    const listRes = await api('/api/notifications', { token: tokenB });
    if (listRes.ok && listRes.data?.data?.notifications?.length > 0) {
      const id = listRes.data.data.notifications[0].id;

      const res = await api(`/api/notifications/${id}/read`, {
        method: 'PUT',
        token: tokenA, // wallet A trying to mark wallet B's notification
      });

      // Should fail -- either 404 (not found for this wallet) or 403
      expect(res.ok).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Mark all as read
// ---------------------------------------------------------------------------

describe('Notifications - Mark All Read', () => {
  it('should mark all notifications as read', async () => {
    const res = await api('/api/notifications/read-all', {
      method: 'PUT',
      token: tokenB,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('markedRead');
  });

  it('should show unread count of 0 after mark-all', async () => {
    const res = await api('/api/notifications/unread-count', { token: tokenB });

    expect(res.ok).toBe(true);
    expect(res.data.data.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Pagination & filtering
// ---------------------------------------------------------------------------

describe('Notifications - Pagination & Filters', () => {
  it('should respect limit parameter', async () => {
    const res = await api('/api/notifications?limit=1', { token: tokenB });

    expect(res.ok).toBe(true);
    expect(res.data.data.notifications.length).toBeLessThanOrEqual(1);
  });

  it('should filter by type', async () => {
    const res = await api('/api/notifications?type=follow', { token: tokenB });

    expect(res.ok).toBe(true);
    for (const n of res.data.data.notifications) {
      expect(n.type).toBe('follow');
    }
  });

  it('should filter by unread', async () => {
    const res = await api('/api/notifications?unread=true', { token: tokenB });

    expect(res.ok).toBe(true);
    for (const n of res.data.data.notifications) {
      expect(n.read).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Cleanup: unfollow to avoid affecting other test files
// ---------------------------------------------------------------------------

describe('Notifications - Cleanup', () => {
  it('should unfollow wallet B (cleanup)', async () => {
    await api(`/api/users/${walletAddrB}/follow`, {
      method: 'DELETE',
      token: tokenA,
    });
  });
});
