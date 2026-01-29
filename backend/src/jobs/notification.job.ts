import { Job } from 'bullmq';
import { supabase } from '../config/supabase.js';
import { realtimeService } from '../services/realtime.service.js';
import { notificationService } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

interface NotificationData {
  type: 'new_post' | 'like' | 'comment' | 'follow' | 'tip';
  postId?: string;
  creatorWallet?: string;
  targetWallet?: string;
  fromWallet?: string;
  amount?: number;
}

export async function processNotification(job: Job<NotificationData>) {
  const { type, postId, creatorWallet, targetWallet, fromWallet, amount } = job.data;
  
  logger.info({ type, postId }, 'Processing notification');
  
  switch (type) {
    case 'new_post': {
      if (!postId || !creatorWallet) break;

      const { data: post } = await supabase
        .from('posts')
        .select('*, users!posts_creator_wallet_fkey(*)')
        .eq('id', postId)
        .single();

      if (post) {
        // Notify followers -- persistence handled per-follower if needed
        await realtimeService.notifyNewPost(post, creatorWallet);
      }
      break;
    }
    
    case 'like': {
      if (!postId || !targetWallet || !fromWallet) break;
      await notificationService.create({
        recipient: targetWallet,
        type: 'like',
        fromWallet,
        postId,
      });
      await realtimeService.notifyLike(postId, fromWallet, targetWallet);
      break;
    }
    
    case 'comment': {
      if (!postId || !targetWallet) break;
      const { data: comment } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (comment) {
        await notificationService.create({
          recipient: targetWallet,
          type: 'comment',
          fromWallet: comment.commenter_wallet ?? fromWallet,
          postId,
          commentId: comment.id,
        });
        await realtimeService.notifyComment(postId, comment, targetWallet);
      }
      break;
    }
    
    case 'follow': {
      if (!targetWallet || !fromWallet) break;
      await notificationService.create({
        recipient: targetWallet,
        type: 'follow',
        fromWallet,
      });
      await realtimeService.notifyFollow(fromWallet, targetWallet);
      break;
    }
    
    case 'tip': {
      if (!targetWallet || !fromWallet || !amount) break;
      await notificationService.create({
        recipient: targetWallet,
        type: 'tip',
        fromWallet,
        postId,
        amount,
      });
      await realtimeService.notifyTip(fromWallet, targetWallet, amount, postId);
      break;
    }
  }
  
  return { success: true, type };
}
