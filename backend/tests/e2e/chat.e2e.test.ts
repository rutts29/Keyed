/**
 * E2E Chat Tests
 *
 * Tests the full chat feature: room creation, discovery, membership,
 * messaging, message history, and pagination.
 *
 * Runs against a live backend (localhost:3001) with real Supabase.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { api, authenticate } from './setup.js';

// ---------------------------------------------------------------------------
// Shared State
// ---------------------------------------------------------------------------

let creatorToken: string;
let memberAToken: string;
let memberBToken: string;
let outsiderToken: string;

let creator: Keypair;
let memberA: Keypair;
let memberB: Keypair;
let outsider: Keypair;

/** ID of the open room created in the first test */
let openRoomId: string;
/** ID of the token-gated room */
let gatedRoomId: string;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  creator = Keypair.generate();
  memberA = Keypair.generate();
  memberB = Keypair.generate();
  outsider = Keypair.generate();

  [creatorToken, memberAToken, memberBToken, outsiderToken] = await Promise.all([
    authenticate(creator),
    authenticate(memberA),
    authenticate(memberB),
    authenticate(outsider),
  ]);
}, 30_000);

// ---------------------------------------------------------------------------
// Room Creation
// ---------------------------------------------------------------------------

describe('Chat - Room Creation', () => {
  it('should create an open room with a valid name', async () => {
    const name = `open-room-${Date.now()}`;
    const res = await api('/api/chat/rooms', {
      method: 'POST',
      token: creatorToken,
      body: JSON.stringify({ name }),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty('id');
    expect(res.data.data.name).toBe(name);
    expect(res.data.data.gate_type).toBe('open');

    openRoomId = res.data.data.id;
  }, 15_000);

  it('should auto-join the creator to the room', async () => {
    const res = await api('/api/chat/rooms/mine', {
      method: 'GET',
      token: creatorToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);

    const joinedIds = res.data.data.joined.map((r: any) => r.id);
    expect(joinedIds).toContain(openRoomId);
  }, 15_000);

  it('should create a token-gated room with requiredToken and minimumBalance', async () => {
    const name = `gated-room-${Date.now()}`;
    const res = await api('/api/chat/rooms', {
      method: 'POST',
      token: creatorToken,
      body: JSON.stringify({
        name,
        gateType: 'token',
        requiredToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
        minimumBalance: 1000,
      }),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.gate_type).toBe('token');
    expect(res.data.data.required_token).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(res.data.data.minimum_balance).toBe(1000);

    gatedRoomId = res.data.data.id;
  }, 15_000);

  it('should reject an empty room name', async () => {
    const res = await api('/api/chat/rooms', {
      method: 'POST',
      token: creatorToken,
      body: JSON.stringify({ name: '' }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  }, 15_000);

  it('should reject a room name over 100 characters', async () => {
    const longName = 'A'.repeat(101);
    const res = await api('/api/chat/rooms', {
      method: 'POST',
      token: creatorToken,
      body: JSON.stringify({ name: longName }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Room Discovery
// ---------------------------------------------------------------------------

describe('Chat - Room Discovery', () => {
  it('should list rooms including the created room', async () => {
    const res = await api('/api/chat/rooms', {
      method: 'GET',
      token: creatorToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.rooms)).toBe(true);

    const roomIds = res.data.data.rooms.map((r: any) => r.id);
    expect(roomIds).toContain(openRoomId);
  }, 15_000);

  it('should get a single room by ID', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}`, {
      method: 'GET',
      token: creatorToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.id).toBe(openRoomId);
  }, 15_000);

  it('should return 404 for a non-existent room UUID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await api(`/api/chat/rooms/${fakeId}`, {
      method: 'GET',
      token: creatorToken,
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
    expect(res.data.success).toBe(false);
    expect(res.data.error.code).toBe('NOT_FOUND');
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

describe('Chat - Membership', () => {
  it('should allow memberA to join the open room', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/join`, {
      method: 'POST',
      token: memberAToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.joined).toBe(true);
  }, 15_000);

  it('should allow memberB to join the open room', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/join`, {
      method: 'POST',
      token: memberBToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.joined).toBe(true);
  }, 15_000);

  it('should return alreadyJoined on duplicate join (idempotent)', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/join`, {
      method: 'POST',
      token: memberAToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.alreadyJoined).toBe(true);
  }, 15_000);

  it('should deny memberA from joining the token-gated room (no tokens)', async () => {
    const res = await api(`/api/chat/rooms/${gatedRoomId}/join`, {
      method: 'POST',
      token: memberAToken,
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
    expect(res.data.success).toBe(false);
    expect(res.data.error.code).toBe('TOKEN_GATE_FAILED');
  }, 15_000);

  it('should allow memberA to leave the open room', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/leave`, {
      method: 'POST',
      token: memberAToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.left).toBe(true);
  }, 15_000);

  it('should prevent the creator from leaving their own room', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/leave`, {
      method: 'POST',
      token: creatorToken,
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.error.code).toBe('CANNOT_LEAVE');
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

describe('Chat - Messaging', () => {
  it('should re-join memberA before messaging tests', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/join`, {
      method: 'POST',
      token: memberAToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
  }, 15_000);

  it('should allow memberA to send a message', async () => {
    await delay(200);
    const res = await api(`/api/chat/rooms/${openRoomId}/messages`, {
      method: 'POST',
      token: memberAToken,
      body: JSON.stringify({ content: 'Hello from A!' }),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.content).toBe('Hello from A!');
    expect(res.data.data.room_id).toBe(openRoomId);
  }, 15_000);

  it('should allow memberB to send a message', async () => {
    await delay(200);
    const res = await api(`/api/chat/rooms/${openRoomId}/messages`, {
      method: 'POST',
      token: memberBToken,
      body: JSON.stringify({ content: 'Hello from B!' }),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.content).toBe('Hello from B!');
  }, 15_000);

  it('should allow creator to send a message', async () => {
    await delay(200);
    const res = await api(`/api/chat/rooms/${openRoomId}/messages`, {
      method: 'POST',
      token: creatorToken,
      body: JSON.stringify({ content: 'Welcome everyone!' }),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.content).toBe('Welcome everyone!');
  }, 15_000);

  it('should reject an empty message', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/messages`, {
      method: 'POST',
      token: memberAToken,
      body: JSON.stringify({ content: '' }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  }, 15_000);

  it('should reject a message over 2000 characters', async () => {
    const longContent = 'X'.repeat(2001);
    const res = await api(`/api/chat/rooms/${openRoomId}/messages`, {
      method: 'POST',
      token: memberAToken,
      body: JSON.stringify({ content: longContent }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  }, 15_000);

  it('should deny outsider from sending a message (not a member)', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/messages`, {
      method: 'POST',
      token: outsiderToken,
      body: JSON.stringify({ content: 'I should not be able to send this' }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
    expect(res.data.success).toBe(false);
    expect(res.data.error.code).toBe('NOT_MEMBER');
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Message History & Pagination
// ---------------------------------------------------------------------------

describe('Chat - Message History & Pagination', () => {
  it('should allow members to read message history', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/messages`, {
      method: 'GET',
      token: memberAToken,
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.messages)).toBe(true);
    expect(res.data.data.messages.length).toBeGreaterThanOrEqual(3);
  }, 15_000);

  it('should deny outsider from reading messages', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/messages`, {
      method: 'GET',
      token: outsiderToken,
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
    expect(res.data.success).toBe(false);
    expect(res.data.error.code).toBe('NOT_MEMBER');
  }, 15_000);

  it('should paginate with limit=1 and return nextCursor', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/messages?limit=1`, {
      method: 'GET',
      token: memberAToken,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.messages).toHaveLength(1);
    expect(res.data.data.nextCursor).toBeTruthy();
  }, 15_000);

  it('should return different (older) messages when using cursor', async () => {
    // Fetch first page
    const page1 = await api(`/api/chat/rooms/${openRoomId}/messages?limit=1`, {
      method: 'GET',
      token: memberAToken,
    });
    expect(page1.ok).toBe(true);
    const cursor = page1.data.data.nextCursor;
    expect(cursor).toBeTruthy();

    // Fetch second page using cursor
    const page2 = await api(`/api/chat/rooms/${openRoomId}/messages?limit=1&cursor=${encodeURIComponent(cursor)}`, {
      method: 'GET',
      token: memberAToken,
    });
    expect(page2.ok).toBe(true);
    expect(page2.data.data.messages).toHaveLength(1);

    // Messages should be different
    const msg1Id = page1.data.data.messages[0].id;
    const msg2Id = page2.data.data.messages[0].id;
    expect(msg1Id).not.toBe(msg2Id);
  }, 15_000);

  it('should return messages ordered newest-first', async () => {
    const res = await api(`/api/chat/rooms/${openRoomId}/messages`, {
      method: 'GET',
      token: memberAToken,
    });

    expect(res.ok).toBe(true);
    const messages = res.data.data.messages;
    expect(messages.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < messages.length - 1; i++) {
      const current = new Date(messages[i].created_at).getTime();
      const next = new Date(messages[i + 1].created_at).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
