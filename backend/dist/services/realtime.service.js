import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
export const realtimeService = {
    async broadcast(channel, payload) {
        try {
            const channelInstance = supabase.channel(channel);
            await channelInstance.send({
                type: 'broadcast',
                event: payload.type,
                payload: payload.data,
            });
        }
        catch (error) {
            logger.error({ error, channel, payload }, 'Realtime broadcast failed');
        }
    },
    async notifyNewPost(post, creatorWallet) {
        await this.broadcast(`user:${creatorWallet}:followers`, {
            type: 'post:new',
            data: post,
        });
    },
    async notifyLike(postId, likerWallet, postCreatorWallet) {
        await this.broadcast(`user:${postCreatorWallet}`, {
            type: 'post:liked',
            data: { postId, likerWallet },
            targetWallet: postCreatorWallet,
        });
    },
    async notifyTip(fromWallet, toWallet, amount, postId) {
        await this.broadcast(`user:${toWallet}`, {
            type: 'tip:received',
            data: { fromWallet, amount, postId },
            targetWallet: toWallet,
        });
    },
    async notifyFollow(followerWallet, followedWallet) {
        await this.broadcast(`user:${followedWallet}`, {
            type: 'follow:new',
            data: { followerWallet },
            targetWallet: followedWallet,
        });
    },
    async notifyComment(postId, comment, postCreatorWallet) {
        await this.broadcast(`user:${postCreatorWallet}`, {
            type: 'comment:new',
            data: { postId, comment },
            targetWallet: postCreatorWallet,
        });
    },
};
//# sourceMappingURL=realtime.service.js.map