"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_js_1 = require("./env.js");
exports.redis = new ioredis_1.default(env_js_1.env.UPSTASH_REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});
exports.redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
});
exports.redis.on('connect', () => {
    console.log('✓ Redis connected');
});
//# sourceMappingURL=redis.js.map