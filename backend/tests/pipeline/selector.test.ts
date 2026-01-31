import { describe, it, expect } from 'vitest';
import { ScoreSelector } from '../../src/pipeline/selector.js';
import { createMockQuery, createMockCandidate } from './types.test.js';

describe('ScoreSelector', () => {
  it('should have correct name', () => {
    const selector = new ScoreSelector();
    expect(selector.name).toBe('ScoreSelector');
  });

  it('should always be enabled', () => {
    const selector = new ScoreSelector();
    expect(selector.enable()).toBe(true);
  });

  it('should sort candidates by finalScore descending', () => {
    const selector = new ScoreSelector();
    const candidates = [
      createMockCandidate({ postId: 'low', finalScore: 1 }),
      createMockCandidate({ postId: 'high', finalScore: 100 }),
      createMockCandidate({ postId: 'mid', finalScore: 50 }),
    ];

    const result = selector.select(createMockQuery(), candidates);
    expect(result[0].postId).toBe('high');
    expect(result[1].postId).toBe('mid');
    expect(result[2].postId).toBe('low');
  });

  it('should truncate to query limit', () => {
    const selector = new ScoreSelector();
    const query = createMockQuery({ limit: 2 });
    const candidates = [
      createMockCandidate({ postId: 'a', finalScore: 10 }),
      createMockCandidate({ postId: 'b', finalScore: 20 }),
      createMockCandidate({ postId: 'c', finalScore: 30 }),
      createMockCandidate({ postId: 'd', finalScore: 5 }),
    ];

    const result = selector.select(query, candidates);
    expect(result).toHaveLength(2);
    expect(result[0].postId).toBe('c');
    expect(result[1].postId).toBe('b');
  });

  it('should use custom size when provided', () => {
    const selector = new ScoreSelector(3);
    const query = createMockQuery({ limit: 10 }); // Query says 10 but selector says 3
    const candidates = Array.from({ length: 5 }, (_, i) =>
      createMockCandidate({ postId: `p${i}`, finalScore: i * 10 }),
    );

    const result = selector.select(query, candidates);
    expect(result).toHaveLength(3);
  });

  it('should handle empty candidates', () => {
    const selector = new ScoreSelector();
    const result = selector.select(createMockQuery(), []);
    expect(result).toHaveLength(0);
  });

  it('should handle candidates with equal scores', () => {
    const selector = new ScoreSelector();
    const candidates = [
      createMockCandidate({ postId: 'a', finalScore: 10 }),
      createMockCandidate({ postId: 'b', finalScore: 10 }),
      createMockCandidate({ postId: 'c', finalScore: 10 }),
    ];

    const result = selector.select(createMockQuery(), candidates);
    expect(result).toHaveLength(3);
    // All have same score — order is stable (original order preserved by sort)
  });

  it('should handle negative scores correctly', () => {
    const selector = new ScoreSelector();
    const candidates = [
      createMockCandidate({ postId: 'neg', finalScore: -5 }),
      createMockCandidate({ postId: 'pos', finalScore: 10 }),
      createMockCandidate({ postId: 'zero', finalScore: 0 }),
    ];

    const result = selector.select(createMockQuery(), candidates);
    expect(result[0].postId).toBe('pos');
    expect(result[1].postId).toBe('zero');
    expect(result[2].postId).toBe('neg');
  });

  it('should not modify original array', () => {
    const selector = new ScoreSelector();
    const candidates = [
      createMockCandidate({ postId: 'b', finalScore: 1 }),
      createMockCandidate({ postId: 'a', finalScore: 2 }),
    ];

    selector.select(createMockQuery(), candidates);
    expect(candidates[0].postId).toBe('b'); // Original unchanged
  });
});
