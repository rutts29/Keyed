/**
 * Cache Service Tests - Token Access Caching (TDD)
 *
 * Tests for token access caching functionality in src/services/cache.service.ts.
 * These tests are written FIRST (TDD approach) before implementing the feature.
 *
 * Expected interface:
 * - getTokenAccess(wallet, postId) - Get cached access result
 * - setTokenAccess(wallet, postId, result) - Cache access result with 5 min TTL
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis - vi.mock is hoisted so we can't reference variables defined after it
vi.mock('../src/config/redis.js', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock logger to suppress warnings during tests
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import { cacheService } from '../src/services/cache.service.js';
import { redis } from '../src/config/redis.js';

// Get the mocked functions
const mockRedis = redis as {
  get: ReturnType<typeof vi.fn>;
  setex: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

/**
 * Interface for cached token access results
 */
interface CachedTokenAccess {
  hasAccess: boolean;
  reason: string;
  message?: string;
}

describe('Cache Service - Token Access', () => {
  const testWallet = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
  const testPostId = 'post-123-abc';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to default behavior
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
  });

  describe('getTokenAccess', () => {
    it('should return null when cache miss (no data in cache)', async () => {
      // Arrange: Redis returns null (cache miss)
      mockRedis.get.mockResolvedValue(null);

      // Act
      const result = await cacheService.getTokenAccess(testWallet, testPostId);

      // Assert
      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledTimes(1);
      expect(mockRedis.get).toHaveBeenCalledWith(`token-access:${testWallet}:${testPostId}`);
    });

    it('should use correct cache key format: token-access:{wallet}:{postId}', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      const wallet = 'ABC123';
      const postId = 'xyz-789';

      // Act
      await cacheService.getTokenAccess(wallet, postId);

      // Assert: Verify key format
      expect(mockRedis.get).toHaveBeenCalledWith(`token-access:${wallet}:${postId}`);
    });

    it('should return cached data when cache hit', async () => {
      // Arrange: Redis returns cached data
      const cachedData: CachedTokenAccess = {
        hasAccess: true,
        reason: 'token_holder',
        message: 'You have access as a token holder',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheService.getTokenAccess(testWallet, testPostId);

      // Assert
      expect(result).toEqual(cachedData);
      expect(result?.hasAccess).toBe(true);
      expect(result?.reason).toBe('token_holder');
      expect(result?.message).toBe('You have access as a token holder');
    });

    it('should return cached data with hasAccess: false', async () => {
      // Arrange: Cache contains access denied result
      const cachedData: CachedTokenAccess = {
        hasAccess: false,
        reason: 'insufficient_tokens',
        message: 'You need at least 100 tokens to access this content',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheService.getTokenAccess(testWallet, testPostId);

      // Assert
      expect(result).toEqual(cachedData);
      expect(result?.hasAccess).toBe(false);
      expect(result?.reason).toBe('insufficient_tokens');
    });

    it('should handle cached data without optional message field', async () => {
      // Arrange: Cached data without message
      const cachedData: CachedTokenAccess = {
        hasAccess: true,
        reason: 'owner',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheService.getTokenAccess(testWallet, testPostId);

      // Assert
      expect(result).toEqual(cachedData);
      expect(result?.message).toBeUndefined();
    });

    it('should return null when Redis times out (graceful degradation)', async () => {
      // Arrange: Redis hangs (simulating timeout)
      mockRedis.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      );

      // Act
      const result = await cacheService.getTokenAccess(testWallet, testPostId);

      // Assert: Should return null (cache miss) instead of throwing
      expect(result).toBeNull();
    });

    it('should return null when Redis throws error (graceful degradation)', async () => {
      // Arrange: Redis throws error
      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));

      // Act
      const result = await cacheService.getTokenAccess(testWallet, testPostId);

      // Assert: Should return null instead of throwing
      expect(result).toBeNull();
    });
  });

  describe('setTokenAccess', () => {
    it('should store data with correct TTL of 300 seconds (5 minutes)', async () => {
      // Arrange
      const accessResult: CachedTokenAccess = {
        hasAccess: true,
        reason: 'token_holder',
      };

      // Act
      await cacheService.setTokenAccess(testWallet, testPostId, accessResult);

      // Assert
      expect(mockRedis.setex).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `token-access:${testWallet}:${testPostId}`,
        300, // 5 minutes TTL
        JSON.stringify(accessResult)
      );
    });

    it('should use correct cache key format: token-access:{wallet}:{postId}', async () => {
      // Arrange
      const wallet = 'WalletXYZ';
      const postId = 'post-456';
      const accessResult: CachedTokenAccess = {
        hasAccess: false,
        reason: 'no_tokens',
      };

      // Act
      await cacheService.setTokenAccess(wallet, postId, accessResult);

      // Assert: Verify key format
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `token-access:${wallet}:${postId}`,
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should serialize access result with all fields correctly', async () => {
      // Arrange
      const accessResult: CachedTokenAccess = {
        hasAccess: true,
        reason: 'token_holder',
        message: 'Full access granted',
      };

      // Act
      await cacheService.setTokenAccess(testWallet, testPostId, accessResult);

      // Assert: Verify JSON serialization
      const [, , serializedValue] = mockRedis.setex.mock.calls[0];
      const parsedValue = JSON.parse(serializedValue as string);
      expect(parsedValue).toEqual(accessResult);
    });

    it('should not throw when Redis times out (graceful degradation)', async () => {
      // Arrange: Redis hangs
      mockRedis.setex.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      );
      const accessResult: CachedTokenAccess = {
        hasAccess: true,
        reason: 'test',
      };

      // Act & Assert: Should not throw
      await expect(
        cacheService.setTokenAccess(testWallet, testPostId, accessResult)
      ).resolves.not.toThrow();
    });

    it('should not throw when Redis throws error (graceful degradation)', async () => {
      // Arrange: Redis throws error
      mockRedis.setex.mockRejectedValue(new Error('Redis write error'));
      const accessResult: CachedTokenAccess = {
        hasAccess: true,
        reason: 'test',
      };

      // Act & Assert: Should not throw
      await expect(
        cacheService.setTokenAccess(testWallet, testPostId, accessResult)
      ).resolves.not.toThrow();
    });
  });

  describe('getTokenAccess returns cached data after setTokenAccess', () => {
    it('should return the same data that was set', async () => {
      // Arrange
      const accessResult: CachedTokenAccess = {
        hasAccess: true,
        reason: 'token_holder',
        message: 'Access granted',
      };

      // Simulate Redis behavior: get returns what was set
      let storedValue: string | null = null;
      mockRedis.setex.mockImplementation(async (_key: string, _ttl: number, value: string) => {
        storedValue = value;
        return 'OK';
      });
      mockRedis.get.mockImplementation(async () => storedValue);

      // Act
      await cacheService.setTokenAccess(testWallet, testPostId, accessResult);
      const retrievedResult = await cacheService.getTokenAccess(testWallet, testPostId);

      // Assert
      expect(retrievedResult).toEqual(accessResult);
    });

    it('should use consistent key format for both get and set operations', async () => {
      // Arrange
      const accessResult: CachedTokenAccess = {
        hasAccess: false,
        reason: 'insufficient_tokens',
      };

      // Act
      await cacheService.setTokenAccess(testWallet, testPostId, accessResult);
      await cacheService.getTokenAccess(testWallet, testPostId);

      // Assert: Both operations should use the same key format
      const setKey = mockRedis.setex.mock.calls[0][0];
      const getKey = mockRedis.get.mock.calls[0][0];
      expect(setKey).toBe(getKey);
      expect(setKey).toBe(`token-access:${testWallet}:${testPostId}`);
    });
  });

  describe('cache key isolation', () => {
    it('should use different keys for different wallets', async () => {
      // Arrange
      const wallet1 = 'Wallet1ABC';
      const wallet2 = 'Wallet2XYZ';
      const postId = 'same-post-id';

      // Act
      await cacheService.getTokenAccess(wallet1, postId);
      await cacheService.getTokenAccess(wallet2, postId);

      // Assert: Different keys for different wallets
      expect(mockRedis.get).toHaveBeenNthCalledWith(1, `token-access:${wallet1}:${postId}`);
      expect(mockRedis.get).toHaveBeenNthCalledWith(2, `token-access:${wallet2}:${postId}`);
    });

    it('should use different keys for different posts', async () => {
      // Arrange
      const wallet = 'SameWallet';
      const postId1 = 'post-1';
      const postId2 = 'post-2';

      // Act
      await cacheService.getTokenAccess(wallet, postId1);
      await cacheService.getTokenAccess(wallet, postId2);

      // Assert: Different keys for different posts
      expect(mockRedis.get).toHaveBeenNthCalledWith(1, `token-access:${wallet}:${postId1}`);
      expect(mockRedis.get).toHaveBeenNthCalledWith(2, `token-access:${wallet}:${postId2}`);
    });
  });
});
