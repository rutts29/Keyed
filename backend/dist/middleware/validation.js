"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = void 0;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const zod_1 = require("zod");
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: result.error.errors,
                },
            });
            return;
        }
        req.body = result.data;
        next();
    };
}
function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid query parameters',
                    details: result.error.errors,
                },
            });
            return;
        }
        req.query = result.data;
        next();
    };
}
function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid path parameters',
                    details: result.error.errors,
                },
            });
            return;
        }
        req.params = result.data;
        next();
    };
}
exports.schemas = {
    wallet: zod_1.z.string().min(32).max(44),
    pagination: zod_1.z.object({
        limit: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1).max(50)).default('20'),
        cursor: zod_1.z.string().optional(),
    }),
    createProfile: zod_1.z.object({
        username: zod_1.z.string().min(1).max(32),
        bio: zod_1.z.string().max(256).optional(),
        profileImageUri: zod_1.z.string().url().optional(),
    }),
    updateProfile: zod_1.z.object({
        bio: zod_1.z.string().max(256).optional(),
        profileImageUri: zod_1.z.string().url().optional(),
    }),
    createPost: zod_1.z.object({
        contentUri: zod_1.z.string().min(1),
        contentType: zod_1.z.enum(['image', 'video', 'text', 'multi']).default('image'),
        caption: zod_1.z.string().max(2000).optional(),
        isTokenGated: zod_1.z.boolean().default(false),
        requiredToken: zod_1.z.string().optional(),
    }),
    comment: zod_1.z.object({
        text: zod_1.z.string().min(1).max(500),
    }),
    tip: zod_1.z.object({
        creatorWallet: zod_1.z.string().min(32).max(44),
        amount: zod_1.z.number().positive(),
        postId: zod_1.z.string().optional(),
    }),
    subscribe: zod_1.z.object({
        creatorWallet: zod_1.z.string().min(32).max(44),
        amountPerMonth: zod_1.z.number().positive(),
    }),
    withdraw: zod_1.z.object({
        amount: zod_1.z.number().positive(),
    }),
    semanticSearch: zod_1.z.object({
        query: zod_1.z.string().min(1).max(500),
        limit: zod_1.z.number().min(1).max(50).default(20),
        rerank: zod_1.z.boolean().default(true),
    }),
    report: zod_1.z.object({
        reason: zod_1.z.enum(['nsfw', 'spam', 'harassment', 'other']),
        description: zod_1.z.string().max(500).optional(),
    }),
    authChallenge: zod_1.z.object({
        wallet: zod_1.z.string().min(32).max(44),
    }),
    authVerify: zod_1.z.object({
        wallet: zod_1.z.string().min(32).max(44),
        signature: zod_1.z.string().min(1),
    }),
};
//# sourceMappingURL=validation.js.map