"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFeedRefresh = processFeedRefresh;
const cache_service_js_1 = require("../services/cache.service.js");
const logger_js_1 = require("../utils/logger.js");
async function processFeedRefresh(job) {
    const { wallet, reason } = job.data;
    logger_js_1.logger.info({ wallet, reason }, 'Refreshing feed cache');
    await cache_service_js_1.cacheService.invalidateFeed(wallet);
    if (reason === 'new_follow') {
        await cache_service_js_1.cacheService.invalidateFollowing(wallet);
    }
    return { success: true, wallet };
}
//# sourceMappingURL=feed-refresh.job.js.map