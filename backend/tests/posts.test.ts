import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import postsRoutes from '../src/routes/posts.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

vi.mock('../src/config/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    pexpire: vi.fn(),
    pttl: vi.fn().mockResolvedValue(3600000),
  },
}));

vi.mock('../src/config/supabase.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: {
              id: 'post123',
              creator_wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
              content_uri: 'ipfs://Qm123',
              caption: 'Test post',
              likes: 5,
              comments: 2,
            },
            error: null,
          }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: 50 }),
  },
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-that-is-long-enough',
    AI_SERVICE_URL: 'http://localhost:8000',
    PINATA_API_KEY: 'test',
    PINATA_SECRET_KEY: 'test',
    PINATA_GATEWAY_URL: 'https://gateway.pinata.cloud',
  },
}));

vi.mock('../src/jobs/queues.js', () => ({
  addJob: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/posts', postsRoutes);
app.use(errorHandler);

describe('Posts Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/posts/:postId', () => {
    it('should return post details', async () => {
      const response = await request(app).get('/api/posts/post123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.caption).toBe('Test post');
    });
  });
});
