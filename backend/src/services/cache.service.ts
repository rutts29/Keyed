import { redis } from '../config/redis.js';

/**
 * Cache TTL values (in seconds)
 *
 * Caching strategy:
 * - USER: Medium TTL - profile data changes infrequently
 * - POST: Long TTL - post content is immutable, only stats change
 * - FEED: Medium TTL - balance between freshness and performance
 * - FOLLOWING: Medium TTL - social graph changes infrequently
 * - SEARCH: Short TTL - search results should be relatively fresh
 * - TRENDING: Short TTL - trending content changes frequently
 */
const TTL = {
  USER: 300,        // 5 min
  POST: 3600,       // 1 hour
  FEED: 300,        // 5 min (increased from 30s to reduce DB load)
  FOLLOWING: 300,   // 5 min
  SEARCH: 120,      // 2 min
  TRENDING: 60,     // 1 min
};

export const cacheService = {
  async getUser(wallet: string) {
    const data = await redis.get(`user:${wallet}`);
    return data ? JSON.parse(data) : null;
  },

  async setUser(wallet: string, user: unknown) {
    await redis.setex(`user:${wallet}`, TTL.USER, JSON.stringify(user));
  },

  async invalidateUser(wallet: string) {
    await redis.del(`user:${wallet}`);
  },

  async getPost(postId: string) {
    const data = await redis.get(`post:${postId}`);
    return data ? JSON.parse(data) : null;
  },

  async setPost(postId: string, post: unknown) {
    await redis.setex(`post:${postId}`, TTL.POST, JSON.stringify(post));
  },

  async invalidatePost(postId: string) {
    await redis.del(`post:${postId}`);
  },

  async getFeed(wallet: string) {
    const data = await redis.get(`feed:${wallet}`);
    return data ? JSON.parse(data) : null;
  },

  async setFeed(wallet: string, feed: unknown) {
    await redis.setex(`feed:${wallet}`, TTL.FEED, JSON.stringify(feed));
  },

  async invalidateFeed(wallet: string) {
    await redis.del(`feed:${wallet}`);
  },

  async getFollowing(wallet: string): Promise<string[] | null> {
    const data = await redis.get(`following:${wallet}`);
    return data ? JSON.parse(data) : null;
  },

  async setFollowing(wallet: string, following: string[]) {
    await redis.setex(`following:${wallet}`, TTL.FOLLOWING, JSON.stringify(following));
  },

  async invalidateFollowing(wallet: string) {
    await redis.del(`following:${wallet}`);
  },

  async invalidateAll(wallet: string) {
    await Promise.all([
      this.invalidateUser(wallet),
      this.invalidateFeed(wallet),
      this.invalidateFollowing(wallet),
    ]);
  },

  // Trending content cache
  async getTrending() {
    const data = await redis.get('trending:posts');
    return data ? JSON.parse(data) : null;
  },

  async setTrending(posts: unknown) {
    await redis.setex('trending:posts', TTL.TRENDING, JSON.stringify(posts));
  },

  // Search suggestions cache
  async getSuggestions(prefix: string) {
    const data = await redis.get(`suggestions:${prefix.toLowerCase()}`);
    return data ? JSON.parse(data) : null;
  },

  async setSuggestions(prefix: string, suggestions: unknown) {
    await redis.setex(`suggestions:${prefix.toLowerCase()}`, TTL.SEARCH, JSON.stringify(suggestions));
  },

  // Generic cache helpers
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key: string, value: unknown, ttl: number) {
    await redis.setex(key, ttl, JSON.stringify(value));
  },

  async del(key: string) {
    await redis.del(key);
  },
};
