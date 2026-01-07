"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNotification = processNotification;
const supabase_js_1 = require("../config/supabase.js");
const realtime_service_js_1 = require("../services/realtime.service.js");
const logger_js_1 = require("../utils/logger.js");
async function processNotification(job) {
    const { type, postId, creatorWallet, targetWallet, fromWallet, amount } = job.data;
    logger_js_1.logger.info({ type, postId }, 'Processing notification');
    switch (type) {
        case 'new_post': {
            if (!postId || !creatorWallet)
                break;
            const { data: post } = await supabase_js_1.supabase
                .from('posts')
                .select('*, users!posts_creator_wallet_fkey(*)')
                .eq('id', postId)
                .single();
            if (post) {
                await realtime_service_js_1.realtimeService.notifyNewPost(post, creatorWallet);
            }
            break;
        }
        case 'like': {
            if (!postId || !targetWallet || !fromWallet)
                break;
            await realtime_service_js_1.realtimeService.notifyLike(postId, fromWallet, targetWallet);
            break;
        }
        case 'comment': {
            if (!postId || !targetWallet)
                break;
            const { data: comment } = await supabase_js_1.supabase
                .from('comments')
                .select('*')
                .eq('post_id', postId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();
            if (comment) {
                await realtime_service_js_1.realtimeService.notifyComment(postId, comment, targetWallet);
            }
            break;
        }
        case 'follow': {
            if (!targetWallet || !fromWallet)
                break;
            await realtime_service_js_1.realtimeService.notifyFollow(fromWallet, targetWallet);
            break;
        }
        case 'tip': {
            if (!targetWallet || !fromWallet || !amount)
                break;
            await realtime_service_js_1.realtimeService.notifyTip(fromWallet, targetWallet, amount, postId);
            break;
        }
    }
    return { success: true, type };
}
//# sourceMappingURL=notification.job.js.map