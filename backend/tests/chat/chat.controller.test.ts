import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../src/types/index.js';
import { AppError } from '../../src/middleware/errorHandler.js';

// ---- Mocks (before controller import) ----

const mockFrom = vi.fn();

vi.mock('../../src/config/supabase.js', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: vi.fn(() => ({ send: vi.fn() })),
  },
}));

const mockGetTokenAccountsByOwner = vi.fn();
const mockGetTokenAccountBalance = vi.fn();

vi.mock('../../src/config/solana.js', () => ({
  connection: {
    getTokenAccountsByOwner: (...args: unknown[]) => mockGetTokenAccountsByOwner(...args),
    getTokenAccountBalance: (...args: unknown[]) => mockGetTokenAccountBalance(...args),
  },
}));

const mockBroadcast = vi.fn();

vi.mock('../../src/services/realtime.service.js', () => ({
  realtimeService: {
    broadcast: (...args: unknown[]) => mockBroadcast(...args),
  },
}));

// Stub @solana/web3.js PublicKey to avoid real crypto
vi.mock('@solana/web3.js', () => ({
  PublicKey: vi.fn().mockImplementation((val: string) => ({ toBase58: () => val, toString: () => val })),
}));

// ---- Import controller after mocks ----
import { chatController } from '../../src/controllers/chat.controller.js';

// ---- Helpers ----

/**
 * Build a chainable mock that mimics supabase query builder.
 * Terminal call (single / then / the chain itself) resolves to `result`.
 */
function mockSupabaseChain(result: { data?: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, any> = {};
  const methods = [
    'from', 'select', 'insert', 'update', 'delete',
    'eq', 'lt', 'gte', 'order', 'limit', 'single',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make the chain itself act as a thenable so `await query` works
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  // `single()` is a terminal — resolve it
  chain.single = vi.fn().mockResolvedValue(result);
  return chain;
}

function createMockReq(overrides: Partial<AuthenticatedRequest> & Record<string, unknown> = {}): AuthenticatedRequest {
  return {
    wallet: 'testWallet123',
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

function createMockRes() {
  const res = {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

// ---- Test Suite ----

describe('chatController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================== createRoom =====================
  describe('createRoom', () => {
    it('should create room and auto-join creator', async () => {
      const roomData = { id: 'room1', name: 'Test', creator_wallet: 'testWallet123' };
      const insertChain = mockSupabaseChain({ data: roomData, error: null });
      const memberChain = mockSupabaseChain({ data: {}, error: null });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return insertChain;
        if (table === 'chat_members') return memberChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ body: { name: 'Test Room' } });
      const res = createMockRes();

      await chatController.createRoom(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: roomData });
      expect(mockFrom).toHaveBeenCalledWith('chat_rooms');
      expect(mockFrom).toHaveBeenCalledWith('chat_members');
    });

    it('should reject empty name', async () => {
      const req = createMockReq({ body: { name: '' } });
      const res = createMockRes();

      await expect(chatController.createRoom(req, res)).rejects.toThrow(AppError);
      await expect(chatController.createRoom(req, res)).rejects.toThrow('Room name is required');
    });

    it('should reject name over 100 chars', async () => {
      const req = createMockReq({ body: { name: 'a'.repeat(101) } });
      const res = createMockRes();

      await expect(chatController.createRoom(req, res)).rejects.toThrow(AppError);
    });

    it('should resolve gate_type=token when requiredToken provided', async () => {
      const roomData = { id: 'room1', gate_type: 'token' };
      const insertChain = mockSupabaseChain({ data: roomData, error: null });
      const memberChain = mockSupabaseChain({ data: {}, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return insertChain;
        if (table === 'chat_members') return memberChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ body: { name: 'Token Room', requiredToken: 'SoMeToKeN' } });
      const res = createMockRes();

      await chatController.createRoom(req, res);

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ gate_type: 'token' })
      );
    });

    it('should resolve gate_type=nft when requiredNftCollection provided', async () => {
      const roomData = { id: 'room1', gate_type: 'nft' };
      const insertChain = mockSupabaseChain({ data: roomData, error: null });
      const memberChain = mockSupabaseChain({ data: {}, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return insertChain;
        if (table === 'chat_members') return memberChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ body: { name: 'NFT Room', requiredNftCollection: 'NftCol' } });
      const res = createMockRes();

      await chatController.createRoom(req, res);

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ gate_type: 'nft' })
      );
    });

    it('should resolve gate_type=both when both token and nft provided', async () => {
      const roomData = { id: 'room1', gate_type: 'both' };
      const insertChain = mockSupabaseChain({ data: roomData, error: null });
      const memberChain = mockSupabaseChain({ data: {}, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return insertChain;
        if (table === 'chat_members') return memberChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ body: { name: 'Both Room', requiredToken: 'tok', requiredNftCollection: 'nft' } });
      const res = createMockRes();

      await chatController.createRoom(req, res);

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ gate_type: 'both' })
      );
    });

    it('should default gate_type=open', async () => {
      const roomData = { id: 'room1', gate_type: 'open' };
      const insertChain = mockSupabaseChain({ data: roomData, error: null });
      const memberChain = mockSupabaseChain({ data: {}, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return insertChain;
        if (table === 'chat_members') return memberChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ body: { name: 'Open Room' } });
      const res = createMockRes();

      await chatController.createRoom(req, res);

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ gate_type: 'open' })
      );
    });

    it('should throw 500 on supabase insert error', async () => {
      const insertChain = mockSupabaseChain({ data: null, error: { message: 'db error' } });
      mockFrom.mockReturnValue(insertChain);

      const req = createMockReq({ body: { name: 'Fail Room' } });
      const res = createMockRes();

      await expect(chatController.createRoom(req, res)).rejects.toThrow('Failed to create chat room');
    });
  });

  // ===================== getRooms =====================
  describe('getRooms', () => {
    it('should return rooms with pagination', async () => {
      const rooms = Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, created_at: `2024-01-${String(20 - i).padStart(2, '0')}` }));
      const chain = mockSupabaseChain({ data: rooms, error: null });
      mockFrom.mockReturnValue(chain);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await chatController.getRooms(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          rooms,
          nextCursor: rooms[rooms.length - 1].created_at,
        },
      });
    });

    it('should return null nextCursor when fewer than limit', async () => {
      const rooms = [{ id: 'r1', created_at: '2024-01-01' }];
      const chain = mockSupabaseChain({ data: rooms, error: null });
      mockFrom.mockReturnValue(chain);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await chatController.getRooms(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { rooms, nextCursor: null },
      });
    });

    it('should filter by creator query param', async () => {
      const chain = mockSupabaseChain({ data: [], error: null });
      mockFrom.mockReturnValue(chain);

      const req = createMockReq({ query: { creator: 'walletXYZ' } });
      const res = createMockRes();

      await chatController.getRooms(req, res);

      // eq should be called with creator_wallet filter
      expect(chain.eq).toHaveBeenCalledWith('creator_wallet', 'walletXYZ');
    });

    it('should apply cursor filter', async () => {
      const chain = mockSupabaseChain({ data: [], error: null });
      mockFrom.mockReturnValue(chain);

      const req = createMockReq({ query: { cursor: '2024-01-15' } });
      const res = createMockRes();

      await chatController.getRooms(req, res);

      expect(chain.lt).toHaveBeenCalledWith('created_at', '2024-01-15');
    });
  });

  // ===================== getRoom =====================
  describe('getRoom', () => {
    it('should return room by id', async () => {
      const room = { id: 'room1', name: 'Cool Room' };
      const chain = mockSupabaseChain({ data: room, error: null });
      mockFrom.mockReturnValue(chain);

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      await chatController.getRoom(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: room });
    });

    it('should throw 404 when not found', async () => {
      const chain = mockSupabaseChain({ data: null, error: { code: 'PGRST116' } });
      mockFrom.mockReturnValue(chain);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const res = createMockRes();

      await expect(chatController.getRoom(req, res)).rejects.toThrow('Room not found');
    });
  });

  // ===================== getMyRooms =====================
  describe('getMyRooms', () => {
    it('should return created and joined rooms', async () => {
      const createdRooms = [{ id: 'r1' }];
      const joinedData = [{ chat_rooms: { id: 'r2' } }];

      const createdChain = mockSupabaseChain({ data: createdRooms, error: null });
      const joinedChain = mockSupabaseChain({ data: joinedData, error: null });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return createdChain;
        if (table === 'chat_members') return joinedChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq();
      const res = createMockRes();

      await chatController.getMyRooms(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { created: createdRooms, joined: [{ id: 'r2' }] },
      });
    });

    it('should throw 500 on fetch error', async () => {
      const createdChain = mockSupabaseChain({ data: null, error: { message: 'fail' } });
      const joinedChain = mockSupabaseChain({ data: [], error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return createdChain;
        if (table === 'chat_members') return joinedChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq();
      const res = createMockRes();

      await expect(chatController.getMyRooms(req, res)).rejects.toThrow('Failed to fetch rooms');
    });
  });

  // ===================== joinRoom =====================
  describe('joinRoom', () => {
    function setupJoinRoomMocks(opts: {
      room?: Record<string, unknown> | null;
      existingMember?: Record<string, unknown> | null;
      insertError?: unknown;
    }) {
      const { room = null, existingMember = null, insertError = null } = opts;

      // We need to handle multiple from() calls in sequence:
      // 1. from('chat_rooms') -> fetch room (single)
      // 2. from('chat_members') -> check existing (single)
      // 3. from('chat_members') -> insert

      const roomChain = mockSupabaseChain({ data: room, error: room ? null : { code: 'PGRST116' } });
      const existingChain = mockSupabaseChain({ data: existingMember, error: existingMember ? null : { code: 'PGRST116' } });
      const insertChain = mockSupabaseChain({ data: {}, error: insertError });

      const chatMembersCalls: any[] = [];
      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return roomChain;
        if (table === 'chat_members') {
          chatMembersCalls.push(true);
          // First call: check existing member; second call: insert
          if (chatMembersCalls.length === 1) return existingChain;
          return insertChain;
        }
        return mockSupabaseChain({ data: null, error: null });
      });
    }

    it('should join open room successfully', async () => {
      setupJoinRoomMocks({
        room: { id: 'room1', is_active: true, gate_type: 'open', max_members: 100, chat_members: [{ count: 5 }] },
        existingMember: null,
      });

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      await chatController.joinRoom(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { joined: true } });
    });

    it('should return alreadyJoined for existing member', async () => {
      setupJoinRoomMocks({
        room: { id: 'room1', is_active: true, gate_type: 'open', max_members: 100, chat_members: [{ count: 5 }] },
        existingMember: { wallet: 'testWallet123' },
      });

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      await chatController.joinRoom(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { alreadyJoined: true } });
    });

    it('should throw 404 for non-existent room', async () => {
      setupJoinRoomMocks({ room: null });

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const res = createMockRes();

      await expect(chatController.joinRoom(req, res)).rejects.toThrow('Room not found');
    });

    it('should throw 400 for inactive room', async () => {
      setupJoinRoomMocks({
        room: { id: 'room1', is_active: false, gate_type: 'open', max_members: 100, chat_members: [{ count: 5 }] },
      });

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      await expect(chatController.joinRoom(req, res)).rejects.toThrow('Room is no longer active');
    });

    it('should throw 400 when room is full', async () => {
      setupJoinRoomMocks({
        room: { id: 'room1', is_active: true, gate_type: 'open', max_members: 5, chat_members: [{ count: 5 }] },
        existingMember: null,
      });

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      await expect(chatController.joinRoom(req, res)).rejects.toThrow('Room has reached maximum capacity');
    });

    // BUG FIX #4: Token gate failure should throw 403, not return success
    it('should throw 403 when token gate fails', async () => {
      setupJoinRoomMocks({
        room: {
          id: 'room1', is_active: true, gate_type: 'token', max_members: 100,
          chat_members: [{ count: 2 }],
          required_token: 'SomeToken123',
          minimum_balance: 0,
          required_nft_collection: null,
        },
        existingMember: null,
      });

      // verifyTokenGateAccess will call connection methods — make it return no token accounts
      mockGetTokenAccountsByOwner.mockResolvedValue({ value: [] });

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      const err = await chatController.joinRoom(req, res).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(403);
      expect((err as AppError).code).toBe('TOKEN_GATE_FAILED');
    });

    // BUG FIX #5: Token gate should use uiAmount (not raw lamport integer)
    it('should verify token balance with uiAmount', async () => {
      setupJoinRoomMocks({
        room: {
          id: 'room1', is_active: true, gate_type: 'token', max_members: 100,
          chat_members: [{ count: 2 }],
          required_token: 'SomeToken123',
          minimum_balance: 10, // 10 human-readable tokens
          required_nft_collection: null,
        },
        existingMember: null,
      });

      // Return a token account
      mockGetTokenAccountsByOwner.mockResolvedValue({
        value: [{ pubkey: 'tokenAccountPubkey' }],
      });

      // uiAmount=5 (less than 10 required) but raw amount=5000000000 (would pass old buggy code)
      mockGetTokenAccountBalance.mockResolvedValue({
        value: { amount: '5000000000', decimals: 9, uiAmount: 5 },
      });

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      // Should fail because uiAmount(5) < minimumBalance(10)
      const err = await chatController.joinRoom(req, res).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(403);
    });
  });

  // ===================== leaveRoom =====================
  describe('leaveRoom', () => {
    it('should leave room successfully', async () => {
      const deleteChain = mockSupabaseChain({ data: null, error: null });
      // Need to also handle the room fetch for creator check (after bug fix)
      const roomChain = mockSupabaseChain({
        data: { id: 'room1', creator_wallet: 'otherWallet' },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return roomChain;
        if (table === 'chat_members') return deleteChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      await chatController.leaveRoom(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { left: true } });
    });

    it('should throw 500 on delete error', async () => {
      const roomChain = mockSupabaseChain({
        data: { id: 'room1', creator_wallet: 'otherWallet' },
        error: null,
      });
      const deleteChain = mockSupabaseChain({ data: null, error: { message: 'db fail' } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return roomChain;
        if (table === 'chat_members') return deleteChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      await expect(chatController.leaveRoom(req, res)).rejects.toThrow('Failed to leave room');
    });

    // BUG FIX #6: Creator should not be able to leave their own room
    it('should throw 400 when creator tries to leave', async () => {
      const roomChain = mockSupabaseChain({
        data: { id: 'room1', creator_wallet: 'testWallet123' },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_rooms') return roomChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ params: { id: 'room1' } });
      const res = createMockRes();

      const err = await chatController.leaveRoom(req, res).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
      expect((err as AppError).code).toBe('CANNOT_LEAVE');
    });
  });

  // ===================== getMessages =====================
  describe('getMessages', () => {
    it('should return messages for room member', async () => {
      const messages = [{ id: 'm1', content: 'Hello', created_at: '2024-01-01' }];

      const memberChain = mockSupabaseChain({ data: { wallet: 'testWallet123' }, error: null });
      const messagesChain = mockSupabaseChain({ data: messages, error: null });
      const updateChain = mockSupabaseChain({ data: null, error: null });

      const chatMemberCalls: number[] = [];
      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_members') {
          chatMemberCalls.push(1);
          if (chatMemberCalls.length === 1) return memberChain;
          return updateChain;
        }
        if (table === 'chat_messages') return messagesChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ params: { id: 'room1' }, query: {} });
      const res = createMockRes();

      await chatController.getMessages(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { messages, nextCursor: null },
      });
    });

    it('should throw 403 for non-member', async () => {
      const memberChain = mockSupabaseChain({ data: null, error: { code: 'PGRST116' } });
      mockFrom.mockReturnValue(memberChain);

      const req = createMockReq({ params: { id: 'room1' }, query: {} });
      const res = createMockRes();

      await expect(chatController.getMessages(req, res)).rejects.toThrow('You must be a member of this room to view messages');
    });

    it('should paginate with cursor', async () => {
      const messages = [{ id: 'm1', content: 'Hello', created_at: '2024-01-01' }];
      const memberChain = mockSupabaseChain({ data: { wallet: 'testWallet123' }, error: null });
      const messagesChain = mockSupabaseChain({ data: messages, error: null });
      const updateChain = mockSupabaseChain({ data: null, error: null });

      const chatMemberCalls: number[] = [];
      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_members') {
          chatMemberCalls.push(1);
          if (chatMemberCalls.length === 1) return memberChain;
          return updateChain;
        }
        if (table === 'chat_messages') return messagesChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ params: { id: 'room1' }, query: { cursor: '2024-01-15' } });
      const res = createMockRes();

      await chatController.getMessages(req, res);

      expect(messagesChain.lt).toHaveBeenCalledWith('created_at', '2024-01-15');
    });

    it('should update last_seen', async () => {
      const messages = [{ id: 'm1', content: 'Hello', created_at: '2024-01-01' }];
      const memberChain = mockSupabaseChain({ data: { wallet: 'testWallet123' }, error: null });
      const messagesChain = mockSupabaseChain({ data: messages, error: null });
      const updateChain = mockSupabaseChain({ data: null, error: null });

      const chatMemberCalls: number[] = [];
      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_members') {
          chatMemberCalls.push(1);
          if (chatMemberCalls.length === 1) return memberChain;
          return updateChain;
        }
        if (table === 'chat_messages') return messagesChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ params: { id: 'room1' }, query: {} });
      const res = createMockRes();

      await chatController.getMessages(req, res);

      // Verify update was called on chat_members (second call)
      expect(chatMemberCalls.length).toBe(2);
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ last_seen: expect.any(String) })
      );
    });
  });

  // ===================== sendMessage =====================
  describe('sendMessage', () => {
    it('should send message and broadcast via realtime', async () => {
      const messageData = { id: 'msg1', content: 'Hello', sender_wallet: 'testWallet123' };
      const memberChain = mockSupabaseChain({ data: { wallet: 'testWallet123' }, error: null });
      const insertChain = mockSupabaseChain({ data: messageData, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_members') return memberChain;
        if (table === 'chat_messages') return insertChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ params: { id: 'room1' }, body: { content: 'Hello' } });
      const res = createMockRes();

      await chatController.sendMessage(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: messageData });
      expect(mockBroadcast).toHaveBeenCalledWith('chat:room:room1', {
        type: 'chat:message',
        data: messageData,
      });
    });

    it('should reject empty content', async () => {
      const req = createMockReq({ params: { id: 'room1' }, body: { content: '' } });
      const res = createMockRes();

      await expect(chatController.sendMessage(req, res)).rejects.toThrow('Message content is required');
    });

    it('should reject content over 2000 chars', async () => {
      const req = createMockReq({ params: { id: 'room1' }, body: { content: 'x'.repeat(2001) } });
      const res = createMockRes();

      await expect(chatController.sendMessage(req, res)).rejects.toThrow('Message must be 2000 characters or less');
    });

    it('should throw 403 for non-member', async () => {
      const memberChain = mockSupabaseChain({ data: null, error: { code: 'PGRST116' } });
      mockFrom.mockReturnValue(memberChain);

      const req = createMockReq({ params: { id: 'room1' }, body: { content: 'Hello' } });
      const res = createMockRes();

      await expect(chatController.sendMessage(req, res)).rejects.toThrow('You must be a member of this room to send messages');
    });

    it('should throw 500 on insert error', async () => {
      const memberChain = mockSupabaseChain({ data: { wallet: 'testWallet123' }, error: null });
      const insertChain = mockSupabaseChain({ data: null, error: { message: 'db fail' } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'chat_members') return memberChain;
        if (table === 'chat_messages') return insertChain;
        return mockSupabaseChain({ data: null, error: null });
      });

      const req = createMockReq({ params: { id: 'room1' }, body: { content: 'Hello' } });
      const res = createMockRes();

      await expect(chatController.sendMessage(req, res)).rejects.toThrow('Failed to send message');
    });
  });
});
