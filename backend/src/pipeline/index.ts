/**
 * Pipeline module — x-algorithm-inspired recommendation pipeline for SolShare.
 *
 * Architecture mapping:
 *   x-algorithm component          -> SolShare equivalent
 *   ─────────────────────────────────────────────────────
 *   candidate-pipeline (Rust)      -> candidate-pipeline.ts (TypeScript)
 *   home-mixer (Rust)              -> feed-pipeline.ts
 *   phoenix/retrieval (Python/JAX) -> ai-service/retrieval.py
 *   phoenix/ranking (Python/JAX)   -> ai-service/engagement_scorer.py
 *   thunder (Rust)                 -> sources.ts/InNetworkSource (Supabase + Redis)
 *
 * @see https://github.com/xai-org/x-algorithm
 */

// Core pipeline framework
export { CandidatePipeline } from './candidate-pipeline.js';
export type { CandidatePipelineConfig } from './candidate-pipeline.js';

// Interfaces (Rust trait equivalents)
export type {
  QueryHydrator,
  Source,
  Hydrator,
  Filter,
  Scorer,
  Selector,
  SideEffect,
} from './interfaces.js';

// Types
export {
  PipelineStage,
  ENGAGEMENT_ACTIONS,
  DEFAULT_ACTION_WEIGHTS,
} from './types.js';
export type {
  EngagementAction,
  EngagementScores,
  FeedQuery,
  FeedCandidate,
  FilterResult,
  PipelineResult,
  PipelineMetrics,
} from './types.js';

// Concrete implementations
export { InNetworkSource, OutOfNetworkSource, TrendingSource } from './sources.js';
export { UserContextHydrator, CoreDataHydrator } from './hydrators.js';
export {
  DeduplicateFilter,
  AgeFilter,
  SelfPostFilter,
  BlockedAuthorFilter,
  SeenPostsFilter,
  MutedKeywordFilter,
  AuthorDiversityFilter,
} from './filters.js';
export {
  EngagementScorer,
  WeightedScorer,
  InNetworkBoostScorer,
  FreshnessScorer,
} from './scorers.js';
export { ScoreSelector } from './selector.js';
export { CacheFeedSideEffect, MetricsLogSideEffect } from './side-effects.js';

// Feed pipeline assembler (home-mixer)
export { createForYouPipeline, executeForYouPipeline } from './feed-pipeline.js';
