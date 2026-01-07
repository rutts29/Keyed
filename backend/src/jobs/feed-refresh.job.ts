import { Job } from 'bullmq';
import { cacheService } from '../services/cache.service.js';
import { logger } from '../utils/logger.js';

interface FeedRefreshData {
  wallet: string;
  reason: 'new_follow' | 'new_post' | 'scheduled';
}

export async function processFeedRefresh(job: Job<FeedRefreshData>) {
  const { wallet, reason } = job.data;
  
  logger.info({ wallet, reason }, 'Refreshing feed cache');
  
  await cacheService.invalidateFeed(wallet);
  
  if (reason === 'new_follow') {
    await cacheService.invalidateFollowing(wallet);
  }
  
  return { success: true, wallet };
}
