import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import usersRoutes from '../src/routes/users.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const JWT_SECRET = 'test-secret-key-that-is-long-enough';
const TEST_WALLET = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
const TARGET_WALLET = 'BYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKL';

// Generate a valid JWT for testing authenticated endpoints
function generateTestToken(wallet: string = TEST_WALLET): string {
  return jwt.sign({ wallet }, JWT_SECRET, { expiresIn: '1h' });
}

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

// Create a mock function that we can configure per test
const mockSupabaseFrom = vi.fn();

vi.mock('../src/config/supabase.js', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
    rpc: vi.fn().mockResolvedValue({ data: 50 }),
  },
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-that-is-long-enough',
    NODE_ENV: 'test',
  },
}));

vi.mock('../src/jobs/queues.js', () => ({
  addJob: vi.fn(),
}));

// Mock solana service - this simulates the CURRENT behavior returning transaction data
// The tests should FAIL because we're testing for the NEW format
vi.mock('../src/services/solana.service.js', () => ({
  solanaService: {
    buildFollowTx: vi.fn().mockResolvedValue({
      transaction: 'mock-transaction-base64',
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 123456,
    }),
    buildUnfollowTx: vi.fn().mockResolvedValue({
      transaction: 'mock-transaction-base64',
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 123456,
    }),
    getBalance: vi.fn().mockResolvedValue(1.5),
  },
}));

vi.mock('../src/services/cache.service.js', () => ({
  cacheService: {
    getUser: vi.fn().mockResolvedValue(null),
    setUser: vi.fn(),
    invalidateUser: vi.fn(),
    getFollowing: vi.fn().mockResolvedValue(null),
    invalidateFollowing: vi.fn(),
  },
}));

vi.mock('../src/config/solana.js', () => ({
  fetchUserProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/utils/helpers.js', () => ({
  getFollowingWallets: vi.fn().mockResolvedValue([]),
}));

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);
app.use(errorHandler);

describe('Users Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for supabase
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({
                data: {
                  wallet: TARGET_WALLET,
                  username: 'testuser',
                  bio: 'Test bio',
                  follower_count: 10,
                  following_count: 5,
                  post_count: 3,
                },
                error: null,
              }),
              neq: () => ({
                single: () => ({
                  data: null,
                  error: null,
                }),
              }),
            }),
            not: () => ({
              order: () => ({
                limit: () => ({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'follows') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => ({
                  data: null, // No existing follow
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: () => ({
            eq: () => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: () => ({ data: null, error: null }),
          }),
        }),
      };
    });
  });

  describe('GET /api/users/:wallet', () => {
    it('should return user profile', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: {
                    wallet: TEST_WALLET,
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
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => ({ data: null, error: null }),
            }),
          }),
        };
      });

      const response = await request(app)
        .get(`/api/users/${TEST_WALLET}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('testuser');
    });
  });

  /**
   * TDD Tests for New Social Action Response Formats
   *
   * These tests verify the NEW response format after removing on-chain transactions.
   * They should FAIL initially since the implementation still returns transaction data.
   *
   * Expected NEW formats:
   * - Follow: { success: true, data: { followed: true } }
   * - Unfollow: { success: true, data: { unfollowed: true } }
   */

  describe('POST /api/users/:wallet/follow - New Response Format', () => {
    it('should return success with followed: true (no transaction data)', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .post(`/api/users/${TARGET_WALLET}/follow`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // NEW FORMAT: should have followed: true
      expect(response.body.data.followed).toBe(true);

      // Should NOT have transaction-related fields
      expect(response.body.data.transaction).toBeUndefined();
      expect(response.body.data.blockhash).toBeUndefined();
      expect(response.body.data.lastValidBlockHeight).toBeUndefined();
    });

    it('should not include any TransactionResponse fields in follow response', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .post(`/api/users/${TARGET_WALLET}/follow`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Verify only expected fields are present
      const dataKeys = Object.keys(response.body.data);
      expect(dataKeys).toContain('followed');
      expect(dataKeys).not.toContain('transaction');
      expect(dataKeys).not.toContain('blockhash');
      expect(dataKeys).not.toContain('lastValidBlockHeight');
    });
  });

  describe('DELETE /api/users/:wallet/follow - New Response Format', () => {
    beforeEach(() => {
      // Override to simulate existing follow for unfollow tests
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: {
                    wallet: TARGET_WALLET,
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
          };
        }
        if (table === 'follows') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { follower_wallet: TEST_WALLET, following_wallet: TARGET_WALLET }, // Existing follow
                    error: null,
                  }),
                }),
              }),
            }),
            delete: () => ({
              eq: () => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => ({ data: null, error: null }),
            }),
          }),
        };
      });
    });

    it('should return success with unfollowed: true (no transaction data)', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .delete(`/api/users/${TARGET_WALLET}/follow`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // NEW FORMAT: should have unfollowed: true
      expect(response.body.data.unfollowed).toBe(true);

      // Should NOT have transaction-related fields
      expect(response.body.data.transaction).toBeUndefined();
      expect(response.body.data.blockhash).toBeUndefined();
      expect(response.body.data.lastValidBlockHeight).toBeUndefined();
    });

    it('should not include any TransactionResponse fields in unfollow response', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .delete(`/api/users/${TARGET_WALLET}/follow`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Verify only expected fields are present
      const dataKeys = Object.keys(response.body.data);
      expect(dataKeys).toContain('unfollowed');
      expect(dataKeys).not.toContain('transaction');
      expect(dataKeys).not.toContain('blockhash');
      expect(dataKeys).not.toContain('lastValidBlockHeight');
    });
  });
});
