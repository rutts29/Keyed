/**
 * Core types for the candidate pipeline framework.
 *
 * Inspired by xAI's x-algorithm candidate-pipeline crate.
 * Adapted from Rust traits to TypeScript interfaces for SolShare's
 * recommendation system architecture.
 *
 * @see https://github.com/xai-org/x-algorithm/tree/main/candidate-pipeline
 */

/**
 * Pipeline stages mirror the x-algorithm pipeline execution order:
 * QueryHydration -> Source -> Hydration -> Filter -> Score -> Select -> PostFilter
 */
export enum PipelineStage {
  QueryHydrator = 'QueryHydrator',
  Source = 'Source',
  Hydrator = 'Hydrator',
  Filter = 'Filter',
  Scorer = 'Scorer',
  Selector = 'Selector',
  PostSelectionFilter = 'PostSelectionFilter',
  SideEffect = 'SideEffect',
}

/**
 * Engagement actions predicted by the scoring system.
 * Adapted from x-algorithm's 19 Phoenix actions to SolShare's domain.
 *
 * Positive actions have positive weights; negative actions have negative weights
 * in the final score combination: Score = Σ(weight_i × P(action_i))
 */
export const ENGAGEMENT_ACTIONS = [
  'like',
  'comment',
  'share',
  'save',
  'tip',
  'subscribe',
  'follow_creator',
  'dwell',
  'profile_click',
  'not_interested',
  'mute_creator',
  'report',
] as const;

export type EngagementAction = (typeof ENGAGEMENT_ACTIONS)[number];

/**
 * Multi-action engagement scores predicted per candidate.
 * Each value is P(action) in [0, 1] — the probability the user takes that action.
 *
 * This mirrors Phoenix's multi-action prediction where the transformer outputs
 * probabilities for each engagement type rather than a single relevance score.
 */
export type EngagementScores = Record<EngagementAction, number>;

/**
 * Default action weights for computing the final weighted score.
 * Score = Σ(weight × P(action))
 *
 * Positive weights for desirable engagement, negative for hostile actions.
 * These can be tuned without retraining the model.
 */
export const DEFAULT_ACTION_WEIGHTS: Record<EngagementAction, number> = {
  like: 1.0,
  comment: 1.5,
  share: 2.0,
  save: 1.5,
  tip: 3.0,
  subscribe: 4.0,
  follow_creator: 2.5,
  dwell: 0.5,
  profile_click: 0.5,
  not_interested: -3.0,
  mute_creator: -5.0,
  report: -10.0,
};

/** Query context passed through the pipeline — hydrated with user data. */
export interface FeedQuery {
  requestId: string;
  userWallet: string;
  limit: number;
  cursor?: string;

  // Hydrated fields (populated by QueryHydrators)
  followingWallets: string[];
  likedPostIds: string[];
  seenPostIds: string[];
  blockedWallets: string[];
  mutedKeywords: string[];
  tasteProfile: string | null;
  tasteEmbedding: number[] | null;
}

/** A candidate post flowing through the pipeline. */
export interface FeedCandidate {
  postId: string;
  creatorWallet: string;
  timestamp: string;
  contentUri: string;
  caption: string | null;
  likes: number;
  comments: number;
  tipsReceived: number;

  // Content metadata (from AI analysis)
  description: string | null;
  autoTags: string[] | null;
  sceneType: string | null;
  mood: string | null;

  // Pipeline-assigned fields
  source: 'in_network' | 'out_of_network' | 'trending';
  engagementScores: EngagementScores | null;
  finalScore: number;

  // Token gating
  isTokenGated: boolean;
  requiredToken: string | null;
}

/** Result of a filter stage: kept and removed candidate sets. */
export interface FilterResult<C> {
  kept: C[];
  removed: C[];
}

/** Output returned by the pipeline after all stages execute. */
export interface PipelineResult<Q, C> {
  query: Q;
  retrievedCandidates: C[];
  filteredCandidates: C[];
  selectedCandidates: C[];
  pipelineMetrics: PipelineMetrics;
}

/** Timing and count metrics for observability. */
export interface PipelineMetrics {
  totalMs: number;
  stageMetrics: Record<string, { durationMs: number; candidateCount: number }>;
}
