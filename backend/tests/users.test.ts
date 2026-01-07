import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import usersRoutes from '../src/routes/users.routes.js';
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
              wallet: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
              username: 'testuser',
              bio: 'Test bio',
              follower_count: 10,
              following_count: 5,
              post_count: 3,
            },
            error: null,
          }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: 50 }),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);
app.use(errorHandler);

describe('Users Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users/:wallet', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/users/DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('testuser');
    });
  });
});
