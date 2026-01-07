"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionSchema = exports.CommentSchema = exports.PostSchema = exports.UserProfileSchema = void 0;
const zod_1 = require("zod");
exports.UserProfileSchema = zod_1.z.object({
    wallet: zod_1.z.string(),
    username: zod_1.z.string().nullable(),
    bio: zod_1.z.string().nullable(),
    profile_image_uri: zod_1.z.string().nullable(),
    follower_count: zod_1.z.number(),
    following_count: zod_1.z.number(),
    post_count: zod_1.z.number(),
    created_at: zod_1.z.string().nullable(),
    is_verified: zod_1.z.boolean(),
});
exports.PostSchema = zod_1.z.object({
    id: zod_1.z.string(),
    creator_wallet: zod_1.z.string(),
    content_uri: zod_1.z.string(),
    content_type: zod_1.z.enum(['image', 'video', 'text', 'multi']),
    caption: zod_1.z.string().nullable(),
    timestamp: zod_1.z.string(),
    likes: zod_1.z.number(),
    comments: zod_1.z.number(),
    tips_received: zod_1.z.number(),
    is_token_gated: zod_1.z.boolean(),
    required_token: zod_1.z.string().nullable(),
    llm_description: zod_1.z.string().nullable(),
    auto_tags: zod_1.z.array(zod_1.z.string()).nullable(),
    scene_type: zod_1.z.string().nullable(),
    mood: zod_1.z.string().nullable(),
    safety_score: zod_1.z.number().nullable(),
    alt_text: zod_1.z.string().nullable(),
});
exports.CommentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    post_id: zod_1.z.string(),
    commenter_wallet: zod_1.z.string(),
    text: zod_1.z.string(),
    timestamp: zod_1.z.string(),
});
exports.TransactionSchema = zod_1.z.object({
    signature: zod_1.z.string(),
    type: zod_1.z.enum(['tip', 'subscribe', 'post', 'follow', 'like']),
    from_wallet: zod_1.z.string().nullable(),
    to_wallet: zod_1.z.string().nullable(),
    amount: zod_1.z.number().nullable(),
    post_id: zod_1.z.string().nullable(),
    timestamp: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'confirmed', 'failed']),
});
//# sourceMappingURL=schemas.js.map