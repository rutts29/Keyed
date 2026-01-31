import { describe, it, expect } from 'vitest';
import {
  PipelineStage,
  ENGAGEMENT_ACTIONS,
  DEFAULT_ACTION_WEIGHTS,
} from '../../src/pipeline/types.js';
import type {
  FeedQuery,
  FeedCandidate,
  EngagementScores,
  FilterResult,
} from '../../src/pipeline/types.js';

describe('Pipeline Types', () => {
  describe('PipelineStage enum', () => {
    it('should define all pipeline stages', () => {
      expect(PipelineStage.QueryHydrator).toBe('QueryHydrator');
      expect(PipelineStage.Source).toBe('Source');
      expect(PipelineStage.Hydrator).toBe('Hydrator');
      expect(PipelineStage.Filter).toBe('Filter');
      expect(PipelineStage.Scorer).toBe('Scorer');
      expect(PipelineStage.Selector).toBe('Selector');
      expect(PipelineStage.PostSelectionFilter).toBe('PostSelectionFilter');
      expect(PipelineStage.SideEffect).toBe('SideEffect');
    });

    it('should have 8 pipeline stages', () => {
      expect(Object.keys(PipelineStage)).toHaveLength(8);
    });
  });

  describe('ENGAGEMENT_ACTIONS', () => {
    it('should contain all 12 engagement actions', () => {
      expect(ENGAGEMENT_ACTIONS).toHaveLength(12);
    });

    it('should include all positive actions', () => {
      expect(ENGAGEMENT_ACTIONS).toContain('like');
      expect(ENGAGEMENT_ACTIONS).toContain('comment');
      expect(ENGAGEMENT_ACTIONS).toContain('share');
      expect(ENGAGEMENT_ACTIONS).toContain('save');
      expect(ENGAGEMENT_ACTIONS).toContain('tip');
      expect(ENGAGEMENT_ACTIONS).toContain('subscribe');
      expect(ENGAGEMENT_ACTIONS).toContain('follow_creator');
      expect(ENGAGEMENT_ACTIONS).toContain('dwell');
      expect(ENGAGEMENT_ACTIONS).toContain('profile_click');
    });

    it('should include all negative actions', () => {
      expect(ENGAGEMENT_ACTIONS).toContain('not_interested');
      expect(ENGAGEMENT_ACTIONS).toContain('mute_creator');
      expect(ENGAGEMENT_ACTIONS).toContain('report');
    });
  });

  describe('DEFAULT_ACTION_WEIGHTS', () => {
    it('should have weights for all engagement actions', () => {
      for (const action of ENGAGEMENT_ACTIONS) {
        expect(DEFAULT_ACTION_WEIGHTS[action]).toBeDefined();
        expect(typeof DEFAULT_ACTION_WEIGHTS[action]).toBe('number');
      }
    });

    it('should have positive weights for desirable actions', () => {
      expect(DEFAULT_ACTION_WEIGHTS.like).toBeGreaterThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.comment).toBeGreaterThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.share).toBeGreaterThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.save).toBeGreaterThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.tip).toBeGreaterThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.subscribe).toBeGreaterThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.follow_creator).toBeGreaterThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.dwell).toBeGreaterThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.profile_click).toBeGreaterThan(0);
    });

    it('should have negative weights for hostile actions', () => {
      expect(DEFAULT_ACTION_WEIGHTS.not_interested).toBeLessThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.mute_creator).toBeLessThan(0);
      expect(DEFAULT_ACTION_WEIGHTS.report).toBeLessThan(0);
    });

    it('should weight tip higher than like (monetization > passive engagement)', () => {
      expect(DEFAULT_ACTION_WEIGHTS.tip).toBeGreaterThan(DEFAULT_ACTION_WEIGHTS.like);
    });

    it('should weight report most negatively', () => {
      expect(DEFAULT_ACTION_WEIGHTS.report).toBeLessThan(DEFAULT_ACTION_WEIGHTS.mute_creator);
      expect(DEFAULT_ACTION_WEIGHTS.report).toBeLessThan(DEFAULT_ACTION_WEIGHTS.not_interested);
    });
  });
});

// --- Test helpers for use in other test files ---

export function createMockQuery(overrides: Partial<FeedQuery> = {}): FeedQuery {
  return {
    requestId: 'test_req_123',
    userWallet: 'testWallet123',
    limit: 20,
    followingWallets: ['creator1', 'creator2'],
    likedPostIds: ['post1', 'post2', 'post3'],
    seenPostIds: ['post4'],
    blockedWallets: [],
    mutedKeywords: [],
    tasteProfile: null,
    tasteEmbedding: null,
    ...overrides,
  };
}

export function createMockCandidate(overrides: Partial<FeedCandidate> = {}): FeedCandidate {
  return {
    postId: `post_${Math.random().toString(36).slice(2, 8)}`,
    creatorWallet: 'creator1',
    timestamp: new Date().toISOString(),
    contentUri: 'ipfs://Qm123',
    caption: 'Test caption',
    likes: 10,
    comments: 2,
    tipsReceived: 0.5,
    description: 'A test post description',
    autoTags: ['test', 'mock'],
    sceneType: 'indoor',
    mood: 'neutral',
    source: 'in_network',
    engagementScores: null,
    finalScore: 0,
    isTokenGated: false,
    requiredToken: null,
    ...overrides,
  };
}

export function createMockEngagementScores(overrides: Partial<EngagementScores> = {}): EngagementScores {
  return {
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
    ...overrides,
  };
}
