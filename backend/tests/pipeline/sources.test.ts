import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before imports
vi.mock('../../src/config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    AI_SERVICE_URL: 'http://localhost:8000',
    AI_SERVICE_API_KEY: 'test-key',
  },
}));

import { InNetworkSource, OutOfNetworkSource, TrendingSource } from '../../src/pipeline/sources.js';
import { supabase } from '../../src/config/supabase.js';
import { createMockQuery } from './types.test.js';

function mockSupabaseChain(data: any[] | null = [], error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
  };
  // Terminal calls resolve with data
  chain.limit.mockResolvedValue({ data, error });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe('InNetworkSource', () => {
  const source = new InNetworkSource();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(source.name).toBe('InNetworkSource');
  });

  it('should be disabled when user follows nobody', () => {
    const query = createMockQuery({ followingWallets: [] });
    expect(source.enable(query)).toBe(false);
  });

  it('should be enabled when user has following', () => {
    const query = createMockQuery({ followingWallets: ['creator1'] });
    expect(source.enable(query)).toBe(true);
  });

  it('should fetch posts from followed users', async () => {
    const mockPosts = [
      { id: 'p1', creator_wallet: 'creator1', timestamp: '2026-01-29T00:00:00Z', content_uri: 'ipfs://1', likes: 5, comments: 1 },
      { id: 'p2', creator_wallet: 'creator2', timestamp: '2026-01-28T00:00:00Z', content_uri: 'ipfs://2', likes: 3, comments: 0 },
    ];
    mockSupabaseChain(mockPosts);

    const query = createMockQuery({ followingWallets: ['creator1', 'creator2'] });
    const candidates = await source.getCandidates(query);

    expect(candidates).toHaveLength(2);
    expect(candidates[0].postId).toBe('p1');
    expect(candidates[0].source).toBe('in_network');
    expect(candidates[1].postId).toBe('p2');
  });

  it('should return empty array on DB error', async () => {
    mockSupabaseChain(null, new Error('DB error'));

    const query = createMockQuery({ followingWallets: ['creator1'] });
    const candidates = await source.getCandidates(query);
    expect(candidates).toHaveLength(0);
  });

  it('should map row fields to FeedCandidate correctly', async () => {
    const mockPosts = [
      {
        id: 'p1',
        creator_wallet: 'c1',
        timestamp: '2026-01-29T00:00:00Z',
        content_uri: 'ipfs://Qm1',
        caption: 'Hello world',
        likes: 10,
        comments: 3,
        tips_received: 0.5,
        llm_description: 'A beautiful photo',
        auto_tags: ['sunset', 'nature'],
        scene_type: 'outdoor',
        mood: 'peaceful',
        is_token_gated: false,
        required_token: null,
      },
    ];
    mockSupabaseChain(mockPosts);

    const candidates = await source.getCandidates(createMockQuery());
    const c = candidates[0];

    expect(c.postId).toBe('p1');
    expect(c.creatorWallet).toBe('c1');
    expect(c.contentUri).toBe('ipfs://Qm1');
    expect(c.caption).toBe('Hello world');
    expect(c.likes).toBe(10);
    expect(c.comments).toBe(3);
    expect(c.tipsReceived).toBe(0.5);
    expect(c.description).toBe('A beautiful photo');
    expect(c.autoTags).toEqual(['sunset', 'nature']);
    expect(c.sceneType).toBe('outdoor');
    expect(c.mood).toBe('peaceful');
    expect(c.source).toBe('in_network');
    expect(c.engagementScores).toBeNull();
    expect(c.finalScore).toBe(0);
    expect(c.isTokenGated).toBe(false);
  });
});

describe('OutOfNetworkSource', () => {
  const source = new OutOfNetworkSource();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should have correct name', () => {
    expect(source.name).toBe('OutOfNetworkSource');
  });

  it('should always be enabled', () => {
    expect(source.enable(createMockQuery())).toBe(true);
  });

  it('should fetch candidates from AI pipeline/retrieve endpoint', async () => {
    const mockResponse = {
      candidates: [
        { post_id: 'oon1', creator_wallet: 'c1', description: 'Test', tags: ['art'], final_score: 0.8 },
        { post_id: 'oon2', creator_wallet: 'c2', description: 'Test2', tags: [], final_score: 0.6 },
      ],
      taste_profile: 'User likes art',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const query = createMockQuery();
    const candidates = await source.getCandidates(query);

    expect(candidates).toHaveLength(2);
    expect(candidates[0].postId).toBe('oon1');
    expect(candidates[0].source).toBe('out_of_network');
    expect(candidates[0].finalScore).toBe(0.8);
    expect(candidates[0].description).toBe('Test');
  });

  it('should return empty array on network error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const candidates = await source.getCandidates(createMockQuery());
    expect(candidates).toHaveLength(0);
  });

  it('should return empty array on non-OK response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const candidates = await source.getCandidates(createMockQuery());
    expect(candidates).toHaveLength(0);
  });

  it('should send correct request body', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    });

    const query = createMockQuery({
      userWallet: 'wallet1',
      likedPostIds: ['p1', 'p2'],
      followingWallets: ['f1'],
      seenPostIds: ['s1'],
      limit: 10,
    });

    await source.getCandidates(query);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/pipeline/retrieve',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"user_wallet":"wallet1"'),
      }),
    );
  });
});

describe('TrendingSource', () => {
  const source = new TrendingSource();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(source.name).toBe('TrendingSource');
  });

  it('should be enabled for cold-start users (few likes)', () => {
    const query = createMockQuery({ likedPostIds: [] });
    expect(source.enable(query)).toBe(true);
  });

  it('should be enabled when user has fewer than 5 likes', () => {
    const query = createMockQuery({ likedPostIds: ['p1', 'p2', 'p3', 'p4'] });
    expect(source.enable(query)).toBe(true);
  });

  it('should be disabled for active users (5+ likes)', () => {
    const query = createMockQuery({ likedPostIds: ['p1', 'p2', 'p3', 'p4', 'p5'] });
    expect(source.enable(query)).toBe(false);
  });

  it('should fetch trending posts sorted by likes', async () => {
    const mockPosts = [
      { id: 't1', creator_wallet: 'c1', timestamp: '2026-01-30T00:00:00Z', content_uri: 'ipfs://1', likes: 100 },
      { id: 't2', creator_wallet: 'c2', timestamp: '2026-01-30T00:00:00Z', content_uri: 'ipfs://2', likes: 50 },
    ];
    mockSupabaseChain(mockPosts);

    const candidates = await source.getCandidates(createMockQuery());
    expect(candidates).toHaveLength(2);
    expect(candidates[0].source).toBe('trending');
  });

  it('should return empty array on DB error', async () => {
    mockSupabaseChain(null, new Error('DB error'));

    const candidates = await source.getCandidates(createMockQuery());
    expect(candidates).toHaveLength(0);
  });
});
