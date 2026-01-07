import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { redis } from '../config/redis.js';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const RATE_LIMITS: Record<string, { auth: RateLimitConfig; unauth: RateLimitConfig }> = {
  GET: {
    auth: { windowMs: 3600000, max: 1000 },
    unauth: { windowMs: 3600000, max: 100 },
  },
  POST: {
    auth: { windowMs: 3600000, max: 100 },
    unauth: { windowMs: 3600000, max: 0 },
  },
  UPLOAD: {
    auth: { windowMs: 3600000, max: 50 },
    unauth: { windowMs: 3600000, max: 0 },
  },
  SEARCH: {
    auth: { windowMs: 3600000, max: 200 },
    unauth: { windowMs: 3600000, max: 50 },
  },
};

function getClientIdentifier(req: AuthenticatedRequest): string {
  return req.wallet || req.ip || 'anonymous';
}

export function createRateLimiter(category: keyof typeof RATE_LIMITS) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const isAuth = !!req.wallet;
    const config = RATE_LIMITS[category][isAuth ? 'auth' : 'unauth'];
    
    if (config.max === 0) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    
    const identifier = getClientIdentifier(req);
    const key = `ratelimit:${category}:${identifier}`;
    
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.pexpire(key, config.windowMs);
    }
    
    const ttl = await redis.pttl(key);
    
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - current));
    res.setHeader('X-RateLimit-Reset', Date.now() + ttl);
    
    if (current > config.max) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      });
      return;
    }
    
    next();
  };
}

export const rateLimitGet = createRateLimiter('GET');
export const rateLimitPost = createRateLimiter('POST');
export const rateLimitUpload = createRateLimiter('UPLOAD');
export const rateLimitSearch = createRateLimiter('SEARCH');
