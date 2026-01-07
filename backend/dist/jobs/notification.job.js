import { supabase } from '../config/supabase.js';
import { realtimeService } from '../services/realtime.service.js';
import { logger } from '../utils/logger.js';
export async function processNotification(job) {
    const { type, postId, creatorWallet, targetWallet, fromWallet, amount } = job.data;
    logger.info({ type, postId }, 'Processing notification');
    switch (type) {
        case 'new_post': {
            if (!postId || !creatorWallet)
                break;
            const { data: post } = await supabase
                .from('posts')
                .select('*, users!posts_creator_wallet_fkey(*)')
                .eq('id', postId)
                .single();
            if (post) {
                await realtimeService.notifyNewPost(post, creatorWallet);
            }
            break;
        }
        case 'like': {
            if (!postId || !targetWallet || !fromWallet)
                break;
            await realtimeService.notifyLike(postId, fromWallet, targetWallet);
            break;
        }
        case 'comment': {
            if (!postId || !targetWallet)
                break;
            const { data: comment } = await supabase
                .from('comments')
                .select('*')
                .eq('post_id', postId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();
            if (comment) {
                await realtimeService.notifyComment(postId, comment, targetWallet);
            }
            break;
        }
        case 'follow': {
            if (!targetWallet || !fromWallet)
                break;
            await realtimeService.notifyFollow(fromWallet, targetWallet);
            break;
        }
        case 'tip': {
            if (!targetWallet || !fromWallet || !amount)
                break;
            await realtimeService.notifyTip(fromWallet, targetWallet, amount, postId);
            break;
        }
    }
    return { success: true, type };
}
//# sourceMappingURL=notification.job.js.map