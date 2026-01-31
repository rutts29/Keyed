import { Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { connection } from '../config/solana.js';
import { realtimeService } from '../services/realtime.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const chatController = {
  async createRoom(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { name, description, requiredToken, minimumBalance, requiredNftCollection, gateType } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'Room name is required');
    }

    if (name.length > 100) {
      throw new AppError(400, 'INVALID_INPUT', 'Room name must be 100 characters or less');
    }

    // Resolve gate type from fields if not explicitly provided
    let resolvedGateType = gateType || 'open';
    if (!gateType) {
      if (requiredToken && requiredNftCollection) resolvedGateType = 'both';
      else if (requiredToken) resolvedGateType = 'token';
      else if (requiredNftCollection) resolvedGateType = 'nft';
    }

    const { data: room, error } = await supabase
      .from('chat_rooms')
      .insert({
        creator_wallet: wallet,
        name: name.trim(),
        description: description || null,
        required_token: requiredToken || null,
        minimum_balance: minimumBalance || 0,
        required_nft_collection: requiredNftCollection || null,
        gate_type: resolvedGateType,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create chat room');
      throw new AppError(500, 'CREATE_FAILED', 'Failed to create chat room');
    }

    // Auto-join creator to the room
    await supabase.from('chat_members').insert({
      room_id: room.id,
      wallet,
    });

    res.json({ success: true, data: room });
  },

  async getRooms(req: AuthenticatedRequest, res: Response) {
    const creator = req.query.creator as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    let query = supabase
      .from('chat_rooms')
      .select('*, chat_members(count)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (creator) {
      query = query.eq('creator_wallet', creator);
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: rooms, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to fetch chat rooms');
      throw new AppError(500, 'FETCH_FAILED', 'Failed to fetch chat rooms');
    }

    const nextCursor = rooms.length === limit ? rooms[rooms.length - 1].created_at : null;

    res.json({ success: true, data: { rooms, nextCursor } });
  },

  async getRoom(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const { data: room, error } = await supabase
      .from('chat_rooms')
      .select('*, chat_members(count)')
      .eq('id', id)
      .single();

    if (error || !room) {
      throw new AppError(404, 'NOT_FOUND', 'Room not found');
    }

    res.json({ success: true, data: room });
  },

  async getMyRooms(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    const [createdResult, joinedResult] = await Promise.all([
      supabase
        .from('chat_rooms')
        .select('*, chat_members(count)')
        .eq('creator_wallet', wallet)
        .order('created_at', { ascending: false }),
      supabase
        .from('chat_members')
        .select('room_id, chat_rooms(*, chat_members(count))')
        .eq('wallet', wallet)
        .order('joined_at', { ascending: false }),
    ]);

    if (createdResult.error) {
      logger.error({ error: createdResult.error }, 'Failed to fetch created rooms');
      throw new AppError(500, 'FETCH_FAILED', 'Failed to fetch rooms');
    }

    const created = createdResult.data || [];
    const joined = (joinedResult.data || [])
      .map((m: { chat_rooms: unknown }) => m.chat_rooms)
      .filter(Boolean);

    res.json({ success: true, data: { created, joined } });
  },

  async joinRoom(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;

    // Fetch room
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('*, chat_members(count)')
      .eq('id', id)
      .single();

    if (!room) {
      throw new AppError(404, 'NOT_FOUND', 'Room not found');
    }

    if (!room.is_active) {
      throw new AppError(400, 'ROOM_INACTIVE', 'Room is no longer active');
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('chat_members')
      .select('wallet')
      .eq('room_id', id)
      .eq('wallet', wallet)
      .single();

    if (existing) {
      res.json({ success: true, data: { alreadyJoined: true } });
      return;
    }

    // Check member count
    const memberCount = room.chat_members?.[0]?.count ?? 0;
    if (memberCount >= room.max_members) {
      throw new AppError(400, 'ROOM_FULL', 'Room has reached maximum capacity');
    }

    // Token gate verification
    if (room.gate_type !== 'open') {
      const hasAccess = await verifyTokenGateAccess(wallet, room);
      if (!hasAccess) {
        res.json({
          success: true,
          data: {
            hasAccess: false,
            requirements: {
              gateType: room.gate_type,
              requiredToken: room.required_token,
              minimumBalance: room.minimum_balance,
              requiredNftCollection: room.required_nft_collection,
            },
          },
        });
        return;
      }
    }

    // Join the room
    const { error } = await supabase.from('chat_members').insert({
      room_id: id,
      wallet,
    });

    if (error) {
      logger.error({ error }, 'Failed to join room');
      throw new AppError(500, 'JOIN_FAILED', 'Failed to join room');
    }

    res.json({ success: true, data: { joined: true } });
  },

  async leaveRoom(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;

    const { error } = await supabase
      .from('chat_members')
      .delete()
      .eq('room_id', id)
      .eq('wallet', wallet);

    if (error) {
      logger.error({ error }, 'Failed to leave room');
      throw new AppError(500, 'LEAVE_FAILED', 'Failed to leave room');
    }

    res.json({ success: true, data: { left: true } });
  },

  async getMessages(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.cursor as string | undefined;

    // Verify membership
    const { data: member } = await supabase
      .from('chat_members')
      .select('wallet')
      .eq('room_id', id)
      .eq('wallet', wallet)
      .single();

    if (!member) {
      throw new AppError(403, 'NOT_MEMBER', 'You must be a member of this room to view messages');
    }

    let query = supabase
      .from('chat_messages')
      .select('*, users!chat_messages_sender_wallet_fkey(wallet, username, profile_image_uri)')
      .eq('room_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: messages, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to fetch messages');
      throw new AppError(500, 'FETCH_FAILED', 'Failed to fetch messages');
    }

    // Update last_seen
    await supabase
      .from('chat_members')
      .update({ last_seen: new Date().toISOString() })
      .eq('room_id', id)
      .eq('wallet', wallet);

    const nextCursor = messages.length === limit ? messages[messages.length - 1].created_at : null;

    res.json({ success: true, data: { messages, nextCursor } });
  },

  async sendMessage(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'Message content is required');
    }

    if (content.length > 2000) {
      throw new AppError(400, 'INVALID_INPUT', 'Message must be 2000 characters or less');
    }

    // Verify membership
    const { data: member } = await supabase
      .from('chat_members')
      .select('wallet')
      .eq('room_id', id)
      .eq('wallet', wallet)
      .single();

    if (!member) {
      throw new AppError(403, 'NOT_MEMBER', 'You must be a member of this room to send messages');
    }

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: id,
        sender_wallet: wallet,
        content: content.trim(),
      })
      .select('*, users!chat_messages_sender_wallet_fkey(wallet, username, profile_image_uri)')
      .single();

    if (error) {
      logger.error({ error }, 'Failed to send message');
      throw new AppError(500, 'SEND_FAILED', 'Failed to send message');
    }

    // Broadcast via realtime
    await realtimeService.broadcast(`chat:room:${id}`, {
      type: 'chat:message',
      data: message,
    });

    res.json({ success: true, data: message });
  },
};

async function verifyTokenGateAccess(
  wallet: string,
  room: { gate_type: string; required_token: string | null; minimum_balance: number; required_nft_collection: string | null }
): Promise<boolean> {
  try {
    const userPubkey = new PublicKey(wallet);

    // Check SPL token balance
    if ((room.gate_type === 'token' || room.gate_type === 'both') && room.required_token) {
      const tokenMint = new PublicKey(room.required_token);
      const tokenAccounts = await connection.getTokenAccountsByOwner(userPubkey, {
        mint: tokenMint,
      });

      if (tokenAccounts.value.length === 0) return false;

      // Check minimum balance if specified
      if (room.minimum_balance > 0) {
        const { value } = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
        const balance = parseInt(value.amount);
        if (balance < room.minimum_balance) return false;
      }
    }

    // Check NFT collection ownership
    if ((room.gate_type === 'nft' || room.gate_type === 'both') && room.required_nft_collection) {
      const collectionMint = new PublicKey(room.required_nft_collection);
      const nftAccounts = await connection.getTokenAccountsByOwner(userPubkey, {
        mint: collectionMint,
      });

      if (nftAccounts.value.length === 0) return false;
    }

    return true;
  } catch (error) {
    logger.error({ error, wallet }, 'Token gate verification failed');
    return false;
  }
}
