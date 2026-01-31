import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WeightedScorer,
  InNetworkBoostScorer,
  FreshnessScorer,
} from '../../src/pipeline/scorers.js';
import { DEFAULT_ACTION_WEIGHTS } from '../../src/pipeline/types.js';
import {
  createMockQuery,
  createMockCandidate,
  createMockEngagementScores,
} from './types.test.js';

// Note: EngagementScorer requires fetch (AI service call), tested separately in integration tests

describe('WeightedScorer', () => {
  it('should have correct name', () => {
    const scorer = new WeightedScorer();
    expect(scorer.name).toBe('WeightedScorer');
  });

  it('should always be enabled', () => {
    const scorer = new WeightedScorer();
    expect(scorer.enable()).toBe(true);
  });

  it('should compute weighted score from engagement scores', async () => {
    const scorer = new WeightedScorer();
    const scores = createMockEngagementScores({
      like: 0.7,
      comment: 0.3,
      share: 0.15,
      save: 0.25,
      tip: 0.05,
      subscribe: 0.02,
      follow_creator: 0.1,
      dwell: 0.6,
      profile_click: 0.2,
      not_interested: 0.05,
      mute_creator: 0.01,
      report: 0.005,
    });

    const candidates = [
      createMockCandidate({ engagementScores: scores }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);

    // Manually compute expected score
    let expected = 0;
    for (const [action, weight] of Object.entries(DEFAULT_ACTION_WEIGHTS)) {
      expected += weight * scores[action as keyof typeof scores];
    }

    expect(result[0].finalScore).toBeCloseTo(expected, 5);
    expect(result[0].finalScore).toBeGreaterThan(0); // Positive actions should dominate
  });

  it('should skip candidates without engagement scores', async () => {
    const scorer = new WeightedScorer();
    const candidates = [
      createMockCandidate({ engagementScores: null, finalScore: 5 }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    expect(result[0].finalScore).toBe(5); // Unchanged
  });

  it('should accept custom weights', async () => {
    const scorer = new WeightedScorer({ like: 10.0, comment: 0.0 });
    const scores = createMockEngagementScores({ like: 0.5, comment: 0.9 });
    const candidates = [
      createMockCandidate({ engagementScores: scores }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    // Like weight is 10.0 instead of 1.0, comment is 0 instead of 1.5
    // So the like contribution dominates
    expect(result[0].finalScore).toBeGreaterThan(0);
  });

  it('should preserve candidate count and order', async () => {
    const scorer = new WeightedScorer();
    const candidates = [
      createMockCandidate({ postId: 'a', engagementScores: createMockEngagementScores() }),
      createMockCandidate({ postId: 'b', engagementScores: createMockEngagementScores() }),
      createMockCandidate({ postId: 'c', engagementScores: createMockEngagementScores() }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    expect(result).toHaveLength(3);
    expect(result[0].postId).toBe('a');
    expect(result[1].postId).toBe('b');
    expect(result[2].postId).toBe('c');
  });

  it('should produce negative scores when hostile actions dominate', async () => {
    const scorer = new WeightedScorer();
    const scores = createMockEngagementScores({
      like: 0.01,
      comment: 0.01,
      share: 0.0,
      save: 0.0,
      tip: 0.0,
      subscribe: 0.0,
      follow_creator: 0.0,
      dwell: 0.01,
      profile_click: 0.0,
      not_interested: 0.9,
      mute_creator: 0.8,
      report: 0.7,
    });
    const candidates = [createMockCandidate({ engagementScores: scores })];
    const result = await scorer.score(createMockQuery(), candidates);
    expect(result[0].finalScore).toBeLessThan(0);
  });
});

describe('InNetworkBoostScorer', () => {
  it('should have correct name', () => {
    const scorer = new InNetworkBoostScorer();
    expect(scorer.name).toBe('InNetworkBoostScorer');
  });

  it('should boost in-network candidates by boost factor', async () => {
    const scorer = new InNetworkBoostScorer(1.5);
    const candidates = [
      createMockCandidate({ postId: 'in', source: 'in_network', finalScore: 10 }),
      createMockCandidate({ postId: 'out', source: 'out_of_network', finalScore: 10 }),
      createMockCandidate({ postId: 'trend', source: 'trending', finalScore: 10 }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    expect(result[0].finalScore).toBe(15); // 10 * 1.5
    expect(result[1].finalScore).toBe(10); // Unchanged
    expect(result[2].finalScore).toBe(10); // Unchanged
  });

  it('should use default boost factor of 1.2', async () => {
    const scorer = new InNetworkBoostScorer();
    const candidates = [
      createMockCandidate({ source: 'in_network', finalScore: 100 }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    expect(result[0].finalScore).toBeCloseTo(120, 1);
  });

  it('should handle zero scores', async () => {
    const scorer = new InNetworkBoostScorer(1.5);
    const candidates = [
      createMockCandidate({ source: 'in_network', finalScore: 0 }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    expect(result[0].finalScore).toBe(0);
  });

  it('should not boost negative scores', async () => {
    const scorer = new InNetworkBoostScorer(1.5);
    const candidates = [
      createMockCandidate({ source: 'in_network', finalScore: -5 }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    expect(result[0].finalScore).toBe(-5); // Negative scores are not boosted
  });
});

describe('FreshnessScorer', () => {
  it('should have correct name', () => {
    const scorer = new FreshnessScorer();
    expect(scorer.name).toBe('FreshnessScorer');
  });

  it('should give higher scores to newer posts', async () => {
    const scorer = new FreshnessScorer(48);
    const now = new Date().toISOString();
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const candidates = [
      createMockCandidate({ postId: 'new', timestamp: now, finalScore: 10 }),
      createMockCandidate({ postId: 'old', timestamp: threeDaysAgo, finalScore: 10 }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    expect(result[0].finalScore).toBeGreaterThan(result[1].finalScore);
  });

  it('should not change score for candidates without timestamp', async () => {
    const scorer = new FreshnessScorer(48);
    const candidates = [
      createMockCandidate({ postId: 'no_ts', timestamp: '', finalScore: 10 }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    expect(result[0].finalScore).toBe(10);
  });

  it('should apply 80/20 blend of engagement vs freshness', async () => {
    const scorer = new FreshnessScorer(48);
    const now = new Date().toISOString();
    const candidates = [
      createMockCandidate({ timestamp: now, finalScore: 10 }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);
    // Brand new post: decay ≈ 1.0, so adjusted = 10 * 0.8 + 10 * 1.0 * 0.2 = 10.0
    expect(result[0].finalScore).toBeCloseTo(10, 0);
  });

  it('should respect custom half-life', async () => {
    const shortHalfLife = new FreshnessScorer(6); // 6 hours
    const longHalfLife = new FreshnessScorer(168); // 1 week
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const candidate = createMockCandidate({ timestamp: twelveHoursAgo, finalScore: 10 });

    const shortResult = await shortHalfLife.score(createMockQuery(), [{ ...candidate }]);
    const longResult = await longHalfLife.score(createMockQuery(), [{ ...candidate }]);

    // Short half-life decays faster → lower score for same age
    expect(shortResult[0].finalScore).toBeLessThan(longResult[0].finalScore);
  });
});
