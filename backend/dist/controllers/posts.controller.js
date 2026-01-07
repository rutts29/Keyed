import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { cacheService } from '../services/cache.service.js';
import { ipfsService } from '../services/ipfs.service.js';
import { aiService } from '../services/ai.service.js';
import { solanaService } from '../services/solana.service.js';
import { realtimeService } from '../services/realtime.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashImage } from '../utils/helpers.js';
import { addJob } from '../jobs/queues.js';
export const postsController = {
    async upload(req, res) {
        const wallet = req.wallet;
        const file = req.file;
        if (!file) {
            throw new AppError(400, 'NO_FILE', 'No file uploaded');
        }
        const { data: limit } = await supabase.rpc('get_wallet_upload_limit', { wallet_address: wallet });
        if (limit === 0) {
            throw new AppError(403, 'UPLOAD_BLOCKED', 'Upload privileges suspended');
        }
        const imageHash = hashImage(file.buffer);
        const { data: blocked } = await supabase
            .from('blocked_content_hashes')
            .select('reason')
            .eq('image_hash', imageHash)
            .single();
        if (blocked) {
            throw new AppError(400, 'CONTENT_BLOCKED', `Content blocked: ${blocked.reason}`);
        }
        const hashCheck = await aiService.checkHash(imageHash);
        if (hashCheck.knownBad) {
            throw new AppError(400, 'CONTENT_BLOCKED', `Content blocked: ${hashCheck.reason}`);
        }
        const base64 = file.buffer.toString('base64');
        const imageBase64 = `data:${file.mimetype};base64,${base64}`;
        const moderationResult = await aiService.moderateContent(imageBase64, req.body.caption, wallet);
        if (moderationResult.verdict === 'block') {
            await supabase.from('content_violations').insert({
                wallet,
                violation_type: moderationResult.blockedCategory,
                severity_score: moderationResult.maxScore,
                image_hash: imageHash,
                explanation: moderationResult.explanation,
            });
            await supabase.from('blocked_content_hashes').upsert({
                image_hash: imageHash,
                reason: moderationResult.blockedCategory,
            }, { onConflict: 'image_hash', ignoreDuplicates: true });
            throw new AppError(400, 'CONTENT_VIOLATION', moderationResult.explanation);
        }
        const contentUri = await ipfsService.uploadToPinata(file.buffer, file.originalname);
        const ipfsHash = contentUri.replace('ipfs://', '');
        await ipfsService.cacheInR2(ipfsHash, file.buffer, file.mimetype);
        res.json({
            success: true,
            data: {
                contentUri,
                publicUrl: ipfsService.getPublicUrl(contentUri),
                moderationResult,
            },
        });
    },
    async create(req, res) {
        const wallet = req.wallet;
        const { contentUri, contentType, caption, isTokenGated, requiredToken } = req.body;
        const postId = uuidv4().replace(/-/g, '').slice(0, 44);
        const txResponse = await solanaService.buildCreatePostTx(wallet, contentUri, contentType, caption || '', isTokenGated, requiredToken);
        await supabase.from('posts').insert({
            id: postId,
            creator_wallet: wallet,
            content_uri: contentUri,
            content_type: contentType,
            caption,
            timestamp: new Date().toISOString(),
            is_token_gated: isTokenGated,
            required_token: requiredToken,
        });
        await supabase.rpc('increment_user_stat', { wallet_addr: wallet, stat_name: 'post_count' });
        await addJob('ai-analysis', { postId, contentUri, caption, creatorWallet: wallet });
        await addJob('notification', { type: 'new_post', postId, creatorWallet: wallet });
        await cacheService.invalidateUser(wallet);
        res.json({
            success: true,
            data: { ...txResponse, metadata: { postId } },
        });
    },
    async getPost(req, res) {
        const { postId } = req.params;
        const cached = await cacheService.getPost(postId);
        if (cached) {
            res.json({ success: true, data: cached });
            return;
        }
        const { data: post, error } = await supabase
            .from('posts')
            .select('*, users!posts_creator_wallet_fkey(*)')
            .eq('id', postId)
            .single();
        if (error || !post) {
            throw new AppError(404, 'NOT_FOUND', 'Post not found');
        }
        let isLiked = false;
        if (req.wallet) {
            const { data: like } = await supabase
                .from('likes')
                .select('user_wallet')
                .eq('post_id', postId)
                .eq('user_wallet', req.wallet)
                .single();
            isLiked = !!like;
        }
        const result = { ...post, isLiked };
        await cacheService.setPost(postId, result);
        res.json({ success: true, data: result });
    },
    async like(req, res) {
        const wallet = req.wallet;
        const { postId } = req.params;
        const { data: post } = await supabase
            .from('posts')
            .select('creator_wallet')
            .eq('id', postId)
            .single();
        if (!post) {
            throw new AppError(404, 'NOT_FOUND', 'Post not found');
        }
        if (post.creator_wallet === wallet) {
            throw new AppError(400, 'INVALID_ACTION', 'Cannot like your own post');
        }
        const txResponse = await solanaService.buildLikeTx(wallet, postId);
        await supabase.from('likes').insert({
            user_wallet: wallet,
            post_id: postId,
        });
        await supabase.from('posts').update({ likes: supabase.rpc('increment', { x: 1 }) }).eq('id', postId);
        await cacheService.invalidatePost(postId);
        await realtimeService.notifyLike(postId, wallet, post.creator_wallet);
        res.json({ success: true, data: txResponse });
    },
    async unlike(req, res) {
        const wallet = req.wallet;
        const { postId } = req.params;
        const txResponse = await solanaService.buildUnlikeTx(wallet, postId);
        await supabase
            .from('likes')
            .delete()
            .eq('user_wallet', wallet)
            .eq('post_id', postId);
        await supabase.from('posts').update({ likes: supabase.rpc('decrement', { x: 1 }) }).eq('id', postId);
        await cacheService.invalidatePost(postId);
        res.json({ success: true, data: txResponse });
    },
    async getComments(req, res) {
        const { postId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor;
        let query = supabase
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
            throw new AppError(500, 'DB_ERROR', 'Failed to fetch comments');
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
        const { data: post } = await supabase
            .from('posts')
            .select('creator_wallet')
            .eq('id', postId)
            .single();
        if (!post) {
            throw new AppError(404, 'NOT_FOUND', 'Post not found');
        }
        const commentId = uuidv4().replace(/-/g, '').slice(0, 44);
        const txResponse = await solanaService.buildCommentTx(wallet, postId, text);
        const { data: comment } = await supabase
            .from('comments')
            .insert({
            id: commentId,
            post_id: postId,
            commenter_wallet: wallet,
            text,
        })
            .select('*')
            .single();
        await supabase.from('posts').update({ comments: supabase.rpc('increment', { x: 1 }) }).eq('id', postId);
        await cacheService.invalidatePost(postId);
        await realtimeService.notifyComment(postId, comment, post.creator_wallet);
        res.json({
            success: true,
            data: { ...txResponse, metadata: { commentId } },
        });
    },
    async report(req, res) {
        const wallet = req.wallet;
        const { postId } = req.params;
        const { reason, description } = req.body;
        const { data: post } = await supabase
            .from('posts')
            .select('creator_wallet')
            .eq('id', postId)
            .single();
        if (!post) {
            throw new AppError(404, 'NOT_FOUND', 'Post not found');
        }
        await supabase.from('user_reports').insert({
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