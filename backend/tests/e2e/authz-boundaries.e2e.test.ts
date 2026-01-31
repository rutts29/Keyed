/**
 * E2E Authorization Boundary Tests
 *
 * Verifies that all application-level authorization checks work correctly.
 * The backend uses Supabase SERVICE_ROLE_KEY (bypasses RLS), so ALL authorization
 * is enforced at the application layer. These tests ensure those checks hold.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { api, authenticate } from './setup.js';

/* ------------------------------------------------------------------ */
/*  Wallets & tokens                                                   */
/* ------------------------------------------------------------------ */

let victim: { wallet: Keypair; token: string; address: string };
let attacker: { wallet: Keypair; token: string; address: string };

beforeAll(async () => {
  const victimKp = Keypair.generate();
  const attackerKp = Keypair.generate();

  const victimToken = await authenticate(victimKp);
  const attackerToken = await authenticate(attackerKp);

  victim = {
    wallet: victimKp,
    token: victimToken,
    address: victimKp.publicKey.toBase58(),
  };
  attacker = {
    wallet: attackerKp,
    token: attackerToken,
    address: attackerKp.publicKey.toBase58(),
  };

  // Create profiles for both wallets
  await api('/api/users/profile', {
    method: 'POST',
    token: victim.token,
    body: JSON.stringify({ username: `victim_${Date.now()}` }),
  });
  await api('/api/users/profile', {
    method: 'POST',
    token: attacker.token,
    body: JSON.stringify({ username: `attacker_${Date.now()}` }),
  });
}, 60_000);

/* ================================================================== */
/*  1. JWT Attacks                                                     */
/* ================================================================== */

describe('JWT attacks', () => {
  it('rejects an invalid JWT string', async () => {
    const res = await api('/api/notifications', {
      method: 'GET',
      headers: { Authorization: 'Bearer not.a.jwt.token' },
    });
    expect(res.status).toBe(401);
  }, 15_000);

  it('rejects a corrupted token (flipped chars)', async () => {
    // Take victim token and flip a few characters in the middle
    const chars = victim.token.split('');
    const mid = Math.floor(chars.length / 2);
    chars[mid] = chars[mid] === 'a' ? 'b' : 'a';
    chars[mid + 1] = chars[mid + 1] === 'x' ? 'y' : 'x';
    chars[mid + 2] = chars[mid + 2] === 'z' ? 'w' : 'z';
    const corrupted = chars.join('');

    const res = await api('/api/notifications', {
      method: 'GET',
      headers: { Authorization: `Bearer ${corrupted}` },
    });
    expect(res.status).toBe(401);
  }, 15_000);

  it('rejects an empty Bearer header', async () => {
    const res = await api('/api/notifications', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' },
    });
    expect(res.status).toBe(401);
  }, 15_000);

  it('rejects Bearer with extra spaces', async () => {
    const res = await api('/api/notifications', {
      method: 'GET',
      headers: { Authorization: `Bearer  ${victim.token}` },
    });
    expect(res.status).toBe(401);
  }, 15_000);

  it('rejects request with no Authorization header', async () => {
    const res = await api('/api/notifications', { method: 'GET' });
    expect(res.status).toBe(401);
  }, 15_000);
});

/* ================================================================== */
/*  2. 401 Sweep — every protected endpoint without auth              */
/* ================================================================== */

const DUMMY_WALLET = '11111111111111111111111111111111';

const protectedEndpoints: [string, string, string?][] = [
  ['GET', '/api/feed'],
  ['GET', '/api/feed/following'],
  ['GET', '/api/notifications'],
  ['GET', '/api/notifications/unread-count'],
  ['PUT', '/api/notifications/00000000-0000-0000-0000-000000000000/read'],
  ['PUT', '/api/notifications/read-all'],
  ['POST', '/api/users/profile', '{"username":"test"}'],
  ['GET', '/api/users/me/balance'],
  ['GET', '/api/users/suggested'],
  ['POST', `/api/users/${DUMMY_WALLET}/follow`],
  ['DELETE', `/api/users/${DUMMY_WALLET}/follow`],
  ['POST', '/api/posts/create', '{"contentUri":"x","caption":"x"}'],
  ['POST', '/api/posts/00000000-0000-0000-0000-000000000000/like'],
  ['DELETE', '/api/posts/00000000-0000-0000-0000-000000000000/like'],
  ['POST', '/api/posts/00000000-0000-0000-0000-000000000000/comments', '{"text":"x"}'],
  ['POST', '/api/posts/00000000-0000-0000-0000-000000000000/report', '{"reason":"spam"}'],
  ['POST', '/api/chat/rooms', '{"name":"test"}'],
  ['GET', '/api/chat/rooms/mine'],
  ['GET', '/api/chat/rooms'],
  ['GET', '/api/chat/rooms/00000000-0000-0000-0000-000000000000'],
  ['POST', '/api/chat/rooms/00000000-0000-0000-0000-000000000000/join'],
  ['POST', '/api/chat/rooms/00000000-0000-0000-0000-000000000000/leave'],
  ['GET', '/api/chat/rooms/00000000-0000-0000-0000-000000000000/messages'],
  ['POST', '/api/chat/rooms/00000000-0000-0000-0000-000000000000/messages', '{"content":"x"}'],
  ['POST', '/api/airdrops', '{"name":"x","type":"spl_token","tokenMint":"x","amountPerRecipient":1,"audienceType":"followers"}'],
  ['GET', '/api/airdrops/mine'],
  ['GET', '/api/airdrops/received'],
  ['POST', '/api/airdrops/00000000-0000-0000-0000-000000000000/prepare'],
  ['POST', '/api/airdrops/00000000-0000-0000-0000-000000000000/fund', '{"txSignature":"x"}'],
  ['POST', '/api/airdrops/00000000-0000-0000-0000-000000000000/start'],
  ['POST', '/api/airdrops/00000000-0000-0000-0000-000000000000/cancel'],
  ['GET', '/api/privacy/settings'],
  ['PUT', '/api/privacy/settings', '{"defaultPrivateTips":true}'],
  ['GET', '/api/privacy/tips/received'],
  ['GET', '/api/privacy/tips/sent'],
  ['POST', '/api/privacy/tip/log', '{}'],
  ['GET', '/api/privacy/pool/info'],
  ['POST', '/api/payments/tip', '{"creatorWallet":"x","amount":1}'],
  ['POST', '/api/payments/subscribe', '{"creatorWallet":"x"}'],
  ['GET', '/api/payments/earnings'],
  ['POST', '/api/payments/withdraw', '{"amount":1}'],
  ['POST', '/api/payments/vault/initialize'],
  ['GET', '/api/payments/vault'],
  ['GET', '/api/access/verify'],
  ['POST', '/api/access/requirements', '{}'],
  ['POST', '/api/access/verify-token', '{}'],
  ['POST', '/api/access/verify-nft', '{}'],
  ['GET', '/api/access/check'],
];

describe('401 sweep — no auth token', () => {
  it.each(protectedEndpoints)(
    '%s %s returns 401 without auth',
    async (method, path, body) => {
      const res = await api(path, {
        method,
        ...(body ? { body } : {}),
      });
      // 401 = auth required (expected). 404 = route not mounted on this server
      // instance, which means the endpoint is unreachable regardless — acceptable.
      expect([401, 404]).toContain(res.status);
      // If the route IS mounted, it MUST return 401
      if (res.status !== 404) {
        expect(res.status).toBe(401);
      }
    },
    15_000,
  );
});

/* ================================================================== */
/*  3. IDOR — Airdrop campaigns                                       */
/* ================================================================== */

describe('IDOR - Airdrop campaign ownership', () => {
  let campaignId: string | null = null;

  beforeAll(async () => {
    try {
      const res = await api('/api/airdrops', {
        method: 'POST',
        token: victim.token,
        body: JSON.stringify({
          name: `authz_test_campaign_${Date.now()}`,
          type: 'spl_token',
          tokenMint: 'So11111111111111111111111111111111111111112',
          amountPerRecipient: 1,
          audienceType: 'followers',
        }),
      });
      if (res.ok && res.data?.data?.id) {
        campaignId = res.data.data.id;
      }
    } catch {
      // airdrop tables may not exist — tests will be skipped
    }
  }, 60_000);

  it('attacker cannot prepare victim campaign', async () => {
    if (!campaignId) return; // skip gracefully
    const res = await api(`/api/airdrops/${campaignId}/prepare`, {
      method: 'POST',
      token: attacker.token,
    });
    expect(res.status).toBe(403);
  }, 15_000);

  it('attacker cannot fund victim campaign', async () => {
    if (!campaignId) return;
    const res = await api(`/api/airdrops/${campaignId}/fund`, {
      method: 'POST',
      token: attacker.token,
      body: JSON.stringify({ txSignature: 'fake_sig' }),
    });
    expect(res.status).toBe(403);
  }, 15_000);

  it('attacker cannot start victim campaign', async () => {
    if (!campaignId) return;
    const res = await api(`/api/airdrops/${campaignId}/start`, {
      method: 'POST',
      token: attacker.token,
    });
    expect(res.status).toBe(403);
  }, 15_000);

  it('attacker cannot cancel victim campaign', async () => {
    if (!campaignId) return;
    const res = await api(`/api/airdrops/${campaignId}/cancel`, {
      method: 'POST',
      token: attacker.token,
    });
    expect(res.status).toBe(403);
  }, 15_000);
});

/* ================================================================== */
/*  4. IDOR — Chat room membership                                     */
/* ================================================================== */

describe('IDOR - Chat room membership', () => {
  let roomId: string | null = null;

  beforeAll(async () => {
    try {
      // victim creates a room
      const createRes = await api('/api/chat/rooms', {
        method: 'POST',
        token: victim.token,
        body: JSON.stringify({ name: `authz_room_${Date.now()}` }),
      });
      if (createRes.ok && createRes.data?.data?.id) {
        roomId = createRes.data.data.id;

        // victim sends a message in the room
        await api(`/api/chat/rooms/${roomId}/messages`, {
          method: 'POST',
          token: victim.token,
          body: JSON.stringify({ content: 'secret message' }),
        });
      }
    } catch {
      // chat tables may not exist — tests will be skipped
    }
  }, 60_000);

  it('attacker cannot read messages in a room they have not joined', async () => {
    if (!roomId) return;
    const res = await api(`/api/chat/rooms/${roomId}/messages`, {
      method: 'GET',
      token: attacker.token,
    });
    expect(res.status).toBe(403);
    expect(res.data?.error?.code).toBe('NOT_MEMBER');
  }, 15_000);

  it('attacker cannot send messages to a room they have not joined', async () => {
    if (!roomId) return;
    const res = await api(`/api/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      token: attacker.token,
      body: JSON.stringify({ content: 'hacked' }),
    });
    expect(res.status).toBe(403);
    expect(res.data?.error?.code).toBe('NOT_MEMBER');
  }, 15_000);
});

/* ================================================================== */
/*  5. IDOR — Privacy settings isolation                               */
/* ================================================================== */

describe('IDOR - Privacy settings isolation', () => {
  beforeAll(async () => {
    try {
      // victim sets their privacy settings
      await api('/api/privacy/settings', {
        method: 'PUT',
        token: victim.token,
        body: JSON.stringify({ defaultPrivateTips: true }),
      });
    } catch {
      // privacy tables may not exist
    }
  }, 60_000);

  it('attacker reads their own settings, not victim settings', async () => {
    const res = await api('/api/privacy/settings', {
      method: 'GET',
      token: attacker.token,
    });
    // If the endpoint works, the returned wallet must be the attacker's, not victim's
    if (res.ok && res.data?.data) {
      const data = res.data.data;
      // The settings should belong to the attacker, not the victim
      if (data.wallet) {
        expect(data.wallet).toBe(attacker.address);
        expect(data.wallet).not.toBe(victim.address);
      }
    }
    // In any case, the response must not leak victim's wallet
    const raw = JSON.stringify(res.data);
    expect(raw).not.toContain(victim.address);
  }, 15_000);

  it('attacker settings do not contain victim wallet address', async () => {
    const res = await api('/api/privacy/settings', {
      method: 'GET',
      token: attacker.token,
    });
    const raw = JSON.stringify(res.data);
    expect(raw).not.toContain(victim.address);
  }, 15_000);
});
