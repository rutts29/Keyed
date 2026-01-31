/**
 * Feed Pipeline — the "Home Mixer" of SolShare.
 *
 * Assembles the full candidate pipeline for the "For You" feed by composing
 * all the concrete pipeline components (sources, hydrators, filters, scorers,
 * selector, side effects).
 *
 * This is the TypeScript equivalent of x-algorithm's home-mixer:
 *   Query Hydration -> Candidate Sourcing (Thunder + Phoenix) ->
 *   Hydration -> Filtering -> Scoring -> Selection -> Post-Selection Filtering
 *
 * @see https://github.com/xai-org/x-algorithm/tree/main/home-mixer
 */

import { CandidatePipeline } from './candidate-pipeline.js';
import type { FeedQuery, FeedCandidate, PipelineResult } from './types.js';
import { fetchActionWeights } from './types.js';

// Sources (Thunder + Phoenix equivalent)
import { InNetworkSource, OutOfNetworkSource, TrendingSource } from './sources.js';

// Hydrators
import { UserContextHydrator, CoreDataHydrator } from './hydrators.js';

// Filters
import {
  DeduplicateFilter,
  AgeFilter,
  SelfPostFilter,
  BlockedAuthorFilter,
  SeenPostsFilter,
  MutedKeywordFilter,
  AuthorDiversityFilter,
} from './filters.js';

// Scorers
import {
  EngagementScorer,
  WeightedScorer,
  InNetworkBoostScorer,
  FreshnessScorer,
} from './scorers.js';

// Selector
import { ScoreSelector } from './selector.js';

// Side effects
import { CacheFeedSideEffect, MetricsLogSideEffect } from './side-effects.js';

/**
 * Create the personalized "For You" feed pipeline.
 *
 * Pipeline stages (mirrors x-algorithm execution order):
 *
 * 1. **Query Hydration**: Fetch user's following list, liked posts, seen posts
 * 2. **Candidate Sourcing** (parallel):
 *    - InNetworkSource: Posts from followed accounts (≈ Thunder)
 *    - OutOfNetworkSource: AI-retrieved posts via two-tower retrieval (≈ Phoenix)
 *    - TrendingSource: Popular posts for cold-start users
 * 3. **Candidate Hydration**: Enrich OON candidates with full DB records
 * 4. **Pre-Scoring Filters** (sequential):
 *    - DeduplicateFilter: Remove duplicate post IDs
 *    - AgeFilter: Remove posts older than 7 days
 *    - SelfPostFilter: Remove user's own posts
 *    - BlockedAuthorFilter: Remove blocked/muted authors
 *    - SeenPostsFilter: Remove previously seen posts
 *    - MutedKeywordFilter: Remove posts with muted keywords
 * 5. **Scoring** (sequential):
 *    - EngagementScorer: Multi-action engagement prediction (≈ Phoenix Scorer)
 *    - WeightedScorer: Combine action probabilities → final score
 *    - InNetworkBoostScorer: Boost in-network content
 *    - FreshnessScorer: Time decay for stale content
 * 6. **Selection**: Sort by score, pick top-K
 * 7. **Post-Selection Filters**:
 *    - AuthorDiversityFilter: Max 2 posts per creator
 * 8. **Side Effects** (fire-and-forget):
 *    - CacheFeedSideEffect: Cache first page
 *    - MetricsLogSideEffect: Log pipeline metrics
 */
export function createForYouPipeline(
  resultSize: number = 20,
  weights?: Partial<Record<string, number>>,
): CandidatePipeline<FeedQuery, FeedCandidate> {
  return new CandidatePipeline<FeedQuery, FeedCandidate>({
    name: 'ForYouFeedPipeline',
    resultSize,

    queryHydrators: [new UserContextHydrator()],

    sources: [
      new InNetworkSource(),
      new OutOfNetworkSource(),
      new TrendingSource(),
    ],

    hydrators: [new CoreDataHydrator()],

    filters: [
      new DeduplicateFilter(),
      new AgeFilter(7),
      new SelfPostFilter(),
      new BlockedAuthorFilter(),
      new SeenPostsFilter(),
      new MutedKeywordFilter(),
    ],

    scorers: [
      new EngagementScorer(),
      new WeightedScorer(weights),
      new InNetworkBoostScorer(1.2),
      new FreshnessScorer(48),
    ],

    selector: new ScoreSelector(),

    postSelectionFilters: [new AuthorDiversityFilter(2)],

    sideEffects: [new CacheFeedSideEffect(), new MetricsLogSideEffect()],
  });
}

/**
 * Execute the "For You" pipeline for a user.
 *
 * @param userWallet - User's wallet address.
 * @param limit - Max posts to return.
 * @param cursor - Pagination cursor.
 * @returns Pipeline result with selected candidates and metrics.
 */
export async function executeForYouPipeline(
  userWallet: string,
  limit: number = 20,
  cursor?: string,
): Promise<PipelineResult<FeedQuery, FeedCandidate>> {
  const weights = await fetchActionWeights();
  const pipeline = createForYouPipeline(limit, weights);

  const query: FeedQuery = {
    requestId: `feed_${userWallet}_${Date.now()}`,
    userWallet,
    limit,
    cursor,
    // These will be populated by UserContextHydrator
    followingWallets: [],
    likedPostIds: [],
    seenPostIds: [],
    blockedWallets: [],
    mutedKeywords: [],
    tasteProfile: null,
    tasteEmbedding: null,
  };

  return pipeline.execute(query);
}
