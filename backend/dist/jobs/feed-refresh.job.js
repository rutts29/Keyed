import { cacheService } from '../services/cache.service.js';
import { logger } from '../utils/logger.js';
export async function processFeedRefresh(job) {
    const { wallet, reason } = job.data;
    logger.info({ wallet, reason }, 'Refreshing feed cache');
    await cacheService.invalidateFeed(wallet);
    if (reason === 'new_follow') {
        await cacheService.invalidateFollowing(wallet);
    }
    return { success: true, wallet };
}
//# sourceMappingURL=feed-refresh.job.js.map