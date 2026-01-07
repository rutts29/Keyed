import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { cacheService } from '../services/cache.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const feedController = {
  async getPersonalizedFeed(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;
    
    const cached = !cursor ? await cacheService.getFeed(wallet) : null;
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
    
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
    
    const { data: posts, error } = await query;
    
    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch feed');
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
      isFollowing: following!.includes(post.creator_wallet),
    }));
    
    const nextCursor = posts.length === limit ? posts[posts.length - 1].timestamp : null;
    const result = { posts: feedItems, nextCursor };
    
    if (!cursor) {
      await cacheService.setFeed(wallet, result);
    }
    
    res.json({ success: true, data: result });
  },

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

  async getTrending(req: AuthenticatedRequest, res: Response) {
    const limit = parseInt(req.query.limit as string) || 20;
    
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
    
    res.json({
      success: true,
      data: { posts },
    });
  },
};
