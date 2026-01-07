import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

export const accessController = {
  async verifyAccess(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const postId = req.query.postId as string;
    
    if (!postId) {
      throw new AppError(400, 'MISSING_PARAM', 'postId is required');
    }
    
    const { data: post } = await supabase
      .from('posts')
      .select('is_token_gated, required_token, creator_wallet')
      .eq('id', postId)
      .single();
    
    if (!post) {
      throw new AppError(404, 'NOT_FOUND', 'Post not found');
    }
    
    if (!post.is_token_gated) {
      res.json({
        success: true,
        data: { hasAccess: true, reason: 'public' },
      });
      return;
    }
    
    if (post.creator_wallet === wallet) {
      res.json({
        success: true,
        data: { hasAccess: true, reason: 'owner' },
      });
      return;
    }
    
    // TODO: Implement actual token verification when Solana programs are ready
    // For now, stub as no access
    res.json({
      success: true,
      data: {
        hasAccess: false,
        reason: 'token_required',
        requiredToken: post.required_token,
      },
    });
  },

  async setRequirements(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { postId, requiredToken, minimumBalance } = req.body;
    
    const { data: post } = await supabase
      .from('posts')
      .select('creator_wallet')
      .eq('id', postId)
      .single();
    
    if (!post) {
      throw new AppError(404, 'NOT_FOUND', 'Post not found');
    }
    
    if (post.creator_wallet !== wallet) {
      throw new AppError(403, 'FORBIDDEN', 'Not the post owner');
    }
    
    await supabase
      .from('posts')
      .update({
        is_token_gated: true,
        required_token: requiredToken,
      })
      .eq('id', postId);
    
    res.json({
      success: true,
      data: {
        message: 'Access requirements updated',
        requiredToken,
        minimumBalance,
      },
    });
  },
};
