"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessController = void 0;
const supabase_js_1 = require("../config/supabase.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.accessController = {
    async verifyAccess(req, res) {
        const wallet = req.wallet;
        const postId = req.query.postId;
        if (!postId) {
            throw new errorHandler_js_1.AppError(400, 'MISSING_PARAM', 'postId is required');
        }
        const { data: post } = await supabase_js_1.supabase
            .from('posts')
            .select('is_token_gated, required_token, creator_wallet')
            .eq('id', postId)
            .single();
        if (!post) {
            throw new errorHandler_js_1.AppError(404, 'NOT_FOUND', 'Post not found');
        }
        if (!post.is_token_gated) {
            res.json({
                success: true,
                data: { hasAccess: true, reason: 'public' },
            });
            return;
        }
        if (post.creator_wallet === wallet) {
            res.json({
                success: true,
                data: { hasAccess: true, reason: 'owner' },
            });
            return;
        }
        // TODO: Implement actual token verification when Solana programs are ready
        // For now, stub as no access
        res.json({
            success: true,
            data: {
                hasAccess: false,
                reason: 'token_required',
                requiredToken: post.required_token,
            },
        });
    },
    async setRequirements(req, res) {
        const wallet = req.wallet;
        const { postId, requiredToken, minimumBalance } = req.body;
        const { data: post } = await supabase_js_1.supabase
            .from('posts')
            .select('creator_wallet')
            .eq('id', postId)
            .single();
        if (!post) {
            throw new errorHandler_js_1.AppError(404, 'NOT_FOUND', 'Post not found');
        }
        if (post.creator_wallet !== wallet) {
            throw new errorHandler_js_1.AppError(403, 'FORBIDDEN', 'Not the post owner');
        }
        await supabase_js_1.supabase
            .from('posts')
            .update({
            is_token_gated: true,
            required_token: requiredToken,
        })
            .eq('id', postId);
        res.json({
            success: true,
            data: {
                message: 'Access requirements updated',
                requiredToken,
                minimumBalance,
            },
        });
    },
};
//# sourceMappingURL=access.controller.js.map