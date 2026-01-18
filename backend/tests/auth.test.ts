import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import authRoutes from '../src/routes/auth.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

// Mock dependencies
vi.mock('../src/config/redis.js', () => ({
  redis: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    pexpire: vi.fn().mockResolvedValue(1),
    pttl: vi.fn().mockResolvedValue(3600000),
  },
}));

vi.mock('../src/config/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-that-is-at-least-32-characters-long',
    NODE_ENV: 'test',
  },
}));

vi.mock('tweetnacl', () => ({
  default: {
    sign: {
      detached: {
        verify: vi.fn(),
      },
    },
  },
}));

vi.mock('bs58', () => ({
  default: {
    decode: vi.fn((str: string) => new Uint8Array(32).fill(1)),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('Auth Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Challenge Generation', () => {
    it('should generate a challenge for valid wallet address', async () => {
      const { redis } = await import('../src/config/redis.js');
      (redis.setex as ReturnType<typeof vi.fn>).mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/auth/challenge')
        .send({ wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Sign this message');
      expect(response.body.data.message).toContain('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
      expect(response.body.data.nonce).toBeDefined();
      expect(response.body.data.nonce.length).toBeGreaterThan(0);
    });

    it('should reject invalid wallet address format', async () => {
      const response = await request(app)
        .post('/api/auth/challenge')
        .send({ wallet: 'invalid-wallet' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject empty wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/challenge')
        .send({ wallet: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing wallet field', async () => {
      const response = await request(app)
        .post('/api/auth/challenge')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should store challenge in Redis with TTL', async () => {
      const { redis } = await import('../src/config/redis.js');
      (redis.setex as ReturnType<typeof vi.fn>).mockResolvedValue('OK');

      await request(app)
        .post('/api/auth/challenge')
        .send({ wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK' });

      expect(redis.setex).toHaveBeenCalled();
      const setexCall = (redis.setex as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(setexCall[0]).toContain('auth:challenge:');
      expect(setexCall[1]).toBe(300); // 5 minutes TTL
    });
  });

  describe('Signature Verification', () => {
    it('should reject when no challenge exists (expired or not requested)', async () => {
      const { redis } = await import('../src/config/redis.js');
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          signature: 'somesignature123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid signature', async () => {
      const { redis } = await import('../src/config/redis.js');
      const nacl = await import('tweetnacl');

      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ nonce: 'test-nonce', message: 'test message' })
      );
      (nacl.default.sign.detached.verify as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          signature: 'invalidsignature',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return JWT token on valid signature', async () => {
      const { redis } = await import('../src/config/redis.js');
      const { supabase } = await import('../src/config/supabase.js');
      const nacl = await import('tweetnacl');

      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ nonce: 'test-nonce', message: 'test message' })
      );
      (redis.del as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (nacl.default.sign.detached.verify as ReturnType<typeof vi.fn>).mockReturnValue(true);

      // Mock no restriction
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          signature: 'validsignature',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.wallet).toBe('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
    });

    it('should delete challenge from Redis after successful verification', async () => {
      const { redis } = await import('../src/config/redis.js');
      const { supabase } = await import('../src/config/supabase.js');
      const nacl = await import('tweetnacl');

      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ nonce: 'test-nonce', message: 'test message' })
      );
      (redis.del as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (nacl.default.sign.detached.verify as ReturnType<typeof vi.fn>).mockReturnValue(true);

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await request(app)
        .post('/api/auth/verify')
        .send({
          wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          signature: 'validsignature',
        });

      expect(redis.del).toHaveBeenCalledWith('auth:challenge:DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
    });
  });

  describe('JWT Token Generation and Validation', () => {
    it('should generate valid JWT with wallet in payload', async () => {
      const { redis } = await import('../src/config/redis.js');
      const { supabase } = await import('../src/config/supabase.js');
      const nacl = await import('tweetnacl');

      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ nonce: 'test-nonce', message: 'test message' })
      );
      (redis.del as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (nacl.default.sign.detached.verify as ReturnType<typeof vi.fn>).mockReturnValue(true);

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          signature: 'validsignature',
        });

      const token = response.body.data.token;
      const decoded = jwt.verify(token, 'test-secret-key-that-is-at-least-32-characters-long') as { wallet: string };

      expect(decoded.wallet).toBe('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
    });

    it('should reject expired tokens on refresh', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK' },
        'test-secret-key-that-is-at-least-32-characters-long',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests without authorization header', async () => {
      const response = await request(app).post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      // Rate limiter returns "Authentication required" for unauthenticated POST requests
      expect(response.body.error.message).toMatch(/Authentication required|Missing/);
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Wallet Restriction Checking', () => {
    it('should block restricted wallet (level >= 3) from getting new token', async () => {
      const { supabase } = await import('../src/config/supabase.js');

      // Create a valid token for a restricted wallet
      const validToken = jwt.sign(
        { wallet: 'RestrictedWalletAddress12345678901234567' },
        'test-secret-key-that-is-at-least-32-characters-long',
        { expiresIn: '1h' }
      );

      // Mock restriction check - level 3 restriction (permanent until lifted)
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                restriction_level: 3,
                restriction_until: null  // No expiration = permanent
              },
              error: null
            })),
          })),
        })),
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Forwarded-For', '192.168.1.100');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow wallet with expired restriction', async () => {
      const { supabase } = await import('../src/config/supabase.js');

      const validToken = jwt.sign(
        { wallet: 'PreviouslyRestrictedWallet12345678901' },
        'test-secret-key-that-is-at-least-32-characters-long',
        { expiresIn: '1h' }
      );

      // Mock restriction that has expired
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                restriction_level: 3,
                restriction_until: pastDate
              },
              error: null
            })),
          })),
        })),
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Forwarded-For', '192.168.1.101');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should allow wallet with restriction level below 3', async () => {
      const { supabase } = await import('../src/config/supabase.js');

      const validToken = jwt.sign(
        { wallet: 'WarnedWalletAddress123456789012345678' },
        'test-secret-key-that-is-at-least-32-characters-long',
        { expiresIn: '1h' }
      );

      // Mock restriction level 2 (warning level)
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { restriction_level: 2, restriction_until: null },
              error: null
            })),
          })),
        })),
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Forwarded-For', '192.168.1.102');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
