/**
 * Pipeline component interfaces — direct TypeScript translation of the
 * x-algorithm candidate-pipeline Rust traits.
 *
 * Each interface mirrors a Rust trait:
 *   Source     -> source.rs
 *   Hydrator   -> hydrator.rs / query_hydrator.rs
 *   Filter     -> filter.rs
 *   Scorer     -> scorer.rs
 *   Selector   -> selector.rs
 *   SideEffect -> side_effect.rs
 *
 * @see https://github.com/xai-org/x-algorithm/tree/main/candidate-pipeline
 */

import type { FilterResult } from './types.js';

/**
 * QueryHydrator enriches the query with user context data.
 * Runs in parallel where possible (x-algorithm uses join_all).
 */
export interface QueryHydrator<Q> {
  name: string;
  enable(query: Q): boolean;
  hydrate(query: Q): Promise<Partial<Q>>;
}

/**
 * Source fetches raw candidates from a data store.
 * Multiple sources run in parallel and their results are merged.
 *
 * In x-algorithm: Thunder (in-network) + Phoenix Retrieval (out-of-network).
 * In SolShare: FollowingSource + RecommendationSource + TrendingSource.
 */
export interface Source<Q, C> {
  name: string;
  enable(query: Q): boolean;
  getCandidates(query: Q): Promise<C[]>;
}

/**
 * Hydrator enriches candidates with additional data after sourcing.
 * Must return the same number of candidates in the same order.
 */
export interface Hydrator<Q, C> {
  name: string;
  enable(query: Q): boolean;
  hydrate(query: Q, candidates: C[]): Promise<C[]>;
}

/**
 * Filter partitions candidates into kept and removed sets.
 * Filters run sequentially — each sees the output of the previous.
 */
export interface Filter<Q, C> {
  name: string;
  enable(query: Q): boolean;
  filter(query: Q, candidates: C[]): Promise<FilterResult<C>>;
}

/**
 * Scorer assigns scores to candidates. Runs sequentially so scorers
 * can depend on earlier scorers' results (e.g., diversity attenuation
 * depends on the base engagement score).
 *
 * IMPORTANT: Must return the same candidates in the same order.
 * Dropping candidates in a scorer is not allowed — use a Filter instead.
 */
export interface Scorer<Q, C> {
  name: string;
  enable(query: Q): boolean;
  score(query: Q, candidates: C[]): Promise<C[]>;
}

/**
 * Selector sorts scored candidates and picks the top-K.
 * Mirrors x-algorithm's Selector trait with sort + optional truncation.
 */
export interface Selector<Q, C> {
  name: string;
  enable(query: Q): boolean;
  select(query: Q, candidates: C[]): C[];
}

/**
 * SideEffect runs asynchronous operations after selection (caching, logging).
 * Fire-and-forget — does not block the response.
 */
export interface SideEffect<Q, C> {
  name: string;
  enable(query: Q): boolean;
  run(query: Q, selectedCandidates: C[]): Promise<void>;
}
