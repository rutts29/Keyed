/**
 * Pipeline side effects — async operations after candidate selection.
 *
 * Mirrors x-algorithm's SideEffect trait: fire-and-forget operations
 * like caching and logging that don't block the response.
 *
 * @see https://github.com/xai-org/x-algorithm/tree/main/home-mixer/side_effects
 */

import type { SideEffect } from './interfaces.js';
import type { FeedQuery, FeedCandidate } from './types.js';
import { cacheService } from '../services/cache.service.js';
import { logger } from '../utils/logger.js';

/**
 * CacheSideEffect — caches the selected feed for the user.
 * First page only, to speed up subsequent loads.
 */
export class CacheFeedSideEffect implements SideEffect<FeedQuery, FeedCandidate> {
  name = 'CacheFeedSideEffect';

  enable(query: FeedQuery): boolean {
    return !query.cursor; // Only cache first page
  }

  async run(query: FeedQuery, selectedCandidates: FeedCandidate[]): Promise<void> {
    try {
      const cachePayload = {
        posts: selectedCandidates.map((c) => ({
          id: c.postId,
          creator_wallet: c.creatorWallet,
          timestamp: c.timestamp,
          content_uri: c.contentUri,
          caption: c.caption,
          likes: c.likes,
          comments: c.comments,
          source: c.source,
          finalScore: c.finalScore,
        })),
        nextCursor: selectedCandidates.length > 0
          ? selectedCandidates[selectedCandidates.length - 1].timestamp
          : null,
      };

      await cacheService.setFeed(query.userWallet, cachePayload);
    } catch (error) {
      logger.warn({ error, sideEffect: this.name }, 'Feed cache side effect failed');
    }
  }
}

/**
 * MetricsLogSideEffect — logs pipeline metrics for observability.
 */
export class MetricsLogSideEffect implements SideEffect<FeedQuery, FeedCandidate> {
  name = 'MetricsLogSideEffect';

  enable(): boolean {
    return true;
  }

  async run(query: FeedQuery, selectedCandidates: FeedCandidate[]): Promise<void> {
    try {
      const sourceBreakdown: Record<string, number> = {};
      for (const c of selectedCandidates) {
        sourceBreakdown[c.source] = (sourceBreakdown[c.source] || 0) + 1;
      }

      logger.info(
        {
          requestId: query.requestId,
          userWallet: query.userWallet,
          totalSelected: selectedCandidates.length,
          sourceBreakdown,
          avgScore:
            selectedCandidates.length > 0
              ? selectedCandidates.reduce((sum, c) => sum + c.finalScore, 0) /
                selectedCandidates.length
              : 0,
        },
        'Pipeline: feed metrics',
      );
    } catch (error) {
      logger.error({ error, sideEffect: this.name }, 'Metrics logging side effect failed');
    }
  }
}
