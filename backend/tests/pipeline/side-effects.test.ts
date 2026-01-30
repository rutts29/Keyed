import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/cache.service.js', () => ({
  cacheService: {
    setFeed: vi.fn().mockResolvedValue(undefined),
  },
}));

import { CacheFeedSideEffect, MetricsLogSideEffect } from '../../src/pipeline/side-effects.js';
import { cacheService } from '../../src/services/cache.service.js';
import { createMockQuery, createMockCandidate } from './types.test.js';

describe('CacheFeedSideEffect', () => {
  const sideEffect = new CacheFeedSideEffect();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(sideEffect.name).toBe('CacheFeedSideEffect');
  });

  it('should be enabled for first page (no cursor)', () => {
    const query = createMockQuery({ cursor: undefined });
    expect(sideEffect.enable(query)).toBe(true);
  });

  it('should be disabled for subsequent pages (with cursor)', () => {
    const query = createMockQuery({ cursor: '2026-01-29T00:00:00Z' });
    expect(sideEffect.enable(query)).toBe(false);
  });

  it('should call cacheService.setFeed with transformed data', async () => {
    const query = createMockQuery({ userWallet: 'wallet1' });
    const candidates = [
      createMockCandidate({ postId: 'p1', creatorWallet: 'c1', finalScore: 10 }),
      createMockCandidate({ postId: 'p2', creatorWallet: 'c2', finalScore: 5 }),
    ];

    await sideEffect.run(query, candidates);

    expect(cacheService.setFeed).toHaveBeenCalledWith(
      'wallet1',
      expect.objectContaining({
        posts: expect.arrayContaining([
          expect.objectContaining({ id: 'p1', creator_wallet: 'c1' }),
          expect.objectContaining({ id: 'p2', creator_wallet: 'c2' }),
        ]),
        nextCursor: expect.any(String),
      }),
    );
  });

  it('should not throw on cache error', async () => {
    (cacheService.setFeed as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Redis down'),
    );

    const query = createMockQuery();
    await expect(
      sideEffect.run(query, [createMockCandidate()]),
    ).resolves.not.toThrow();
  });
});

describe('MetricsLogSideEffect', () => {
  const sideEffect = new MetricsLogSideEffect();

  it('should have correct name', () => {
    expect(sideEffect.name).toBe('MetricsLogSideEffect');
  });

  it('should always be enabled', () => {
    expect(sideEffect.enable(createMockQuery())).toBe(true);
  });

  it('should execute without errors', async () => {
    const candidates = [
      createMockCandidate({ source: 'in_network', finalScore: 10 }),
      createMockCandidate({ source: 'out_of_network', finalScore: 20 }),
      createMockCandidate({ source: 'in_network', finalScore: 15 }),
    ];

    await expect(
      sideEffect.run(createMockQuery(), candidates),
    ).resolves.not.toThrow();
  });

  it('should handle empty candidates', async () => {
    await expect(
      sideEffect.run(createMockQuery(), []),
    ).resolves.not.toThrow();
  });
});
