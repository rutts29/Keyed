/**
 * Candidate scorers — assign engagement scores to candidates.
 *
 * Mirrors x-algorithm's scoring pipeline:
 *   1. PhoenixScorer: ML engagement predictions (multi-action)
 *   2. WeightedScorer: Combine action probabilities into final score
 *   3. AuthorDiversityScorer: Attenuate repeated author scores
 *   4. OutOfNetworkScorer: Adjust OON content scores
 *
 * @see https://github.com/xai-org/x-algorithm/tree/main/home-mixer/scorers
 */

import type { Scorer } from './interfaces.js';
import type {
  FeedQuery,
  FeedCandidate,
  EngagementScores,
  EngagementAction,
} from './types.js';
import { DEFAULT_ACTION_WEIGHTS } from './types.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

function getAIServiceHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.AI_SERVICE_API_KEY) {
    headers['X-Internal-API-Key'] = env.AI_SERVICE_API_KEY;
  }
  return headers;
}

/**
 * EngagementScorer — calls the AI service to get multi-action engagement
 * predictions for each candidate.
 *
 * Mirrors x-algorithm's PhoenixScorer. In x-algorithm, the Phoenix transformer
 * predicts P(action) for 19 action types. We call our lightweight scorer endpoint.
 *
 * Candidates that already have scores (from OutOfNetworkSource) skip re-scoring.
 */
export class EngagementScorer implements Scorer<FeedQuery, FeedCandidate> {
  name = 'EngagementScorer';

  enable(): boolean {
    return true;
  }

  async score(query: FeedQuery, candidates: FeedCandidate[]): Promise<FeedCandidate[]> {
    // Separate candidates that already have scores (from OON source) from those that need scoring
    const needsScoring = candidates.filter((c) => !c.engagementScores);
    const alreadyScored = candidates.filter((c) => c.engagementScores);

    if (needsScoring.length === 0) {
      return candidates;
    }

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/pipeline/score`, {
        method: 'POST',
        headers: getAIServiceHeaders(),
        body: JSON.stringify({
          user_wallet: query.userWallet,
          liked_post_ids: query.likedPostIds,
          following_wallets: query.followingWallets,
          candidates: needsScoring.map((c) => ({
            post_id: c.postId,
            creator_wallet: c.creatorWallet,
            description: c.description,
            tags: c.autoTags || [],
            scene_type: c.sceneType,
            mood: c.mood,
            likes: c.likes,
            comments: c.comments,
            tips_received: c.tipsReceived,
            age_hours: c.timestamp
              ? (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60)
              : 0,
            is_following_creator: query.followingWallets.includes(c.creatorWallet),
            source: c.source,
          })),
        }),
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'Engagement scoring failed, using fallback');
        return candidates.map((c) => ({
          ...c,
          finalScore: c.finalScore || c.likes * 0.5 + c.comments * 0.3,
        }));
      }

      const data = (await response.json()) as { predictions?: Array<{ post_id: string; scores: EngagementScores; final_score: number }> };
      const predMap = new Map<string, { scores: EngagementScores; finalScore: number }>();

      for (const pred of data.predictions || []) {
        predMap.set(pred.post_id, {
          scores: pred.scores as EngagementScores,
          finalScore: pred.final_score,
        });
      }

      // Merge scores back into candidates (preserving order)
      return candidates.map((c) => {
        if (c.engagementScores) return c; // Already scored
        const pred = predMap.get(c.postId);
        if (pred) {
          return { ...c, engagementScores: pred.scores, finalScore: pred.finalScore };
        }
        return c;
      });
    } catch (error) {
      logger.error({ error }, 'Engagement scoring error, using fallback');
      return candidates.map((c) => ({
        ...c,
        finalScore: c.finalScore || c.likes * 0.5 + c.comments * 0.3,
      }));
    }
  }
}

/**
 * WeightedScorer — computes the final score from multi-action probabilities.
 *
 * Final Score = Σ(weight_i × P(action_i))
 *
 * This mirrors x-algorithm's weighted scorer. The weights can be tuned
 * independently of the prediction model, allowing rapid experimentation.
 */
export class WeightedScorer implements Scorer<FeedQuery, FeedCandidate> {
  name = 'WeightedScorer';
  private weights: Record<EngagementAction, number>;

  constructor(weights?: Partial<Record<EngagementAction, number>>) {
    this.weights = { ...DEFAULT_ACTION_WEIGHTS, ...weights };
  }

  enable(): boolean {
    return true;
  }

  async score(_query: FeedQuery, candidates: FeedCandidate[]): Promise<FeedCandidate[]> {
    return candidates.map((c) => {
      if (!c.engagementScores) return c;

      let total = 0;
      for (const [action, weight] of Object.entries(this.weights)) {
        const prob = c.engagementScores[action as EngagementAction] || 0;
        total += weight * prob;
      }

      return { ...c, finalScore: total };
    });
  }
}

/**
 * InNetworkBoostScorer — gives a score boost to in-network content.
 *
 * Mirrors x-algorithm's blending of Thunder (in-network) and Phoenix
 * (out-of-network) candidates. In-network posts get a configurable boost
 * to ensure followed creators appear in the feed.
 */
export class InNetworkBoostScorer implements Scorer<FeedQuery, FeedCandidate> {
  name = 'InNetworkBoostScorer';
  private boostFactor: number;

  constructor(boostFactor = 1.2) {
    this.boostFactor = boostFactor;
  }

  enable(): boolean {
    return true;
  }

  async score(_query: FeedQuery, candidates: FeedCandidate[]): Promise<FeedCandidate[]> {
    return candidates.map((c) => {
      if (c.source === 'in_network' && c.finalScore > 0) {
        return { ...c, finalScore: c.finalScore * this.boostFactor };
      }
      return c;
    });
  }
}

/**
 * FreshnessScorer — applies time decay to prevent stale content.
 * Newer posts get a slight boost in their final score.
 */
export class FreshnessScorer implements Scorer<FeedQuery, FeedCandidate> {
  name = 'FreshnessScorer';
  private halfLifeHours: number;

  constructor(halfLifeHours = 48) {
    this.halfLifeHours = halfLifeHours;
  }

  enable(): boolean {
    return true;
  }

  async score(_query: FeedQuery, candidates: FeedCandidate[]): Promise<FeedCandidate[]> {
    return candidates.map((c) => {
      if (!c.timestamp) return c;

      const ageHours = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60);
      const decay = Math.exp((-0.693 * ageHours) / this.halfLifeHours);
      // Blend: 80% engagement score + 20% freshness
      const adjusted = c.finalScore * 0.8 + c.finalScore * decay * 0.2;

      return { ...c, finalScore: adjusted };
    });
  }
}
