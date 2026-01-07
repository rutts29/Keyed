"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postsController = void 0;
const uuid_1 = require("uuid");
const supabase_js_1 = require("../config/supabase.js");
const cache_service_js_1 = require("../services/cache.service.js");
const ipfs_service_js_1 = require("../services/ipfs.service.js");
const ai_service_js_1 = require("../services/ai.service.js");
const solana_service_js_1 = require("../services/solana.service.js");
const realtime_service_js_1 = require("../services/realtime.service.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const helpers_js_1 = require("../utils/helpers.js");
const queues_js_1 = require("../jobs/queues.js");
exports.postsController = {
    async upload(req, res) {
        const wallet = req.wallet;
        const file = req.file;
        if (!file) {
            throw new errorHandler_js_1.AppError(400, 'NO_FILE', 'No file uploaded');
        }
        const { data: limit } = await supabase_js_1.supabase.rpc('get_wallet_upload_limit', { wallet_address: wallet });
        if (limit === 0) {
            throw new errorHandler_js_1.AppError(403, 'UPLOAD_BLOCKED', 'Upload privileges suspended');
        }
        const imageHash = (0, helpers_js_1.hashImage)(file.buffer);
        const { data: blocked } = await supabase_js_1.supabase
            .from('blocked_content_hashes')
            .select('reason')
            .eq('image_hash', imageHash)
            .single();
        if (blocked) {
            throw new errorHandler_js_1.AppError(400, 'CONTENT_BLOCKED', `Content blocked: ${blocked.reason}`);
        }
        const hashCheck = await ai_service_js_1.aiService.checkHash(imageHash);
        if (hashCheck.knownBad) {
            throw new errorHandler_js_1.AppError(400, 'CONTENT_BLOCKED', `Content blocked: ${hashCheck.reason}`);
        }
        const base64 = file.buffer.toString('base64');
        const imageBase64 = `data:${file.mimetype};base64,${base64}`;
        const moderationResult = await ai_service_js_1.aiService.moderateContent(imageBase64, req.body.caption);
        if (moderationResult.verdict === 'block') {
            await supabase_js_1.supabase.from('content_violations').insert({
                wallet,
                violation_type: moderationResult.blockedCategory,
                severity_score: moderationResult.maxScore,
                image_hash: imageHash,
                explanation: moderationResult.explanation,
            });
            await supabase_js_1.supabase.from('blocked_content_hashes').upsert({
                image_hash: imageHash,
                reason: moderationResult.blockedCategory,
            }, { onConflict: 'image_hash', ignoreDuplicates: true });
            throw new errorHandler_js_1.AppError(400, 'CONTENT_VIOLATION', moderationResult.explanation);
        }
        const contentUri = await ipfs_service_js_1.ipfsService.uploadToPinata(file.buffer, file.originalname);
        const ipfsHash = contentUri.replace('ipfs://', '');
        await ipfs_service_js_1.ipfsService.cacheInR2(ipfsHash, file.buffer, file.mimetype);
        res.json({
            success: true,
            data: {
                contentUri,
                publicUrl: ipfs_service_js_1.ipfsService.getPublicUrl(contentUri),
                moderationResult,
            },
        });
    },
    async create(req, res) {
        const wallet = req.wallet;
        const { contentUri, contentType, caption, isTokenGated, requiredToken } = req.body;
        const postId = (0, uuid_1.v4)().replace(/-/g, '').slice(0, 44);
        const txResponse = await solana_service_js_1.solanaService.buildCreatePostTx(wallet, contentUri, contentType, caption || '', isTokenGated, requiredToken);
        await supabase_js_1.supabase.from('posts').insert({
            id: postId,
            creator_wallet: wallet,
            content_uri: contentUri,
            content_type: contentType,
            caption,
            timestamp: new Date().toISOString(),
            is_token_gated: isTokenGated,
            required_token: requiredToken,
        });
        await supabase_js_1.supabase.rpc('increment_user_stat', { wallet_addr: wallet, stat_name: 'post_count' });
        await (0, queues_js_1.addJob)('ai-analysis', { postId, contentUri, caption });
        await (0, queues_js_1.addJob)('notification', { type: 'new_post', postId, creatorWallet: wallet });
        await cache_service_js_1.cacheService.invalidateUser(wallet);
        res.json({
            success: true,
            data: { ...txResponse, metadata: { postId } },
        });
    },
    async getPost(req, res) {
        const { postId } = req.params;
        const cached = await cache_service_js_1.cacheService.getPost(postId);
        if (cached) {
            res.json({ success: true, data: cached });
            return;
        }
        const { data: post, error } = await supabase_js_1.supabase
            .from('posts')
            .select('*, users!posts_creator_wallet_fkey(*)')
            .eq('id', postId)
            .single();
        if (error || !post) {
            throw new errorHandler_js_1.AppError(404, 'NOT_FOUND', 'Post not found');
        }
        let isLiked = false;
        if (req.wallet) {
            const { data: like } = await supabase_js_1.supabase
                .from('likes')
                .select('user_wallet')
                .eq('post_id', postId)
                .eq('user_wallet', req.wallet)
                .single();
            isLiked = !!like;
        }
        const result = { ...post, isLiked };
        await cache_service_js_1.cacheService.setPost(postId, result);
        res.json({ success: true, data: result });
    },
    async like(req, res) {
        const wallet = req.wallet;
        const { postId } = req.params;
        const { data: post } = await supabase_js_1.supabase
            .from('posts')
            .select('creator_wallet')
            .eq('id', postId)
            .single();
        if (!post) {
            throw new errorHandler_js_1.AppError(404, 'NOT_FOUND', 'Post not found');
        }
        if (post.creator_wallet === wallet) {
            throw new errorHandler_js_1.AppError(400, 'INVALID_ACTION', 'Cannot like your own post');
        }
        const txResponse = await solana_service_js_1.solanaService.buildLikeTx(wallet, postId);
        await supabase_js_1.supabase.from('likes').insert({
            user_wallet: wallet,
            post_id: postId,
        });
        await supabase_js_1.supabase.from('posts').update({ likes: supabase_js_1.supabase.rpc('increment', { x: 1 }) }).eq('id', postId);
        await cache_service_js_1.cacheService.invalidatePost(postId);
        await realtime_service_js_1.realtimeService.notifyLike(postId, wallet, post.creator_wallet);
        res.json({ success: true, data: txResponse });
    },
    async unlike(req, res) {
        const wallet = req.wallet;
        const { postId } = req.params;
        const txResponse = await solana_service_js_1.solanaService.buildUnlikeTx(wallet, postId);
        await supabase_js_1.supabase
            .from('likes')
            .delete()
            .eq('user_wallet', wallet)
            .eq('post_id', postId);
        await supabase_js_1.supabase.from('posts').update({ likes: supabase_js_1.supabase.rpc('decrement', { x: 1 }) }).eq('id', postId);
        await cache_service_js_1.cacheService.invalidatePost(postId);
        res.json({ success: true, data: txResponse });
    },
    async getComments(req, res) {
        const { postId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor;
        let query = supabase_js_1.supabase
            .from('comments')
            .select('*, users!comments_commenter_wallet_fkey(*)')
            .eq('post_id', postId)
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (cursor) {
            query = query.lt('timestamp', cursor);
        }
        const { data: comments, error } = await query;
        if (error) {
            throw new errorHandler_js_1.AppError(500, 'DB_ERROR', 'Failed to fetch comments');
        }
        const nextCursor = comments.length === limit ? comments[comments.length - 1].timestamp : null;
        res.json({
            success: true,
            data: { comments, nextCursor },
        });
    },
    async addComment(req, res) {
        const wallet = req.wallet;
        const { postId } = req.params;
        const { text } = req.body;
        const { data: post } = await supabase_js_1.supabase
            .from('posts')
            .select('creator_wallet')
            .eq('id', postId)
            .single();
        if (!post) {
            throw new errorHandler_js_1.AppError(404, 'NOT_FOUND', 'Post not found');
        }
        const commentId = (0, uuid_1.v4)().replace(/-/g, '').slice(0, 44);
        const txResponse = await solana_service_js_1.solanaService.buildCommentTx(wallet, postId, text);
        const { data: comment } = await supabase_js_1.supabase
            .from('comments')
            .insert({
            id: commentId,
            post_id: postId,
            commenter_wallet: wallet,
            text,
        })
            .select('*')
            .single();
        await supabase_js_1.supabase.from('posts').update({ comments: supabase_js_1.supabase.rpc('increment', { x: 1 }) }).eq('id', postId);
        await cache_service_js_1.cacheService.invalidatePost(postId);
        await realtime_service_js_1.realtimeService.notifyComment(postId, comment, post.creator_wallet);
        res.json({
            success: true,
            data: { ...txResponse, metadata: { commentId } },
        });
    },
    async report(req, res) {
        const wallet = req.wallet;
        const { postId } = req.params;
        const { reason, description } = req.body;
        const { data: post } = await supabase_js_1.supabase
            .from('posts')
            .select('creator_wallet')
            .eq('id', postId)
            .single();
        if (!post) {
            throw new errorHandler_js_1.AppError(404, 'NOT_FOUND', 'Post not found');
        }
        await supabase_js_1.supabase.from('user_reports').insert({
            reporter_wallet: wallet,
            reported_content_id: postId,
            reported_wallet: post.creator_wallet,
            reason,
            description,
        });
        res.json({ success: true, data: { message: 'Report submitted' } });
    },
};
//# sourceMappingURL=posts.controller.js.map