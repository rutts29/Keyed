import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { cacheService } from '../services/cache.service.js';
import { solanaService } from '../services/solana.service.js';
import { realtimeService } from '../services/realtime.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const usersController = {
  async getProfile(req: AuthenticatedRequest, res: Response) {
    const { wallet } = req.params;
    
    const cached = await cacheService.getUser(wallet);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet', wallet)
      .single();
    
    if (error || !user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }
    
    await cacheService.setUser(wallet, user);
    
    res.json({ success: true, data: user });
  },

  async createOrUpdateProfile(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { username, bio, profileImageUri } = req.body;
    
    if (username) {
      const { data: existing } = await supabase
        .from('users')
        .select('wallet')
        .eq('username', username)
        .neq('wallet', wallet)
        .single();
      
      if (existing) {
        throw new AppError(400, 'USERNAME_TAKEN', 'Username is already taken');
      }
    }
    
    const txResponse = await solanaService.buildCreateProfileTx(
      wallet,
      username || '',
      bio || '',
      profileImageUri || ''
    );
    
    await supabase.from('users').upsert({
      wallet,
      username,
      bio,
      profile_image_uri: profileImageUri,
      last_synced: new Date().toISOString(),
    });
    
    await cacheService.invalidateUser(wallet);
    
    res.json({ success: true, data: txResponse });
  },

  async getUserPosts(req: AuthenticatedRequest, res: Response) {
    const { wallet } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;
    
    let query = supabase
      .from('posts')
      .select('*')
      .eq('creator_wallet', wallet)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (cursor) {
      query = query.lt('timestamp', cursor);
    }
    
    const { data: posts, error } = await query;
    
    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch posts');
    }
    
    const nextCursor = posts.length === limit ? posts[posts.length - 1].timestamp : null;
    
    res.json({
      success: true,
      data: { posts, nextCursor },
    });
  },

  async getFollowers(req: AuthenticatedRequest, res: Response) {
    const { wallet } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;
    
    let query = supabase
      .from('follows')
      .select('follower_wallet, timestamp')
      .eq('following_wallet', wallet)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (cursor) {
      query = query.lt('timestamp', cursor);
    }
    
    const { data: follows, error } = await query;
    
    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch followers');
    }
    
    const wallets = follows.map(f => f.follower_wallet);
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .in('wallet', wallets);
    
    const nextCursor = follows.length === limit ? follows[follows.length - 1].timestamp : null;
    
    res.json({
      success: true,
      data: { followers: users || [], nextCursor },
    });
  },

  async getFollowing(req: AuthenticatedRequest, res: Response) {
    const { wallet } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;
    
    let query = supabase
      .from('follows')
      .select('following_wallet, timestamp')
      .eq('follower_wallet', wallet)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (cursor) {
      query = query.lt('timestamp', cursor);
    }
    
    const { data: follows, error } = await query;
    
    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch following');
    }
    
    const wallets = follows.map(f => f.following_wallet);
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .in('wallet', wallets);
    
    const nextCursor = follows.length === limit ? follows[follows.length - 1].timestamp : null;
    
    res.json({
      success: true,
      data: { following: users || [], nextCursor },
    });
  },

  async follow(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { wallet: targetWallet } = req.params;
    
    if (wallet === targetWallet) {
      throw new AppError(400, 'INVALID_ACTION', 'Cannot follow yourself');
    }
    
    const txResponse = await solanaService.buildFollowTx(wallet, targetWallet);
    
    await supabase.from('follows').insert({
      follower_wallet: wallet,
      following_wallet: targetWallet,
    });
    
    await supabase.rpc('increment_user_stat', { wallet_addr: wallet, stat_name: 'following_count' });
    await supabase.rpc('increment_user_stat', { wallet_addr: targetWallet, stat_name: 'follower_count' });
    
    await cacheService.invalidateFollowing(wallet);
    await cacheService.invalidateUser(wallet);
    await cacheService.invalidateUser(targetWallet);
    
    await realtimeService.notifyFollow(wallet, targetWallet);
    
    res.json({ success: true, data: txResponse });
  },

  async unfollow(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { wallet: targetWallet } = req.params;
    
    const txResponse = await solanaService.buildUnfollowTx(wallet, targetWallet);
    
    await supabase
      .from('follows')
      .delete()
      .eq('follower_wallet', wallet)
      .eq('following_wallet', targetWallet);
    
    await supabase.rpc('increment_user_stat', { wallet_addr: wallet, stat_name: 'following_count', delta: -1 });
    await supabase.rpc('increment_user_stat', { wallet_addr: targetWallet, stat_name: 'follower_count', delta: -1 });
    
    await cacheService.invalidateFollowing(wallet);
    await cacheService.invalidateUser(wallet);
    await cacheService.invalidateUser(targetWallet);
    
    res.json({ success: true, data: txResponse });
  },
};
