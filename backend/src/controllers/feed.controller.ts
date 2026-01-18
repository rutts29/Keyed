import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { cacheService } from '../services/cache.service.js';
import { aiService } from '../services/ai.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const feedController = {
  /**
   * Personalized feed using AI recommendations
   * Falls back to following-based feed if AI service unavailable
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
    
    // Get user's liked posts for AI recommendations
    const { data: likedPosts } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_wallet', wallet)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    const likedPostIds = likedPosts?.map(l => l.post_id) || [];
    
    // Get already seen posts to exclude
    const { data: interactions } = await supabase
      .from('interactions')
      .select('post_id')
      .eq('user_wallet', wallet)
      .eq('interaction_type', 'view')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    const seenPostIds = interactions?.map(i => i.post_id) || [];
    
    // Try AI recommendations first
    let recommendedPostIds: string[] = [];
    let tasteProfile: string | null = null;
    
    try {
      const recommendations = await aiService.getRecommendations(
        wallet,
        likedPostIds,
        limit * 2, // Request more to account for filtering
        seenPostIds
      );
      
      recommendedPostIds = recommendations.recommendations.map(r => r.postId);
      tasteProfile = recommendations.tasteProfile;
      
      logger.debug({ wallet, recommendationCount: recommendedPostIds.length }, 'Got AI recommendations');
    } catch (error) {
      logger.warn({ error, wallet }, 'AI recommendations failed, falling back to following-based feed');
    }
    
    let posts;
    
    if (recommendedPostIds.length >= limit) {
      // Use AI recommendations
      const { data: aiPosts, error } = await supabase
        .from('posts')
        .select('*, users!posts_creator_wallet_fkey(*)')
        .in('id', recommendedPostIds)
        .limit(limit);
      
      if (error) {
        throw new AppError(500, 'DB_ERROR', 'Failed to fetch recommended posts');
      }
      
      // Sort by recommendation order
      const postMap = new Map(aiPosts.map(p => [p.id, p]));
      posts = recommendedPostIds
        .filter(id => postMap.has(id))
        .map(id => postMap.get(id)!)
        .slice(0, limit);
    } else {
      // Fallback: Get posts from following + own posts
      let following = await cacheService.getFollowing(wallet);
      if (!following) {
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_wallet')
          .eq('follower_wallet', wallet);
        following = followsData?.map(f => f.following_wallet) || [];
        await cacheService.setFollowing(wallet, following);
      }
      
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
      
      posts = data;
    }
    
    // Get user's likes for these posts
    const postIds = posts.map(p => p.id);
    const { data: likes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_wallet', wallet)
      .in('post_id', postIds);
    
    const likedSet = new Set(likes?.map(l => l.post_id) || []);
    
    // Get following status
    let following = await cacheService.getFollowing(wallet);
    if (!following) {
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_wallet')
        .eq('follower_wallet', wallet);
      following = followsData?.map(f => f.following_wallet) || [];
    }
    const followingSet = new Set(following);
    
    const feedItems = posts.map(post => ({
      ...post,
      isLiked: likedSet.has(post.id),
      isFollowing: followingSet.has(post.creator_wallet),
    }));
    
    const nextCursor = posts.length === limit ? posts[posts.length - 1].timestamp : null;
    const result = { 
      posts: feedItems, 
      nextCursor,
      tasteProfile, // Include taste profile for UI display
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
      const postIds = posts.map(p => p.id);
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_wallet', req.wallet)
        .in('post_id', postIds);
      
      const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
      feedItems = posts.map(post => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      }));
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
    
    let following = await cacheService.getFollowing(wallet);
    if (!following) {
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_wallet')
        .eq('follower_wallet', wallet);
      following = followsData?.map(f => f.following_wallet) || [];
      await cacheService.setFollowing(wallet, following);
    }
    
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
    
    const postIds = posts.map(p => p.id);
    const { data: likes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_wallet', wallet)
      .in('post_id', postIds);
    
    const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
    
    const feedItems = posts.map(post => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
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
    const postIds = posts.map(p => p.id);
    const { data: likes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_wallet', req.wallet)
      .in('post_id', postIds);

    const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
    const feedItems = posts.map(post => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
    }));

    res.json({
      success: true,
      data: { posts: feedItems },
    });
  },
};
