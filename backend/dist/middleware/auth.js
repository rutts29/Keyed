"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChallenge = generateChallenge;
exports.verifySignature = verifySignature;
exports.verifyChallenge = verifyChallenge;
exports.verifyToken = verifyToken;
exports.authMiddleware = authMiddleware;
exports.optionalAuthMiddleware = optionalAuthMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const env_js_1 = require("../config/env.js");
const redis_js_1 = require("../config/redis.js");
const supabase_js_1 = require("../config/supabase.js");
const helpers_js_1 = require("../utils/helpers.js");
const logger_js_1 = require("../utils/logger.js");
const CHALLENGE_TTL = 300; // 5 minutes
const JWT_EXPIRY = '7d';
async function generateChallenge(wallet) {
    const nonce = (0, helpers_js_1.generateNonce)();
    const message = (0, helpers_js_1.generateChallengeMessage)(wallet, nonce);
    await redis_js_1.redis.setex(`auth:challenge:${wallet}`, CHALLENGE_TTL, JSON.stringify({ nonce, message }));
    return { message, nonce };
}
async function verifySignature(wallet, signature, message) {
    try {
        const publicKey = bs58_1.default.decode(wallet);
        const signatureBytes = bs58_1.default.decode(signature);
        const messageBytes = new TextEncoder().encode(message);
        return tweetnacl_1.default.sign.detached.verify(messageBytes, signatureBytes, publicKey);
    }
    catch (error) {
        logger_js_1.logger.error({ error, wallet }, 'Signature verification failed');
        return false;
    }
}
async function verifyChallenge(wallet, signature) {
    const stored = await redis_js_1.redis.get(`auth:challenge:${wallet}`);
    if (!stored) {
        return { valid: false };
    }
    const { message } = JSON.parse(stored);
    const isValid = await verifySignature(wallet, signature, message);
    if (!isValid) {
        return { valid: false };
    }
    await redis_js_1.redis.del(`auth:challenge:${wallet}`);
    const { data: restriction } = await supabase_js_1.supabase
        .from('wallet_restrictions')
        .select('restriction_level, restriction_until')
        .eq('wallet', wallet)
        .single();
    if (restriction && restriction.restriction_level >= 3) {
        const until = restriction.restriction_until;
        if (!until || new Date(until) > new Date()) {
            return { valid: false };
        }
    }
    const token = jsonwebtoken_1.default.sign({ wallet }, env_js_1.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
    return { valid: true, token };
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_SECRET);
    }
    catch {
        return null;
    }
}
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
        });
        return;
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        });
        return;
    }
    req.wallet = payload.wallet;
    next();
}
function optionalAuthMiddleware(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const payload = verifyToken(token);
        if (payload) {
            req.wallet = payload.wallet;
        }
    }
    next();
}
//# sourceMappingURL=auth.js.map