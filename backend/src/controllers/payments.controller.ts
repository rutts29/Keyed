import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { solanaService } from '../services/solana.service.js';
import { addJob } from '../jobs/queues.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const paymentsController = {
  async initializeVault(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    // Check if vault already exists
    const vaultExists = await solanaService.checkVaultExists(wallet);
    if (vaultExists) {
      throw new AppError(400, 'VAULT_EXISTS', 'Creator vault already initialized');
    }

    const txResponse = await solanaService.buildInitializeVaultTx(wallet);

    logger.info({ wallet }, 'Built initialize vault transaction');

    res.json({ success: true, data: txResponse });
  },

  async tip(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { creatorWallet, amount, postId } = req.body;

    if (wallet === creatorWallet) {
      throw new AppError(400, 'INVALID_ACTION', 'Cannot tip yourself');
    }

    if (!amount || amount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0');
    }

    const { data: creator } = await supabase
      .from('users')
      .select('wallet')
      .eq('wallet', creatorWallet)
      .single();

    if (!creator) {
      throw new AppError(404, 'NOT_FOUND', 'Creator not found');
    }

    const txResponse = await solanaService.buildTipTx(wallet, creatorWallet, amount, postId);

    const lamports = Math.floor(amount * 1e9);
    await supabase.from('transactions').insert({
      signature: `pending_${Date.now()}`,
      type: 'tip',
      from_wallet: wallet,
      to_wallet: creatorWallet,
      amount: lamports,
      post_id: postId,
      status: 'pending',
    });

    if (postId) {
      await supabase
        .from('posts')
        .update({ tips_received: supabase.rpc('increment_bigint', { x: lamports }) })
        .eq('id', postId);
    }

    await addJob('notification', {
      type: 'tip',
      targetWallet: creatorWallet,
      fromWallet: wallet,
      amount,
      postId,
    });

    logger.info({ wallet, creatorWallet, amount, postId }, 'Built tip transaction');

    res.json({ success: true, data: txResponse });
  },

  async subscribe(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { creatorWallet, amountPerMonth } = req.body;

    if (wallet === creatorWallet) {
      throw new AppError(400, 'INVALID_ACTION', 'Cannot subscribe to yourself');
    }

    if (!amountPerMonth || amountPerMonth <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0');
    }

    // Check if creator exists
    const { data: creator } = await supabase
      .from('users')
      .select('wallet')
      .eq('wallet', creatorWallet)
      .single();

    if (!creator) {
      throw new AppError(404, 'NOT_FOUND', 'Creator not found');
    }

    const txResponse = await solanaService.buildSubscribeTx(wallet, creatorWallet, amountPerMonth);

    const lamports = Math.floor(amountPerMonth * 1e9);
    await supabase.from('transactions').insert({
      signature: `pending_sub_${Date.now()}`,
      type: 'subscribe',
      from_wallet: wallet,
      to_wallet: creatorWallet,
      amount: lamports,
      status: 'pending',
    });

    logger.info({ wallet, creatorWallet, amountPerMonth }, 'Built subscribe transaction');

    res.json({ success: true, data: txResponse });
  },

  async cancelSubscription(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { creator } = req.params;

    // Build the cancel subscription transaction
    const txResponse = await solanaService.buildCancelSubscriptionTx(wallet, creator);

    // Mark subscription as cancelled in database
    await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('from_wallet', wallet)
      .eq('to_wallet', creator)
      .eq('type', 'subscribe')
      .eq('status', 'pending');

    logger.info({ wallet, creator }, 'Built cancel subscription transaction');

    res.json({ success: true, data: txResponse });
  },

  async getEarnings(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    // Get on-chain vault balance if available
    let vaultBalance = 0;
    try {
      vaultBalance = await solanaService.getVaultBalance(wallet);
    } catch (e) {
      logger.warn({ wallet }, 'Could not fetch vault balance');
    }

    const { data: tips } = await supabase
      .from('transactions')
      .select('amount')
      .eq('to_wallet', wallet)
      .eq('type', 'tip')
      .eq('status', 'confirmed');

    const { data: subscriptions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('to_wallet', wallet)
      .eq('type', 'subscribe')
      .eq('status', 'confirmed');

    const totalTips = tips?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const totalSubscriptions = subscriptions?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

    const { data: recentTips } = await supabase
      .from('transactions')
      .select('*, users!transactions_from_wallet_fkey(*)')
      .eq('to_wallet', wallet)
      .eq('type', 'tip')
      .order('timestamp', { ascending: false })
      .limit(10);

    // Get active subscriber count
    const { count: subscriberCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('to_wallet', wallet)
      .eq('type', 'subscribe')
      .eq('status', 'confirmed');

    res.json({
      success: true,
      data: {
        totalEarnings: (totalTips + totalSubscriptions) / 1e9,
        totalTips: totalTips / 1e9,
        totalSubscriptions: totalSubscriptions / 1e9,
        vaultBalance, // Available balance in vault (on-chain)
        subscriberCount: subscriberCount || 0,
        recentTips: recentTips || [],
      },
    });
  },

  async withdraw(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Amount must be greater than 0');
    }

    // Check vault balance
    const vaultBalance = await solanaService.getVaultBalance(wallet);
    if (vaultBalance < amount) {
      throw new AppError(400, 'INSUFFICIENT_FUNDS', `Insufficient vault balance. Available: ${vaultBalance} SOL`);
    }

    const txResponse = await solanaService.buildWithdrawTx(wallet, amount);

    logger.info({ wallet, amount, vaultBalance }, 'Built withdraw transaction');

    res.json({ success: true, data: txResponse });
  },

  async getVaultInfo(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    const vaultExists = await solanaService.checkVaultExists(wallet);
    
    if (!vaultExists) {
      res.json({
        success: true,
        data: {
          exists: false,
          balance: 0,
          totalEarned: 0,
          withdrawn: 0,
        },
      });
      return;
    }

    const vaultBalance = await solanaService.getVaultBalance(wallet);

    res.json({
      success: true,
      data: {
        exists: true,
        balance: vaultBalance,
      },
    });
  },
};
