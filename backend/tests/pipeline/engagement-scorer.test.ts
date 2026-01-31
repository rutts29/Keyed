import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    AI_SERVICE_URL: 'http://localhost:8000',
    AI_SERVICE_API_KEY: 'test-key',
  },
}));

import { EngagementScorer } from '../../src/pipeline/scorers.js';
import { createMockQuery, createMockCandidate, createMockEngagementScores } from './types.test.js';

describe('EngagementScorer', () => {
  const scorer = new EngagementScorer();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should have correct name', () => {
    expect(scorer.name).toBe('EngagementScorer');
  });

  it('should always be enabled', () => {
    expect(scorer.enable()).toBe(true);
  });

  it('should return candidates unchanged when all already have engagementScores', async () => {
    const candidates = [
      createMockCandidate({ engagementScores: createMockEngagementScores(), finalScore: 5 }),
      createMockCandidate({ engagementScores: createMockEngagementScores(), finalScore: 3 }),
    ];

    const result = await scorer.score(createMockQuery(), candidates);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].finalScore).toBe(5);
    expect(result[1].finalScore).toBe(3);
  });

  it('should call AI service with correct request body', async () => {
    const candidates = [
      createMockCandidate({
        postId: 'p1',
        creatorWallet: 'c1',
        description: 'A photo',
        autoTags: ['sunset'],
        sceneType: 'outdoor',
        mood: 'peaceful',
        likes: 10,
        comments: 3,
        tipsReceived: 0.5,
        timestamp: new Date().toISOString(),
        source: 'in_network',
        engagementScores: null,
      }),
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ predictions: [] }),
    });

    const query = createMockQuery({
      userWallet: 'wallet1',
      likedPostIds: ['lp1'],
      followingWallets: ['c1'],
    });

    await scorer.score(query, candidates);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/pipeline/score',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Internal-API-Key': 'test-key',
        }),
      }),
    );

    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.user_wallet).toBe('wallet1');
    expect(callBody.liked_post_ids).toEqual(['lp1']);
    expect(callBody.following_wallets).toEqual(['c1']);
    expect(callBody.candidates).toHaveLength(1);
    expect(callBody.candidates[0].post_id).toBe('p1');
    expect(callBody.candidates[0].creator_wallet).toBe('c1');
    expect(callBody.candidates[0].description).toBe('A photo');
    expect(callBody.candidates[0].tags).toEqual(['sunset']);
    expect(callBody.candidates[0].is_following_creator).toBe(true);
    expect(callBody.candidates[0].source).toBe('in_network');
  });

  it('should merge prediction scores back into candidates', async () => {
    const candidates = [
      createMockCandidate({ postId: 'p1', engagementScores: null }),
      createMockCandidate({ postId: 'p2', engagementScores: null }),
    ];

    const mockScores = { like: 0.8, comment: 0.3, share: 0.1, save: 0.2, tip: 0.05, subscribe: 0.02, follow_creator: 0.1, dwell: 0.6, profile_click: 0.15, not_interested: 0.02, mute_creator: 0.01, report: 0.005 };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        predictions: [
          { post_id: 'p1', scores: mockScores, final_score: 7.5 },
          { post_id: 'p2', scores: mockScores, final_score: 4.2 },
        ],
      }),
    });

    const result = await scorer.score(createMockQuery(), candidates);

    expect(result).toHaveLength(2);
    expect(result[0].engagementScores).toEqual(mockScores);
    expect(result[0].finalScore).toBe(7.5);
    expect(result[1].finalScore).toBe(4.2);
  });

  it('should preserve already-scored candidates and not re-score them', async () => {
    const existingScores = createMockEngagementScores({ like: 0.9 });
    const candidates = [
      createMockCandidate({ postId: 'scored', engagementScores: existingScores, finalScore: 8.0 }),
      createMockCandidate({ postId: 'unscored', engagementScores: null }),
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        predictions: [
          { post_id: 'unscored', scores: createMockEngagementScores(), final_score: 3.0 },
        ],
      }),
    });

    const result = await scorer.score(createMockQuery(), candidates);

    expect(result).toHaveLength(2);
    expect(result[0].postId).toBe('scored');
    expect(result[0].finalScore).toBe(8.0);
    expect(result[0].engagementScores).toBe(existingScores);
    expect(result[1].postId).toBe('unscored');
    expect(result[1].finalScore).toBe(3.0);

    // Only unscored candidate should be in the request
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.candidates).toHaveLength(1);
    expect(callBody.candidates[0].post_id).toBe('unscored');
  });

  it('should fall back to heuristic on non-OK response', async () => {
    const candidates = [
      createMockCandidate({ engagementScores: null, likes: 10, comments: 4, finalScore: 0 }),
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await scorer.score(createMockQuery(), candidates);

    expect(result).toHaveLength(1);
    // Fallback: likes * 0.5 + comments * 0.3 = 10 * 0.5 + 4 * 0.3 = 6.2
    expect(result[0].finalScore).toBeCloseTo(6.2, 5);
  });

  it('should fall back to heuristic on network error', async () => {
    const candidates = [
      createMockCandidate({ engagementScores: null, likes: 6, comments: 2, finalScore: 0 }),
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const result = await scorer.score(createMockQuery(), candidates);

    expect(result).toHaveLength(1);
    // Fallback: 6 * 0.5 + 2 * 0.3 = 3.6
    expect(result[0].finalScore).toBeCloseTo(3.6, 5);
  });

  it('should preserve candidate count and order', async () => {
    const candidates = [
      createMockCandidate({ postId: 'a', engagementScores: null }),
      createMockCandidate({ postId: 'b', engagementScores: null }),
      createMockCandidate({ postId: 'c', engagementScores: null }),
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        predictions: [
          { post_id: 'a', scores: createMockEngagementScores(), final_score: 1 },
          { post_id: 'b', scores: createMockEngagementScores(), final_score: 2 },
          { post_id: 'c', scores: createMockEngagementScores(), final_score: 3 },
        ],
      }),
    });

    const result = await scorer.score(createMockQuery(), candidates);

    expect(result).toHaveLength(3);
    expect(result[0].postId).toBe('a');
    expect(result[1].postId).toBe('b');
    expect(result[2].postId).toBe('c');
  });
});
