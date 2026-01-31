import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { cacheService } from '../services/cache.service.js';
import { aiService } from '../services/ai.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { getFollowingWallets, enrichPostsWithLikeStatus } from '../utils/helpers.js';
import { executeForYouPipeline } from '../pipeline/index.js';

export const feedController = {
  /**
   * Personalized "For You" feed using x-algorithm-inspired pipeline.
   *
   * Pipeline stages (mirrors xAI's x-algorithm architecture):
   *   1. Query Hydration: user context (following, likes, seen posts)
   *   2. Candidate Sourcing: InNetwork (Thunder) + OutOfNetwork (Phoenix) + Trending
   *   3. Hydration: enrich OON candidates with full DB records
   *   4. Filtering: dedup, age, self-post, blocked, seen, muted keywords
   *   5. Scoring: multi-action engagement + weighted combination + freshness
   *   6. Selection: top-K by score
   *   7. Post-selection: author diversity (max 2 per creator)
   *   8. Side effects: cache + metrics logging
   *
   * Falls back to chronological following-based feed if pipeline fails.
   *
   * @see https://github.com/xai-org/x-algorithm
   */
  async getPersonalizedFeed(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;

    // Check cache first (only for first page)
    const cached = !cursor ? await cacheService.getFeed(wallet) : null;
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }

    let posts;
    let tasteProfile: string | null = null;
    let pipelineUsed = false;

    // Try the x-algorithm-inspired pipeline first
    try {
      const pipelineResult = await executeForYouPipeline(wallet, limit, cursor);
      const selectedPostIds = pipelineResult.selectedCandidates.map((c) => c.postId);

      if (selectedPostIds.length > 0) {
        // Fetch full post data with creator info
        const { data: pipelinePosts, error } = await supabase
          .from('posts')
          .select('*, users!posts_creator_wallet_fkey(*)')
          .in('id', selectedPostIds);

        if (error) {
          logger.error({ error, wallet }, 'Failed to fetch pipeline posts from Supabase');
        }

        if (!error && pipelinePosts && pipelinePosts.length > 0) {
          // Sort by pipeline ranking order
          const postMap = new Map(pipelinePosts.map((p) => [p.id, p]));
          posts = selectedPostIds
            .filter((id) => postMap.has(id))
            .map((id) => postMap.get(id)!);
          pipelineUsed = true;

          logger.info(
            {
              wallet,
              pipelineMs: pipelineResult.pipelineMetrics.totalMs,
              retrieved: pipelineResult.retrievedCandidates.length,
              filtered: pipelineResult.filteredCandidates.length,
              selected: pipelineResult.selectedCandidates.length,
            },
            'For You pipeline executed',
          );
        }
      }
    } catch (error) {
      logger.error({ error, wallet }, 'Pipeline failed, falling back to legacy feed');
    }

    // Fallback: legacy recommendation or chronological feed
    if (!posts || posts.length === 0) {
      posts = await legacyFeed(wallet, limit, cursor);
    }

    // Enrich with like status
    const likedPosts = await enrichPostsWithLikeStatus(posts, wallet);

    // Get following status
    const followingList = await getFollowingWallets(wallet);
    const followingSet = new Set(followingList);

    const feedItems = likedPosts.map(post => ({
      ...post,
      isFollowing: followingSet.has(post.creator_wallet),
    }));

    const nextCursor = posts.length === limit ? posts[posts.length - 1].timestamp : null;
    const result = {
      posts: feedItems,
      nextCursor,
      tasteProfile,
      pipelineUsed,
    };

    // Cache first page only
    if (!cursor) {
      await cacheService.setFeed(wallet, result);
    }

    res.json({ success: true, data: result });
  },

  /**
   * Explore/trending feed - uses AI if available, falls back to likes-based sorting
   */
  async getExploreFeed(req: AuthenticatedRequest, res: Response) {
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;

    let query = supabase
      .from('posts')
      .select('*, users!posts_creator_wallet_fkey(*)')
      .order('likes', { ascending: false })
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('timestamp', cursor);
    }

    const { data: posts, error } = await query;

    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch explore feed');
    }

    let feedItems = posts;
    if (req.wallet) {
      feedItems = await enrichPostsWithLikeStatus(posts, req.wallet);
    }

    const nextCursor = posts.length === limit ? posts[posts.length - 1].timestamp : null;

    res.json({
      success: true,
      data: { posts: feedItems, nextCursor },
    });
  },

  /**
   * Following feed - chronological posts from followed users
   */
  async getFollowingFeed(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;

    const following = await getFollowingWallets(wallet);

    if (following.length === 0) {
      res.json({
        success: true,
        data: { posts: [], nextCursor: null },
      });
      return;
    }

    let query = supabase
      .from('posts')
      .select('*, users!posts_creator_wallet_fkey(*)')
      .in('creator_wallet', following)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('timestamp', cursor);
    }

    const { data: posts, error } = await query;

    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch following feed');
    }

    const likedPosts = await enrichPostsWithLikeStatus(posts, wallet);

    const feedItems = likedPosts.map(post => ({
      ...post,
      isFollowing: true,
    }));

    const nextCursor = posts.length === limit ? posts[posts.length - 1].timestamp : null;

    res.json({
      success: true,
      data: { posts: feedItems, nextCursor },
    });
  },

  /**
   * Trending posts from the last 24 hours
   * Cached for 1 minute to reduce database load
   */
  async getTrending(req: AuthenticatedRequest, res: Response) {
    const limit = parseInt(req.query.limit as string) || 20;

    // Try cache first for unauthenticated requests (no user-specific like status)
    if (!req.wallet) {
      const cached = await cacheService.getTrending();
      if (cached) {
        res.json({ success: true, data: { posts: cached } });
        return;
      }
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*, users!posts_creator_wallet_fkey(*)')
      .gte('timestamp', oneDayAgo)
      .order('likes', { ascending: false })
      .limit(limit);

    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch trending');
    }

    // Cache base results for unauthenticated users
    if (!req.wallet) {
      await cacheService.setTrending(posts);
      res.json({ success: true, data: { posts } });
      return;
    }

    // Add like status for authenticated users
    const feedItems = await enrichPostsWithLikeStatus(posts, req.wallet);

    res.json({
      success: true,
      data: { posts: feedItems },
    });
  },

  /**
   * Trending topics/hashtags from auto_tags in the last 24-48 hours
   * Cached for 1 minute to reduce database load
   */
  async getTrendingTopics(req: AuthenticatedRequest, res: Response) {
    // Try cache first
    const cached = await cacheService.getTrendingTopics();
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }

    // Query posts from the last 48 hours to get a good sample
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Use raw SQL via RPC to unnest and aggregate auto_tags
    const { data, error } = await supabase.rpc('get_trending_topics', {
      since_timestamp: twoDaysAgo,
      topic_limit: 10,
    });

    if (error) {
      // Fallback: If RPC doesn't exist, query posts and aggregate in JS
      logger.warn({ error }, 'RPC get_trending_topics failed, falling back to JS aggregation');

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('auto_tags')
        .gte('timestamp', twoDaysAgo)
        .not('auto_tags', 'is', null);

      if (postsError) {
        throw new AppError(500, 'DB_ERROR', 'Failed to fetch trending topics');
      }

      // Aggregate tags in JavaScript
      const tagCounts = new Map<string, number>();
      for (const post of posts || []) {
        if (post.auto_tags && Array.isArray(post.auto_tags)) {
          for (const tag of post.auto_tags) {
            const normalizedTag = tag.toLowerCase().trim();
            if (normalizedTag) {
              tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
            }
          }
        }
      }

      // Sort by count and take top 10
      const sortedTopics = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, postCount]) => ({
          name,
          postCount,
          trend: 'stable' as const,
        }));

      const result = { topics: sortedTopics };
      await cacheService.setTrendingTopics(result);

      res.json({ success: true, data: result });
      return;
    }

    // Format RPC results
    const topics = (data || []).map((row: { tag: string; post_count: number }) => ({
      name: row.tag,
      postCount: row.post_count,
      trend: 'stable' as const,
    }));

    const result = { topics };
    await cacheService.setTrendingTopics(result);

    res.json({ success: true, data: result });
  },
};

/**
 * Legacy feed fallback — used when the pipeline is unavailable.
 * Tries AI recommendations, then falls back to chronological following feed.
 */
async function legacyFeed(wallet: string, limit: number, cursor?: string): Promise<any[]> {
  const { data: userLikes, error: likesError } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_wallet', wallet)
    .order('timestamp', { ascending: false })
    .limit(50);

  if (likesError) {
    logger.error({ error: likesError, wallet }, 'Legacy feed: failed to fetch likes');
  }

  const likedPostIds = userLikes?.map(l => l.post_id) || [];

  const { data: interactions, error: interactionsError } = await supabase
    .from('interactions')
    .select('post_id')
    .eq('user_wallet', wallet)
    .eq('interaction_type', 'view')
    .order('timestamp', { ascending: false })
    .limit(100);

  if (interactionsError) {
    logger.error({ error: interactionsError, wallet }, 'Legacy feed: failed to fetch interactions');
  }

  const seenPostIds = interactions?.map(i => i.post_id) || [];

  let recommendedPostIds: string[] = [];

  try {
    const recommendations = await aiService.getRecommendations(
      wallet, likedPostIds, limit * 2, seenPostIds
    );
    recommendedPostIds = recommendations.recommendations.map(r => r.postId);
  } catch (error) {
    logger.warn({ error, wallet }, 'Legacy AI recommendations failed');
  }

  if (recommendedPostIds.length >= limit) {
    const { data: aiPosts, error } = await supabase
      .from('posts')
      .select('*, users!posts_creator_wallet_fkey(*)')
      .in('id', recommendedPostIds)
      .limit(limit);

    if (!error && aiPosts) {
      const postMap = new Map(aiPosts.map(p => [p.id, p]));
      return recommendedPostIds
        .filter(id => postMap.has(id))
        .map(id => postMap.get(id)!)
        .slice(0, limit);
    }
  }

  // Final fallback: chronological following feed
  const following = await getFollowingWallets(wallet);
  const feedWallets = [...following, wallet];

  let query = supabase
    .from('posts')
    .select('*, users!posts_creator_wallet_fkey(*)')
    .in('creator_wallet', feedWallets)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('timestamp', cursor);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch feed');
  }

  return data || [];
}
