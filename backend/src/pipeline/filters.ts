/**
 * Candidate filters — partition candidates into kept and removed sets.
 *
 * Mirrors x-algorithm's home-mixer filter suite:
 *   - DropDuplicatesFilter
 *   - AgeFilter
 *   - SelfPostFilter
 *   - AuthorSocialgraphFilter (blocked/muted)
 *   - PreviouslySeenPostsFilter
 *   - MutedKeywordFilter
 *   - AuthorDiversityFilter (post-selection)
 *
 * @see https://github.com/xai-org/x-algorithm/tree/main/home-mixer/filters
 */

import type { Filter } from './interfaces.js';
import type { FeedQuery, FeedCandidate, FilterResult } from './types.js';

/**
 * Remove duplicate post IDs, keeping the first occurrence.
 * Mirrors x-algorithm's DropDuplicatesFilter.
 */
export class DeduplicateFilter implements Filter<FeedQuery, FeedCandidate> {
  name = 'DeduplicateFilter';

  enable(): boolean {
    return true;
  }

  async filter(_query: FeedQuery, candidates: FeedCandidate[]): Promise<FilterResult<FeedCandidate>> {
    const seen = new Set<string>();
    const kept: FeedCandidate[] = [];
    const removed: FeedCandidate[] = [];

    for (const c of candidates) {
      if (seen.has(c.postId)) {
        removed.push(c);
      } else {
        seen.add(c.postId);
        kept.push(c);
      }
    }

    return { kept, removed };
  }
}

/**
 * Remove posts older than a threshold (default 7 days).
 * Mirrors x-algorithm's AgeFilter.
 */
export class AgeFilter implements Filter<FeedQuery, FeedCandidate> {
  name = 'AgeFilter';
  private maxAgeMs: number;

  constructor(maxAgeDays = 7) {
    this.maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  }

  enable(): boolean {
    return true;
  }

  async filter(_query: FeedQuery, candidates: FeedCandidate[]): Promise<FilterResult<FeedCandidate>> {
    const cutoff = Date.now() - this.maxAgeMs;
    const kept: FeedCandidate[] = [];
    const removed: FeedCandidate[] = [];

    for (const c of candidates) {
      if (c.timestamp && new Date(c.timestamp).getTime() < cutoff) {
        removed.push(c);
      } else {
        kept.push(c);
      }
    }

    return { kept, removed };
  }
}

/**
 * Remove the user's own posts from the feed.
 * Mirrors x-algorithm's SelfpostFilter.
 */
export class SelfPostFilter implements Filter<FeedQuery, FeedCandidate> {
  name = 'SelfPostFilter';

  enable(): boolean {
    return true;
  }

  async filter(query: FeedQuery, candidates: FeedCandidate[]): Promise<FilterResult<FeedCandidate>> {
    const kept: FeedCandidate[] = [];
    const removed: FeedCandidate[] = [];

    for (const c of candidates) {
      if (c.creatorWallet === query.userWallet) {
        removed.push(c);
      } else {
        kept.push(c);
      }
    }

    return { kept, removed };
  }
}

/**
 * Remove posts from blocked or muted users.
 * Mirrors x-algorithm's AuthorSocialgraphFilter.
 */
export class BlockedAuthorFilter implements Filter<FeedQuery, FeedCandidate> {
  name = 'BlockedAuthorFilter';

  enable(query: FeedQuery): boolean {
    return query.blockedWallets.length > 0;
  }

  async filter(query: FeedQuery, candidates: FeedCandidate[]): Promise<FilterResult<FeedCandidate>> {
    const blockedSet = new Set(query.blockedWallets);
    const kept: FeedCandidate[] = [];
    const removed: FeedCandidate[] = [];

    for (const c of candidates) {
      if (blockedSet.has(c.creatorWallet)) {
        removed.push(c);
      } else {
        kept.push(c);
      }
    }

    return { kept, removed };
  }
}

/**
 * Remove posts the user has already viewed.
 * Mirrors x-algorithm's PreviouslySeenPostsFilter.
 */
export class SeenPostsFilter implements Filter<FeedQuery, FeedCandidate> {
  name = 'SeenPostsFilter';

  enable(query: FeedQuery): boolean {
    return query.seenPostIds.length > 0;
  }

  async filter(query: FeedQuery, candidates: FeedCandidate[]): Promise<FilterResult<FeedCandidate>> {
    const seenSet = new Set(query.seenPostIds);
    const kept: FeedCandidate[] = [];
    const removed: FeedCandidate[] = [];

    for (const c of candidates) {
      if (seenSet.has(c.postId)) {
        removed.push(c);
      } else {
        kept.push(c);
      }
    }

    return { kept, removed };
  }
}

/**
 * Remove posts containing user's muted keywords in caption or tags.
 * Mirrors x-algorithm's MutedKeywordFilter.
 */
export class MutedKeywordFilter implements Filter<FeedQuery, FeedCandidate> {
  name = 'MutedKeywordFilter';

  enable(query: FeedQuery): boolean {
    return query.mutedKeywords.length > 0;
  }

  async filter(query: FeedQuery, candidates: FeedCandidate[]): Promise<FilterResult<FeedCandidate>> {
    const mutedLower = query.mutedKeywords.map((k) => k.toLowerCase());
    const kept: FeedCandidate[] = [];
    const removed: FeedCandidate[] = [];

    for (const c of candidates) {
      const text = [
        c.caption || '',
        ...(c.autoTags || []),
        c.description || '',
      ]
        .join(' ')
        .toLowerCase();

      const hasMuted = mutedLower.some((keyword) => text.includes(keyword));

      if (hasMuted) {
        removed.push(c);
      } else {
        kept.push(c);
      }
    }

    return { kept, removed };
  }
}

/**
 * Post-selection filter: limit posts per creator to ensure diversity.
 * Mirrors x-algorithm's AuthorDiversityScorer (applied as post-selection filter).
 *
 * Max 2 posts per creator in the final feed, unless fewer than limit candidates.
 */
export class AuthorDiversityFilter implements Filter<FeedQuery, FeedCandidate> {
  name = 'AuthorDiversityFilter';
  private maxPerCreator: number;

  constructor(maxPerCreator = 2) {
    this.maxPerCreator = maxPerCreator;
  }

  enable(): boolean {
    return true;
  }

  async filter(_query: FeedQuery, candidates: FeedCandidate[]): Promise<FilterResult<FeedCandidate>> {
    const creatorCount = new Map<string, number>();
    const kept: FeedCandidate[] = [];
    const removed: FeedCandidate[] = [];

    for (const c of candidates) {
      const count = creatorCount.get(c.creatorWallet) || 0;
      if (count >= this.maxPerCreator) {
        removed.push(c);
      } else {
        creatorCount.set(c.creatorWallet, count + 1);
        kept.push(c);
      }
    }

    return { kept, removed };
  }
}
