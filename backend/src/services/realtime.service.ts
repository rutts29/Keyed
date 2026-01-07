import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

type EventType = 'post:new' | 'post:liked' | 'tip:received' | 'follow:new' | 'comment:new';

interface RealtimePayload {
  type: EventType;
  data: unknown;
  targetWallet?: string;
}

export const realtimeService = {
  async broadcast(channel: string, payload: RealtimePayload) {
    try {
      const channelInstance = supabase.channel(channel);
      await channelInstance.send({
        type: 'broadcast',
        event: payload.type,
        payload: payload.data,
      });
    } catch (error) {
      logger.error({ error, channel, payload }, 'Realtime broadcast failed');
    }
  },

  async notifyNewPost(post: unknown, creatorWallet: string) {
    await this.broadcast(`user:${creatorWallet}:followers`, {
      type: 'post:new',
      data: post,
    });
  },

  async notifyLike(postId: string, likerWallet: string, postCreatorWallet: string) {
    await this.broadcast(`user:${postCreatorWallet}`, {
      type: 'post:liked',
      data: { postId, likerWallet },
      targetWallet: postCreatorWallet,
    });
  },

  async notifyTip(
    fromWallet: string,
    toWallet: string,
    amount: number,
    postId?: string
  ) {
    await this.broadcast(`user:${toWallet}`, {
      type: 'tip:received',
      data: { fromWallet, amount, postId },
      targetWallet: toWallet,
    });
  },

  async notifyFollow(followerWallet: string, followedWallet: string) {
    await this.broadcast(`user:${followedWallet}`, {
      type: 'follow:new',
      data: { followerWallet },
      targetWallet: followedWallet,
    });
  },

  async notifyComment(postId: string, comment: unknown, postCreatorWallet: string) {
    await this.broadcast(`user:${postCreatorWallet}`, {
      type: 'comment:new',
      data: { postId, comment },
      targetWallet: postCreatorWallet,
    });
  },
};
