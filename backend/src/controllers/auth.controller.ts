import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { generateChallenge, verifyChallenge, verifyToken } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';

const JWT_EXPIRY = '7d';

export const authController = {
  async getChallenge(req: Request, res: Response) {
    const { wallet } = req.body;
    
    const { message, nonce } = await generateChallenge(wallet);
    
    res.json({
      success: true,
      data: { message, nonce },
    });
  },

  async verify(req: Request, res: Response) {
    const { wallet, signature } = req.body;
    
    const result = await verifyChallenge(wallet, signature);
    
    if (!result.valid) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid signature' },
      });
      return;
    }
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('wallet')
      .eq('wallet', wallet)
      .single();
    
    if (!existingUser) {
      await supabase.from('users').insert({
        wallet,
        created_at: new Date().toISOString(),
      });
    }

    // Fetch user profile to return with token
    const { data: userProfile } = await supabase
      .from('users')
      .select('wallet, username, bio, profile_image_uri, follower_count, following_count, post_count, created_at, is_verified')
      .eq('wallet', wallet)
      .single();

    res.json({
      success: true,
      data: { token: result.token, wallet, user: userProfile },
    });
  },

  async refresh(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing token' },
      });
      return;
    }
    
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
      return;
    }
    
    // Check if wallet is restricted before issuing new token
    const { data: restriction } = await supabase
      .from('wallet_restrictions')
      .select('restriction_level, restriction_until')
      .eq('wallet', payload.wallet)
      .single();
    
    if (restriction && restriction.restriction_level >= 3) {
      const until = restriction.restriction_until;
      if (!until || new Date(until) > new Date()) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Wallet access restricted' },
        });
        return;
      }
    }
    
    // Generate new token directly since we already verified the existing token
    // No need to re-verify signature - the valid JWT proves the user authenticated previously
    const newToken = jwt.sign({ wallet: payload.wallet }, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
    
    res.json({
      success: true,
      data: { token: newToken, wallet: payload.wallet },
    });
  },
};
