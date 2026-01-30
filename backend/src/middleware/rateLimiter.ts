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

/**
 * Get a unique identifier for rate limiting.
 * Priority: wallet address > forwarded IP > direct IP > reject
 * 
 * SECURITY: We avoid a shared 'anonymous' bucket which would allow
 * all anonymous users to share the same rate limit.
 */
function getClientIdentifier(req: AuthenticatedRequest): string | null {
  // Authenticated users are identified by wallet
  if (req.wallet) {
    return `wallet:${req.wallet}`;
  }
  
  // For anonymous users, try to get the real IP
  // Check X-Forwarded-For for proxied requests (common with load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can be a comma-separated list; take the first (client) IP
    const clientIp = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor.split(',')[0].trim();
    if (clientIp) {
      return `ip:${clientIp}`;
    }
  }
  
  // Fall back to direct IP
  if (req.ip) {
    return `ip:${req.ip}`;
  }
  
  // No identifier available - return null to signal rate limiting should reject
  return null;
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
    
    // SECURITY: Reject requests with no identifiable client to prevent
    // bypassing rate limits through missing headers
    if (!identifier) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Unable to identify client for rate limiting' },
      });
      return;
    }
    
    const key = `ratelimit:${category}:${identifier}`;

    try {
      const current = await Promise.race([
        redis.incr(key),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000)),
      ]);

      if (current === 1) {
        await redis.pexpire(key, config.windowMs).catch(() => {});
      }

      const ttl = await redis.pttl(key).catch(() => config.windowMs);

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
    } catch {
      // Fail open: if Redis is unavailable, allow the request through
    }

    next();
  };
}

export const rateLimitGet = createRateLimiter('GET');
export const rateLimitPost = createRateLimiter('POST');
export const rateLimitUpload = createRateLimiter('UPLOAD');
export const rateLimitSearch = createRateLimiter('SEARCH');
