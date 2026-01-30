import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const TTL = {
  USER: 300,
  POST: 3600,
  FEED: 300,
  FOLLOWING: 300,
  SEARCH: 120,
  TRENDING: 60,
};

const REDIS_TIMEOUT = 2000;

async function safeGet(key: string): Promise<string | null> {
  try {
    return await Promise.race([
      redis.get(key),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), REDIS_TIMEOUT)),
    ]);
  } catch {
    logger.warn({ key }, 'Cache get failed, skipping');
    return null;
  }
}

async function safeSet(key: string, ttl: number, value: string): Promise<void> {
  try {
    await Promise.race([
      redis.setex(key, ttl, value),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), REDIS_TIMEOUT)),
    ]);
  } catch {
    logger.warn({ key }, 'Cache set failed, skipping');
  }
}

async function safeDel(key: string): Promise<void> {
  try {
    await Promise.race([
      redis.del(key),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), REDIS_TIMEOUT)),
    ]);
  } catch {
    logger.warn({ key }, 'Cache del failed, skipping');
  }
}

export const cacheService = {
  async getUser(wallet: string) {
    const data = await safeGet(`user:${wallet}`);
    return data ? JSON.parse(data) : null;
  },

  async setUser(wallet: string, user: unknown) {
    await safeSet(`user:${wallet}`, TTL.USER, JSON.stringify(user));
  },

  async invalidateUser(wallet: string) {
    await safeDel(`user:${wallet}`);
  },

  async getPost(postId: string) {
    const data = await safeGet(`post:${postId}`);
    return data ? JSON.parse(data) : null;
  },

  async setPost(postId: string, post: unknown) {
    await safeSet(`post:${postId}`, TTL.POST, JSON.stringify(post));
  },

  async invalidatePost(postId: string) {
    await safeDel(`post:${postId}`);
  },

  async getFeed(wallet: string) {
    const data = await safeGet(`feed:${wallet}`);
    return data ? JSON.parse(data) : null;
  },

  async setFeed(wallet: string, feed: unknown) {
    await safeSet(`feed:${wallet}`, TTL.FEED, JSON.stringify(feed));
  },

  async invalidateFeed(wallet: string) {
    await safeDel(`feed:${wallet}`);
  },

  async getFollowing(wallet: string): Promise<string[] | null> {
    const data = await safeGet(`following:${wallet}`);
    return data ? JSON.parse(data) : null;
  },

  async setFollowing(wallet: string, following: string[]) {
    await safeSet(`following:${wallet}`, TTL.FOLLOWING, JSON.stringify(following));
  },

  async invalidateFollowing(wallet: string) {
    await safeDel(`following:${wallet}`);
  },

  async invalidateAll(wallet: string) {
    await Promise.all([
      this.invalidateUser(wallet),
      this.invalidateFeed(wallet),
      this.invalidateFollowing(wallet),
    ]);
  },

  async getTrending() {
    const data = await safeGet('trending:posts');
    return data ? JSON.parse(data) : null;
  },

  async setTrending(posts: unknown) {
    await safeSet('trending:posts', TTL.TRENDING, JSON.stringify(posts));
  },

  async getTrendingTopics() {
    const data = await safeGet('trending:topics');
    return data ? JSON.parse(data) : null;
  },

  async setTrendingTopics(topics: unknown) {
    await safeSet('trending:topics', TTL.TRENDING, JSON.stringify(topics));
  },

  async getSuggestions(prefix: string) {
    const data = await safeGet(`suggestions:${prefix.toLowerCase()}`);
    return data ? JSON.parse(data) : null;
  },

  async setSuggestions(prefix: string, suggestions: unknown) {
    await safeSet(`suggestions:${prefix.toLowerCase()}`, TTL.SEARCH, JSON.stringify(suggestions));
  },
};
