import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth.routes.js';

vi.mock('../src/config/redis.js', () => ({
  redis: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../src/config/supabase.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/challenge', () => {
    it('should return challenge message for valid wallet', async () => {
      const { redis } = await import('../src/config/redis.js');
      (redis.setex as any).mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/auth/challenge')
        .send({ wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Sign this message');
      expect(response.body.data.nonce).toBeDefined();
    });

    it('should reject invalid wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/challenge')
        .send({ wallet: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should reject when no challenge exists', async () => {
      const { redis } = await import('../src/config/redis.js');
      (redis.get as any).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          signature: 'somesignature',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
