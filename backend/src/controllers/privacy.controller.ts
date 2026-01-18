import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { privacyService } from '../services/privacy.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Privacy Controller
 * Handles endpoints for private tipping using Privacy Cash SDK
 */
export const privacyController = {
  /**
   * POST /privacy/shield
   * Shield SOL into privacy pool
   *
   * Body: { amount: number }
   */
  async shield(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0');
    }

    // Build shield transaction
    const txResponse = await privacyService.buildShieldTx(wallet, amount);

    // Log shield intent (actual balance will be updated after tx confirmation)
    const lamports = Math.floor(amount * 1e9);
    await supabase.from('transactions').insert({
      signature: `pending_shield_${Date.now()}`,
      type: 'tip', // Reusing 'tip' type for now, could add 'shield' type
      from_wallet: wallet,
      to_wallet: null, // Shielding to privacy pool
      amount: lamports,
      status: 'pending',
      post_id: null,
    });

    logger.info({ wallet, amount }, 'Built shield transaction');

    res.json({
      success: true,
      data: {
        ...txResponse,
        message: 'Shield transaction ready. Sign to deposit SOL into privacy pool.',
      },
    });
  },

  /**
   * POST /privacy/tip
   * Send private tip from privacy pool to creator
   *
   * Body: { creatorWallet: string, amount: number, postId?: string }
   */
  async privateTip(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { creatorWallet, amount, postId } = req.body;

    if (wallet === creatorWallet) {
      throw new AppError(400, 'INVALID_ACTION', 'Cannot tip yourself');
    }

    if (!amount || amount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0');
    }

    if (!creatorWallet) {
      throw new AppError(400, 'MISSING_CREATOR', 'Creator wallet is required');
    }

    // Verify creator exists
    const { data: creator } = await supabase
      .from('users')
      .select('wallet')
      .eq('wallet', creatorWallet)
      .single();

    if (!creator) {
      throw new AppError(404, 'NOT_FOUND', 'Creator not found');
    }

    // Check if user has sufficient shielded balance
    const hasSufficientBalance = await privacyService.hasSufficientBalance(wallet, amount);
    if (!hasSufficientBalance) {
      throw new AppError(
        400,
        'INSUFFICIENT_BALANCE',
        'Insufficient shielded balance. Please shield more SOL first.'
      );
    }

    // Build private tip transaction
    const txResponse = await privacyService.buildPrivateTipTx(wallet, creatorWallet, amount);

    // Log private tip (without revealing tipper publicly)
    const lamports = Math.floor(amount * 1e9);
    const signature = `pending_private_${Date.now()}`;

    // Store in private_tips table (creator can see amount, not tipper)
    await supabase.from('private_tips').insert({
      creator_wallet: creatorWallet,
      amount: lamports,
      tx_signature: signature,
      post_id: postId || null,
    });

    // Also track in transactions table (for tipper's history)
    await supabase.from('transactions').insert({
      signature,
      type: 'tip',
      from_wallet: wallet,
      to_wallet: creatorWallet,
      amount: lamports,
      post_id: postId || null,
      status: 'pending',
    });

    // Update post tips if postId provided (don't reveal who tipped)
    if (postId) {
      await supabase
        .from('posts')
        .update({ tips_received: supabase.rpc('increment_bigint', { x: lamports }) })
        .eq('id', postId);
    }

    logger.info(
      { creatorWallet, amount, postId, isPrivate: true },
      'Built private tip transaction'
    );

    res.json({
      success: true,
      data: {
        ...txResponse,
        message: 'Private tip transaction ready. Your identity will remain anonymous.',
      },
    });
  },

  /**
   * GET /privacy/balance
   * Get user's shielded balance
   */
  async getBalance(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    const balance = await privacyService.getShieldedBalance(wallet);

    // Convert lamports to SOL
    const balanceInSol = {
      shielded: balance.shielded / 1e9,
      available: balance.available / 1e9,
      pending: balance.pending / 1e9,
    };

    logger.info({ wallet, balance: balanceInSol }, 'Fetched shielded balance');

    res.json({
      success: true,
      data: balanceInSol,
    });
  },

  /**
   * GET /privacy/tips/received
   * Get private tips received by creator (without revealing tippers)
   */
  async getPrivateTipsReceived(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    const { data: privateTips } = await supabase
      .from('private_tips')
      .select('id, amount, tx_signature, post_id, timestamp')
      .eq('creator_wallet', wallet)
      .order('timestamp', { ascending: false })
      .limit(50);

    // Calculate total private tips received
    const totalPrivateTips = privateTips?.reduce((sum, tip) => sum + (tip.amount || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        tips: privateTips || [],
        total: totalPrivateTips / 1e9, // Convert to SOL
        count: privateTips?.length || 0,
      },
    });
  },

  /**
   * GET /privacy/tips/sent
   * Get user's private tip history (their own tips sent)
   */
  async getPrivateTipsSent(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    // Get tips from transactions table where from_wallet matches
    const { data: sentTips } = await supabase
      .from('transactions')
      .select('signature, to_wallet, amount, post_id, timestamp, status')
      .eq('from_wallet', wallet)
      .eq('type', 'tip')
      .like('signature', 'pending_private_%')
      .order('timestamp', { ascending: false })
      .limit(50);

    const totalSent = sentTips?.reduce((sum, tip) => sum + (tip.amount || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        tips: sentTips || [],
        total: totalSent / 1e9, // Convert to SOL
        count: sentTips?.length || 0,
      },
    });
  },

  /**
   * GET /privacy/settings
   * Get user's privacy settings
   */
  async getSettings(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    const { data: settings } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('wallet', wallet)
      .single();

    res.json({
      success: true,
      data: settings || {
        wallet,
        default_private_tips: false,
      },
    });
  },

  /**
   * PUT /privacy/settings
   * Update user's privacy settings
   *
   * Body: { defaultPrivateTips: boolean }
   */
  async updateSettings(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { defaultPrivateTips } = req.body;

    const { data, error } = await supabase
      .from('user_privacy_settings')
      .upsert(
        {
          wallet,
          default_private_tips: defaultPrivateTips,
        },
        {
          onConflict: 'wallet',
        }
      )
      .select()
      .single();

    if (error) {
      logger.error({ wallet, error }, 'Failed to update privacy settings');
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to update settings');
    }

    logger.info({ wallet, defaultPrivateTips }, 'Updated privacy settings');

    res.json({
      success: true,
      data,
    });
  },

  /**
   * GET /privacy/pool/info
   * Get Privacy Cash pool information
   */
  async getPoolInfo(req: AuthenticatedRequest, res: Response) {
    const poolInfo = await privacyService.getPoolInfo();

    res.json({
      success: true,
      data: poolInfo,
    });
  },
};
