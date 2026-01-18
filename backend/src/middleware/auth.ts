import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { AuthenticatedRequest } from '../types/index.js';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { supabase } from '../config/supabase.js';
import { generateNonce, generateChallengeMessage } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

const CHALLENGE_TTL = 300; // 5 minutes
const JWT_EXPIRY = '7d';

export interface JWTPayload {
  wallet: string;
  iat: number;
  exp: number;
}

export async function generateChallenge(wallet: string): Promise<{ message: string; nonce: string }> {
  const nonce = generateNonce();
  const message = generateChallengeMessage(wallet, nonce);
  
  await redis.setex(`auth:challenge:${wallet}`, CHALLENGE_TTL, JSON.stringify({ nonce, message }));
  
  return { message, nonce };
}

export async function verifySignature(
  wallet: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    const publicKey = bs58.decode(wallet);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey);
  } catch (error) {
    logger.error({ error, wallet }, 'Signature verification failed');
    return false;
  }
}

export async function verifyChallenge(
  wallet: string,
  signature: string
): Promise<{ valid: boolean; token?: string }> {
  const stored = await redis.get(`auth:challenge:${wallet}`);
  if (!stored) {
    return { valid: false };
  }

  // Safely parse Redis data to handle potential corruption
  let message: string;
  try {
    const parsed = JSON.parse(stored);
    message = parsed.message;
  } catch (error) {
    logger.error({ error, wallet }, 'Failed to parse stored challenge data from Redis');
    await redis.del(`auth:challenge:${wallet}`);
    return { valid: false };
  }
  const isValid = await verifySignature(wallet, signature, message);
  
  if (!isValid) {
    return { valid: false };
  }
  
  await redis.del(`auth:challenge:${wallet}`);
  
  const { data: restriction } = await supabase
    .from('wallet_restrictions')
    .select('restriction_level, restriction_until')
    .eq('wallet', wallet)
    .single();
  
  if (restriction && restriction.restriction_level >= 3) {
    const until = restriction.restriction_until;
    if (!until || new Date(until) > new Date()) {
      return { valid: false };
    }
  }
  
  const token = jwt.sign({ wallet }, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
  
  return { valid: true, token };
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
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
  
  req.wallet = payload.wallet;
  next();
}

export function optionalAuthMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.wallet = payload.wallet;
    }
  }
  
  next();
}
