import { Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { cacheService } from '../services/cache.service.js';
import { solanaService } from '../services/solana.service.js';
import { realtimeService } from '../services/realtime.service.js';
import { fetchUserProfile } from '../config/solana.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const usersController = {
  async getProfile(req: AuthenticatedRequest, res: Response) {
    const { wallet } = req.params;
    const viewerWallet = req.wallet;

    // Get base user data (cacheable)
    let user = await cacheService.getUser(wallet);

    if (!user) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet', wallet)
        .single();

      if (error || !data) {
        throw new AppError(404, 'NOT_FOUND', 'User not found');
      }

      user = data;
      await cacheService.setUser(wallet, user);
    }

    // Determine isFollowing status (not cached - user-specific)
    let isFollowing = false;
    if (viewerWallet && viewerWallet !== wallet) {
      // Try to use cached following list first
      const cachedFollowing = await cacheService.getFollowing(viewerWallet);

      if (cachedFollowing) {
        isFollowing = cachedFollowing.includes(wallet);
      } else {
        // Query database directly
        const { data: followRecord } = await supabase
          .from('follows')
          .select('follower_wallet')
          .eq('follower_wallet', viewerWallet)
          .eq('following_wallet', wallet)
          .single();

        isFollowing = followRecord !== null;
      }
    }

    res.json({
      success: true,
      data: {
        ...user,
        isFollowing,
      },
    });
  },

  async createOrUpdateProfile(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { username, bio, profileImageUri } = req.body;

    // Check if profile already exists on-chain
    const existingProfile = await fetchUserProfile(new PublicKey(wallet));
    const isUpdate = existingProfile !== null;

    // Check username uniqueness
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

    let txResponse;
    if (isUpdate) {
      // Update existing profile
      txResponse = await solanaService.buildUpdateProfileTx(
        wallet,
        bio,
        profileImageUri
      );
      logger.info({ wallet }, 'Built update profile transaction');
    } else {
      // Create new profile
      if (!username) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Username is required for new profiles');
      }
      txResponse = await solanaService.buildCreateProfileTx(
        wallet,
        username,
        bio || '',
        profileImageUri || ''
      );
      logger.info({ wallet, username }, 'Built create profile transaction');
    }

    // Upsert in database
    await supabase.from('users').upsert({
      wallet,
      username: username || existingProfile?.username,
      bio: bio ?? existingProfile?.bio,
      profile_image_uri: profileImageUri ?? existingProfile?.profileImageUri,
      last_synced: new Date().toISOString(),
    });

    await cacheService.invalidateUser(wallet);

    res.json({
      success: true,
      data: {
        ...txResponse,
        metadata: { isUpdate },
      },
    });
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

    // Check target user exists
    const { data: targetUser } = await supabase
      .from('users')
      .select('wallet')
      .eq('wallet', targetWallet)
      .single();

    if (!targetUser) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('follower_wallet')
      .eq('follower_wallet', wallet)
      .eq('following_wallet', targetWallet)
      .single();

    if (existingFollow) {
      throw new AppError(400, 'ALREADY_FOLLOWING', 'Already following this user');
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

    logger.info({ wallet, targetWallet }, 'Built follow transaction');

    res.json({ success: true, data: txResponse });
  },

  async unfollow(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { wallet: targetWallet } = req.params;

    // Check if actually following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('follower_wallet')
      .eq('follower_wallet', wallet)
      .eq('following_wallet', targetWallet)
      .single();

    if (!existingFollow) {
      throw new AppError(400, 'NOT_FOLLOWING', 'Not following this user');
    }

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

    logger.info({ wallet, targetWallet }, 'Built unfollow transaction');

    res.json({ success: true, data: txResponse });
  },

  async checkProfileExists(req: AuthenticatedRequest, res: Response) {
    const { wallet } = req.params;

    const profile = await fetchUserProfile(new PublicKey(wallet));

    res.json({
      success: true,
      data: {
        exists: profile !== null,
        onChain: profile !== null,
      },
    });
  },

  async getSuggestedUsers(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

    // Get the user's following list (from cache or DB)
    let followingWallets = await cacheService.getFollowing(wallet);

    if (!followingWallets) {
      const { data: follows, error: followError } = await supabase
        .from('follows')
        .select('following_wallet')
        .eq('follower_wallet', wallet);

      if (followError) {
        logger.error({ error: followError, wallet }, 'Failed to fetch following list for suggestions');
        throw new AppError(500, 'DB_ERROR', 'Failed to fetch following list');
      }

      followingWallets = follows?.map(f => f.following_wallet) || [];
      await cacheService.setFollowing(wallet, followingWallets);
    }

    // Build exclusion list: users already followed + current user
    const excludeWallets = [...followingWallets, wallet];

    // Query for suggested users: not in exclusion list, ordered by follower_count
    const { data: users, error } = await supabase
      .from('users')
      .select('wallet, username, bio, profile_image_uri, follower_count, is_verified')
      .not('wallet', 'in', `(${excludeWallets.join(',')})`)
      .order('follower_count', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ error, wallet }, 'Failed to fetch suggested users');
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch suggested users');
    }

    logger.debug({ wallet, suggestedCount: users?.length || 0 }, 'Fetched suggested users');

    res.json({
      success: true,
      data: {
        users: users || [],
      },
    });
  },
};
