"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const redis_js_1 = require("../config/redis.js");
const TTL = {
    USER: 300, // 5 min
    POST: 3600, // 1 hour
    FEED: 30, // 30 sec
    FOLLOWING: 300, // 5 min
};
exports.cacheService = {
    async getUser(wallet) {
        const data = await redis_js_1.redis.get(`user:${wallet}`);
        return data ? JSON.parse(data) : null;
    },
    async setUser(wallet, user) {
        await redis_js_1.redis.setex(`user:${wallet}`, TTL.USER, JSON.stringify(user));
    },
    async invalidateUser(wallet) {
        await redis_js_1.redis.del(`user:${wallet}`);
    },
    async getPost(postId) {
        const data = await redis_js_1.redis.get(`post:${postId}`);
        return data ? JSON.parse(data) : null;
    },
    async setPost(postId, post) {
        await redis_js_1.redis.setex(`post:${postId}`, TTL.POST, JSON.stringify(post));
    },
    async invalidatePost(postId) {
        await redis_js_1.redis.del(`post:${postId}`);
    },
    async getFeed(wallet) {
        const data = await redis_js_1.redis.get(`feed:${wallet}`);
        return data ? JSON.parse(data) : null;
    },
    async setFeed(wallet, feed) {
        await redis_js_1.redis.setex(`feed:${wallet}`, TTL.FEED, JSON.stringify(feed));
    },
    async invalidateFeed(wallet) {
        await redis_js_1.redis.del(`feed:${wallet}`);
    },
    async getFollowing(wallet) {
        const data = await redis_js_1.redis.get(`following:${wallet}`);
        return data ? JSON.parse(data) : null;
    },
    async setFollowing(wallet, following) {
        await redis_js_1.redis.setex(`following:${wallet}`, TTL.FOLLOWING, JSON.stringify(following));
    },
    async invalidateFollowing(wallet) {
        await redis_js_1.redis.del(`following:${wallet}`);
    },
    async invalidateAll(wallet) {
        await Promise.all([
            this.invalidateUser(wallet),
            this.invalidateFeed(wallet),
            this.invalidateFollowing(wallet),
        ]);
    },
};
//# sourceMappingURL=cache.service.js.map