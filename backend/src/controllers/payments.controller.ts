import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { solanaService } from '../services/solana.service.js';
import { realtimeService } from '../services/realtime.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const paymentsController = {
  async tip(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { creatorWallet, amount, postId } = req.body;
    
    if (wallet === creatorWallet) {
      throw new AppError(400, 'INVALID_ACTION', 'Cannot tip yourself');
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
    
    await realtimeService.notifyTip(wallet, creatorWallet, amount, postId);
    
    res.json({ success: true, data: txResponse });
  },

  async subscribe(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { creatorWallet, amountPerMonth } = req.body;
    
    if (wallet === creatorWallet) {
      throw new AppError(400, 'INVALID_ACTION', 'Cannot subscribe to yourself');
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
    
    res.json({ success: true, data: txResponse });
  },

  async cancelSubscription(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { creator } = req.params;
    
    await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('from_wallet', wallet)
      .eq('to_wallet', creator)
      .eq('type', 'subscribe')
      .eq('status', 'pending');
    
    res.json({ success: true, data: { message: 'Subscription cancelled' } });
  },

  async getEarnings(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    
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
    
    res.json({
      success: true,
      data: {
        totalEarnings: (totalTips + totalSubscriptions) / 1e9,
        totalTips: totalTips / 1e9,
        totalSubscriptions: totalSubscriptions / 1e9,
        recentTips: recentTips || [],
      },
    });
  },

  async withdraw(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { amount } = req.body;
    
    const balance = await solanaService.getBalance(wallet);
    if (balance < amount) {
      throw new AppError(400, 'INSUFFICIENT_FUNDS', 'Insufficient balance');
    }
    
    const txResponse = await solanaService.buildWithdrawTx(wallet, amount);
    
    res.json({ success: true, data: txResponse });
  },
};
