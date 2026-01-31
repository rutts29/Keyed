/**
 * Candidate selector — sorts by score and picks top-K.
 *
 * Mirrors x-algorithm's Selector trait: sort candidates by their scores
 * in descending order and truncate to the requested size.
 *
 * @see https://github.com/xai-org/x-algorithm/blob/main/candidate-pipeline/selector.rs
 */

import type { Selector } from './interfaces.js';
import type { FeedQuery, FeedCandidate } from './types.js';

/**
 * ScoreSelector — sorts candidates by finalScore descending and picks top-K.
 * Direct equivalent of x-algorithm's default Selector implementation.
 */
export class ScoreSelector implements Selector<FeedQuery, FeedCandidate> {
  name = 'ScoreSelector';
  private size: number | null;

  constructor(size?: number) {
    this.size = size ?? null;
  }

  enable(): boolean {
    return true;
  }

  select(query: FeedQuery, candidates: FeedCandidate[]): FeedCandidate[] {
    const sorted = [...candidates].sort((a, b) => b.finalScore - a.finalScore);
    const limit = this.size ?? query.limit;
    return sorted.slice(0, limit);
  }
}
