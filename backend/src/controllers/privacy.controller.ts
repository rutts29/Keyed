import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { privacyService } from '../services/privacy.service.js';
import { addJob } from '../jobs/queues.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Privacy Controller
 *
 * Shield/withdraw/balance are handled client-side via the Privacy Cash SDK.
 * The backend handles tip logging, tip history, settings, and pool info.
 */
export const privacyController = {
  /**
   * POST /privacy/tip/log
   * Log a private tip after the frontend SDK completes the ZK withdraw.
   *
   * Body: { creatorWallet: string, amount: number, postId?: string, txSignature: string }
   */
  async logPrivateTip(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { creatorWallet, amount, postId, txSignature } = req.body;

    if (!creatorWallet) {
      throw new AppError(400, 'MISSING_CREATOR', 'Creator wallet is required');
    }
    if (!amount || amount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0');
    }
    if (!txSignature) {
      throw new AppError(400, 'MISSING_TX', 'Transaction signature is required');
    }

    if (wallet === creatorWallet) {
      throw new AppError(400, 'INVALID_ACTION', 'Cannot tip yourself');
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

    const lamports = Math.floor(amount * 1e9);

    // Store in private_tips table (creator can see amount, not tipper)
    await supabase.from('private_tips').insert({
      creator_wallet: creatorWallet,
      amount: lamports,
      tx_signature: txSignature,
      post_id: postId || null,
    });

    // Track in transactions table -- omit from_wallet to preserve tipper privacy
    await supabase.from('transactions').insert({
      signature: txSignature,
      type: 'tip',
      from_wallet: null,
      to_wallet: creatorWallet,
      amount: lamports,
      post_id: postId || null,
      status: 'confirmed',
    });

    // Update post tips if postId provided
    if (postId) {
      await supabase
        .from('posts')
        .update({ tips_received: supabase.rpc('increment_bigint', { x: lamports }) })
        .eq('id', postId);
    }

    await addJob('notification', {
      type: 'tip',
      targetWallet: creatorWallet,
      fromWallet: 'anonymous',
      amount,
      postId,
    });

    logger.info(
      { creatorWallet, amount, postId, txSignature, isPrivate: true },
      'Logged private tip'
    );

    res.json({
      success: true,
      data: { message: 'Private tip logged successfully.' },
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
