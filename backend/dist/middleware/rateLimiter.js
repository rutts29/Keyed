"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitSearch = exports.rateLimitUpload = exports.rateLimitPost = exports.rateLimitGet = void 0;
exports.createRateLimiter = createRateLimiter;
const redis_js_1 = require("../config/redis.js");
const RATE_LIMITS = {
    GET: {
        auth: { windowMs: 3600000, max: 1000 },
        unauth: { windowMs: 3600000, max: 100 },
    },
    POST: {
        auth: { windowMs: 3600000, max: 100 },
        unauth: { windowMs: 3600000, max: 0 },
    },
    UPLOAD: {
        auth: { windowMs: 3600000, max: 50 },
        unauth: { windowMs: 3600000, max: 0 },
    },
    SEARCH: {
        auth: { windowMs: 3600000, max: 200 },
        unauth: { windowMs: 3600000, max: 50 },
    },
};
function getClientIdentifier(req) {
    return req.wallet || req.ip || 'anonymous';
}
function createRateLimiter(category) {
    return async (req, res, next) => {
        const isAuth = !!req.wallet;
        const config = RATE_LIMITS[category][isAuth ? 'auth' : 'unauth'];
        if (config.max === 0) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
            });
            return;
        }
        const identifier = getClientIdentifier(req);
        const key = `ratelimit:${category}:${identifier}`;
        const current = await redis_js_1.redis.incr(key);
        if (current === 1) {
            await redis_js_1.redis.pexpire(key, config.windowMs);
        }
        const ttl = await redis_js_1.redis.pttl(key);
        res.setHeader('X-RateLimit-Limit', config.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - current));
        res.setHeader('X-RateLimit-Reset', Date.now() + ttl);
        if (current > config.max) {
            res.status(429).json({
                success: false,
                error: { code: 'RATE_LIMITED', message: 'Too many requests' },
            });
            return;
        }
        next();
    };
}
exports.rateLimitGet = createRateLimiter('GET');
exports.rateLimitPost = createRateLimiter('POST');
exports.rateLimitUpload = createRateLimiter('UPLOAD');
exports.rateLimitSearch = createRateLimiter('SEARCH');
//# sourceMappingURL=rateLimiter.js.map