import { describe, it, expect } from 'vitest';
import {
  DeduplicateFilter,
  AgeFilter,
  SelfPostFilter,
  BlockedAuthorFilter,
  SeenPostsFilter,
  MutedKeywordFilter,
  AuthorDiversityFilter,
} from '../../src/pipeline/filters.js';
import { createMockQuery, createMockCandidate } from './types.test.js';

describe('Pipeline Filters', () => {
  describe('DeduplicateFilter', () => {
    const filter = new DeduplicateFilter();

    it('should have correct name', () => {
      expect(filter.name).toBe('DeduplicateFilter');
    });

    it('should always be enabled', () => {
      expect(filter.enable(createMockQuery())).toBe(true);
    });

    it('should keep unique candidates', async () => {
      const candidates = [
        createMockCandidate({ postId: 'a' }),
        createMockCandidate({ postId: 'b' }),
        createMockCandidate({ postId: 'c' }),
      ];

      const result = await filter.filter(createMockQuery(), candidates);
      expect(result.kept).toHaveLength(3);
      expect(result.removed).toHaveLength(0);
    });

    it('should remove duplicates keeping first occurrence', async () => {
      const candidates = [
        createMockCandidate({ postId: 'a', likes: 100 }),
        createMockCandidate({ postId: 'b' }),
        createMockCandidate({ postId: 'a', likes: 5 }),
        createMockCandidate({ postId: 'c' }),
        createMockCandidate({ postId: 'b' }),
      ];

      const result = await filter.filter(createMockQuery(), candidates);
      expect(result.kept).toHaveLength(3);
      expect(result.removed).toHaveLength(2);
      expect(result.kept[0].likes).toBe(100); // First 'a' kept
    });

    it('should handle empty input', async () => {
      const result = await filter.filter(createMockQuery(), []);
      expect(result.kept).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
    });
  });

  describe('AgeFilter', () => {
    it('should have correct name', () => {
      const filter = new AgeFilter();
      expect(filter.name).toBe('AgeFilter');
    });

    it('should keep posts within age threshold', async () => {
      const filter = new AgeFilter(7); // 7 days
      const candidates = [
        createMockCandidate({ postId: 'new', timestamp: new Date().toISOString() }),
        createMockCandidate({
          postId: 'yesterday',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        }),
      ];

      const result = await filter.filter(createMockQuery(), candidates);
      expect(result.kept).toHaveLength(2);
      expect(result.removed).toHaveLength(0);
    });

    it('should remove posts older than threshold', async () => {
      const filter = new AgeFilter(7);
      const oldTimestamp = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const candidates = [
        createMockCandidate({ postId: 'fresh', timestamp: new Date().toISOString() }),
        createMockCandidate({ postId: 'old', timestamp: oldTimestamp }),
      ];

      const result = await filter.filter(createMockQuery(), candidates);
      expect(result.kept).toHaveLength(1);
      expect(result.kept[0].postId).toBe('fresh');
      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].postId).toBe('old');
    });

    it('should keep posts with no timestamp', async () => {
      const filter = new AgeFilter(7);
      const candidates = [
        createMockCandidate({ postId: 'no_ts', timestamp: '' }),
      ];

      const result = await filter.filter(createMockQuery(), candidates);
      expect(result.kept).toHaveLength(1);
    });

    it('should respect custom max age', async () => {
      const filter = new AgeFilter(1); // 1 day
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const candidates = [
        createMockCandidate({ postId: '2d_old', timestamp: twoDaysAgo }),
      ];

      const result = await filter.filter(createMockQuery(), candidates);
      expect(result.kept).toHaveLength(0);
      expect(result.removed).toHaveLength(1);
    });
  });

  describe('SelfPostFilter', () => {
    const filter = new SelfPostFilter();

    it('should remove user own posts', async () => {
      const query = createMockQuery({ userWallet: 'myWallet' });
      const candidates = [
        createMockCandidate({ postId: 'mine', creatorWallet: 'myWallet' }),
        createMockCandidate({ postId: 'other', creatorWallet: 'otherWallet' }),
      ];

      const result = await filter.filter(query, candidates);
      expect(result.kept).toHaveLength(1);
      expect(result.kept[0].postId).toBe('other');
      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].postId).toBe('mine');
    });

    it('should keep all posts if none from self', async () => {
      const query = createMockQuery({ userWallet: 'myWallet' });
      const candidates = [
        createMockCandidate({ postId: 'a', creatorWallet: 'other1' }),
        createMockCandidate({ postId: 'b', creatorWallet: 'other2' }),
      ];

      const result = await filter.filter(query, candidates);
      expect(result.kept).toHaveLength(2);
      expect(result.removed).toHaveLength(0);
    });
  });

  describe('BlockedAuthorFilter', () => {
    const filter = new BlockedAuthorFilter();

    it('should be disabled when no blocked wallets', () => {
      const query = createMockQuery({ blockedWallets: [] });
      expect(filter.enable(query)).toBe(false);
    });

    it('should be enabled when blocked wallets exist', () => {
      const query = createMockQuery({ blockedWallets: ['badWallet'] });
      expect(filter.enable(query)).toBe(true);
    });

    it('should remove posts from blocked authors', async () => {
      const query = createMockQuery({ blockedWallets: ['blocked1', 'blocked2'] });
      const candidates = [
        createMockCandidate({ postId: 'ok', creatorWallet: 'good' }),
        createMockCandidate({ postId: 'bad1', creatorWallet: 'blocked1' }),
        createMockCandidate({ postId: 'bad2', creatorWallet: 'blocked2' }),
        createMockCandidate({ postId: 'ok2', creatorWallet: 'good2' }),
      ];

      const result = await filter.filter(query, candidates);
      expect(result.kept).toHaveLength(2);
      expect(result.removed).toHaveLength(2);
      expect(result.kept.map((c) => c.postId)).toEqual(['ok', 'ok2']);
    });
  });

  describe('SeenPostsFilter', () => {
    const filter = new SeenPostsFilter();

    it('should be disabled when no seen posts', () => {
      const query = createMockQuery({ seenPostIds: [] });
      expect(filter.enable(query)).toBe(false);
    });

    it('should remove previously seen posts', async () => {
      const query = createMockQuery({ seenPostIds: ['seen1', 'seen2'] });
      const candidates = [
        createMockCandidate({ postId: 'new1' }),
        createMockCandidate({ postId: 'seen1' }),
        createMockCandidate({ postId: 'new2' }),
        createMockCandidate({ postId: 'seen2' }),
      ];

      const result = await filter.filter(query, candidates);
      expect(result.kept).toHaveLength(2);
      expect(result.removed).toHaveLength(2);
      expect(result.kept.map((c) => c.postId)).toEqual(['new1', 'new2']);
    });
  });

  describe('MutedKeywordFilter', () => {
    const filter = new MutedKeywordFilter();

    it('should be disabled when no muted keywords', () => {
      const query = createMockQuery({ mutedKeywords: [] });
      expect(filter.enable(query)).toBe(false);
    });

    it('should remove posts containing muted keywords in caption', async () => {
      const query = createMockQuery({ mutedKeywords: ['spam', 'crypto'] });
      const candidates = [
        createMockCandidate({ postId: 'clean', caption: 'Beautiful sunset' }),
        createMockCandidate({ postId: 'spammy', caption: 'Free SPAM airdrop' }),
        createMockCandidate({ postId: 'crypto_ad', caption: 'Buy this crypto token!' }),
      ];

      const result = await filter.filter(query, candidates);
      expect(result.kept).toHaveLength(1);
      expect(result.kept[0].postId).toBe('clean');
    });

    it('should check tags too', async () => {
      const query = createMockQuery({ mutedKeywords: ['nsfw'] });
      const candidates = [
        createMockCandidate({
          postId: 'tagged',
          caption: 'Art piece',
          autoTags: ['art', 'nsfw', 'digital'],
        }),
        createMockCandidate({
          postId: 'safe',
          caption: 'Landscape',
          autoTags: ['nature'],
        }),
      ];

      const result = await filter.filter(query, candidates);
      expect(result.kept).toHaveLength(1);
      expect(result.kept[0].postId).toBe('safe');
    });

    it('should be case-insensitive', async () => {
      const query = createMockQuery({ mutedKeywords: ['SPAM'] });
      const candidates = [
        createMockCandidate({ postId: 'lower', caption: 'This is spam' }),
        createMockCandidate({ postId: 'upper', caption: 'This is SPAM' }),
        createMockCandidate({ postId: 'clean', caption: 'Normal post' }),
      ];

      const result = await filter.filter(query, candidates);
      expect(result.kept).toHaveLength(1);
      expect(result.kept[0].postId).toBe('clean');
    });

    it('should also check description', async () => {
      const query = createMockQuery({ mutedKeywords: ['gambling'] });
      const candidates = [
        createMockCandidate({
          postId: 'desc_match',
          caption: 'Fun times',
          description: 'A gambling themed digital art piece',
        }),
      ];

      const result = await filter.filter(query, candidates);
      expect(result.kept).toHaveLength(0);
      expect(result.removed).toHaveLength(1);
    });
  });

  describe('AuthorDiversityFilter', () => {
    it('should enforce max posts per creator', async () => {
      const filter = new AuthorDiversityFilter(2);
      const candidates = [
        createMockCandidate({ postId: 'c1_p1', creatorWallet: 'creator1' }),
        createMockCandidate({ postId: 'c1_p2', creatorWallet: 'creator1' }),
        createMockCandidate({ postId: 'c1_p3', creatorWallet: 'creator1' }),
        createMockCandidate({ postId: 'c2_p1', creatorWallet: 'creator2' }),
        createMockCandidate({ postId: 'c2_p2', creatorWallet: 'creator2' }),
      ];

      const result = await filter.filter(createMockQuery(), candidates);
      expect(result.kept).toHaveLength(4);
      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].postId).toBe('c1_p3');
    });

    it('should allow custom max per creator', async () => {
      const filter = new AuthorDiversityFilter(1);
      const candidates = [
        createMockCandidate({ postId: 'c1_p1', creatorWallet: 'creator1' }),
        createMockCandidate({ postId: 'c1_p2', creatorWallet: 'creator1' }),
        createMockCandidate({ postId: 'c2_p1', creatorWallet: 'creator2' }),
      ];

      const result = await filter.filter(createMockQuery(), candidates);
      expect(result.kept).toHaveLength(2);
      expect(result.kept.map((c) => c.postId)).toEqual(['c1_p1', 'c2_p1']);
    });

    it('should pass through when all creators unique', async () => {
      const filter = new AuthorDiversityFilter(2);
      const candidates = [
        createMockCandidate({ postId: 'a', creatorWallet: 'c1' }),
        createMockCandidate({ postId: 'b', creatorWallet: 'c2' }),
        createMockCandidate({ postId: 'c', creatorWallet: 'c3' }),
      ];

      const result = await filter.filter(createMockQuery(), candidates);
      expect(result.kept).toHaveLength(3);
      expect(result.removed).toHaveLength(0);
    });
  });
});
