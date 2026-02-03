import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import postsRoutes from '../src/routes/posts.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const JWT_SECRET = 'test-secret-key-that-is-long-enough';
const TEST_WALLET = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
const OTHER_WALLET = 'BYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKL';

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
    AI_SERVICE_URL: 'http://localhost:8000',
    PINATA_API_KEY: 'test',
    PINATA_SECRET_KEY: 'test',
    PINATA_GATEWAY_URL: 'https://gateway.pinata.cloud',
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
    buildLikeTx: vi.fn().mockResolvedValue({
      transaction: 'mock-transaction-base64',
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 123456,
    }),
    buildUnlikeTx: vi.fn().mockResolvedValue({
      transaction: 'mock-transaction-base64',
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 123456,
    }),
    buildCommentTx: vi.fn().mockResolvedValue({
      transaction: 'mock-transaction-base64',
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 123456,
    }),
  },
}));

vi.mock('../src/services/cache.service.js', () => ({
  cacheService: {
    getPost: vi.fn().mockResolvedValue(null),
    setPost: vi.fn(),
    invalidatePost: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/posts', postsRoutes);
app.use(errorHandler);

describe('Posts Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for supabase
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'posts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({
                data: {
                  id: 'post123',
                  creator_wallet: OTHER_WALLET, // Different from test wallet so user can like
                  content_uri: 'ipfs://Qm123',
                  caption: 'Test post',
                  likes: 5,
                  comments: 2,
                },
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: () => ({
              single: () => ({
                data: { id: 'comment123' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'likes') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => ({
                  data: null, // No existing like
                  error: null,
                }),
              }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          delete: () => ({
            eq: () => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      if (table === 'comments') {
        return {
          insert: vi.fn().mockReturnValue({
            select: () => ({
              single: () => ({
                data: { id: 'comment123', text: 'Test comment' },
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
  });

  describe('GET /api/posts/:postId', () => {
    it('should return post details', async () => {
      const response = await request(app).get('/api/posts/post123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.caption).toBe('Test post');
    });
  });

  /**
   * TDD Tests for New Social Action Response Formats
   *
   * These tests verify the NEW response format after removing on-chain transactions.
   * They should FAIL initially since the implementation still returns transaction data.
   *
   * Expected NEW formats:
   * - Like: { success: true, data: { liked: true } }
   * - Unlike: { success: true, data: { unliked: true } }
   * - Comment: { success: true, data: { commentId: string } }
   */

  describe('POST /api/posts/:postId/like - New Response Format', () => {
    it('should return success with liked: true (no transaction data)', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .post('/api/posts/post123/like')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // NEW FORMAT: should have liked: true
      expect(response.body.data.liked).toBe(true);

      // Should NOT have transaction-related fields
      expect(response.body.data.transaction).toBeUndefined();
      expect(response.body.data.blockhash).toBeUndefined();
      expect(response.body.data.lastValidBlockHeight).toBeUndefined();
    });

    it('should not include any TransactionResponse fields in like response', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .post('/api/posts/post123/like')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Verify only expected fields are present
      const dataKeys = Object.keys(response.body.data);
      expect(dataKeys).toContain('liked');
      expect(dataKeys).not.toContain('transaction');
      expect(dataKeys).not.toContain('blockhash');
      expect(dataKeys).not.toContain('lastValidBlockHeight');
    });
  });

  describe('DELETE /api/posts/:postId/like - New Response Format', () => {
    beforeEach(() => {
      // Override to simulate existing like for unlike tests
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: {
                    id: 'post123',
                    creator_wallet: OTHER_WALLET,
                    content_uri: 'ipfs://Qm123',
                    caption: 'Test post',
                    likes: 5,
                    comments: 2,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'likes') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { user_wallet: TEST_WALLET, post_id: 'post123' }, // Existing like
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

    it('should return success with unliked: true (no transaction data)', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .delete('/api/posts/post123/like')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // NEW FORMAT: should have unliked: true
      expect(response.body.data.unliked).toBe(true);

      // Should NOT have transaction-related fields
      expect(response.body.data.transaction).toBeUndefined();
      expect(response.body.data.blockhash).toBeUndefined();
      expect(response.body.data.lastValidBlockHeight).toBeUndefined();
    });

    it('should not include any TransactionResponse fields in unlike response', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .delete('/api/posts/post123/like')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Verify only expected fields are present
      const dataKeys = Object.keys(response.body.data);
      expect(dataKeys).toContain('unliked');
      expect(dataKeys).not.toContain('transaction');
      expect(dataKeys).not.toContain('blockhash');
      expect(dataKeys).not.toContain('lastValidBlockHeight');
    });
  });

  describe('POST /api/posts/:postId/comments - New Response Format', () => {
    it('should return success with commentId only (no transaction data)', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .post('/api/posts/post123/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'This is a test comment' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // NEW FORMAT: should have commentId
      expect(response.body.data.commentId).toBeDefined();
      expect(typeof response.body.data.commentId).toBe('string');

      // Should NOT have transaction-related fields
      expect(response.body.data.transaction).toBeUndefined();
      expect(response.body.data.blockhash).toBeUndefined();
      expect(response.body.data.lastValidBlockHeight).toBeUndefined();
    });

    it('should not include any TransactionResponse fields in comment response', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .post('/api/posts/post123/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Another test comment' });

      expect(response.status).toBe(200);

      // Verify only expected fields are present
      const dataKeys = Object.keys(response.body.data);
      expect(dataKeys).toContain('commentId');
      expect(dataKeys).not.toContain('transaction');
      expect(dataKeys).not.toContain('blockhash');
      expect(dataKeys).not.toContain('lastValidBlockHeight');
      expect(dataKeys).not.toContain('metadata'); // Old format wrapped commentId in metadata
    });

    it('should return a valid commentId string', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .post('/api/posts/post123/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Test comment for ID validation' });

      expect(response.status).toBe(200);
      expect(response.body.data.commentId).toBeDefined();
      // commentId should be a 32-character hex string (UUID without dashes)
      expect(response.body.data.commentId).toMatch(/^[a-f0-9]{32}$/);
    });
  });
});
