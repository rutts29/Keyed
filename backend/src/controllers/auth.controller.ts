import { Request, Response } from 'express';
import { generateChallenge, verifyChallenge, verifyToken } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

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
    
    res.json({
      success: true,
      data: { token: result.token, wallet },
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
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      });
      return;
    }
    
    const result = await verifyChallenge(payload.wallet, '');
    
    res.json({
      success: true,
      data: { token: result.token, wallet: payload.wallet },
    });
  },
};
