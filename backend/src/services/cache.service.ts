import { redis } from '../config/redis.js';

const TTL = {
  USER: 300,        // 5 min
  POST: 3600,       // 1 hour
  FEED: 30,         // 30 sec
  FOLLOWING: 300,   // 5 min
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
};
