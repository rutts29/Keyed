"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersController = void 0;
const supabase_js_1 = require("../config/supabase.js");
const cache_service_js_1 = require("../services/cache.service.js");
const solana_service_js_1 = require("../services/solana.service.js");
const realtime_service_js_1 = require("../services/realtime.service.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.usersController = {
    async getProfile(req, res) {
        const { wallet } = req.params;
        const cached = await cache_service_js_1.cacheService.getUser(wallet);
        if (cached) {
            res.json({ success: true, data: cached });
            return;
        }
        const { data: user, error } = await supabase_js_1.supabase
            .from('users')
            .select('*')
            .eq('wallet', wallet)
            .single();
        if (error || !user) {
            throw new errorHandler_js_1.AppError(404, 'NOT_FOUND', 'User not found');
        }
        await cache_service_js_1.cacheService.setUser(wallet, user);
        res.json({ success: true, data: user });
    },
    async createOrUpdateProfile(req, res) {
        const wallet = req.wallet;
        const { username, bio, profileImageUri } = req.body;
        if (username) {
            const { data: existing } = await supabase_js_1.supabase
                .from('users')
                .select('wallet')
                .eq('username', username)
                .neq('wallet', wallet)
                .single();
            if (existing) {
                throw new errorHandler_js_1.AppError(400, 'USERNAME_TAKEN', 'Username is already taken');
            }
        }
        const txResponse = await solana_service_js_1.solanaService.buildCreateProfileTx(wallet, username || '', bio || '', profileImageUri || '');
        await supabase_js_1.supabase.from('users').upsert({
            wallet,
            username,
            bio,
            profile_image_uri: profileImageUri,
            last_synced: new Date().toISOString(),
        });
        await cache_service_js_1.cacheService.invalidateUser(wallet);
        res.json({ success: true, data: txResponse });
    },
    async getUserPosts(req, res) {
        const { wallet } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor;
        let query = supabase_js_1.supabase
            .from('posts')
            .select('*')
            .eq('creator_wallet', wallet)
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (cursor) {
            query = query.lt('timestamp', cursor);
        }
        const { data: posts, error } = await query;
        if (error) {
            throw new errorHandler_js_1.AppError(500, 'DB_ERROR', 'Failed to fetch posts');
        }
        const nextCursor = posts.length === limit ? posts[posts.length - 1].timestamp : null;
        res.json({
            success: true,
            data: { posts, nextCursor },
        });
    },
    async getFollowers(req, res) {
        const { wallet } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor;
        let query = supabase_js_1.supabase
            .from('follows')
            .select('follower_wallet, timestamp')
            .eq('following_wallet', wallet)
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (cursor) {
            query = query.lt('timestamp', cursor);
        }
        const { data: follows, error } = await query;
        if (error) {
            throw new errorHandler_js_1.AppError(500, 'DB_ERROR', 'Failed to fetch followers');
        }
        const wallets = follows.map(f => f.follower_wallet);
        const { data: users } = await supabase_js_1.supabase
            .from('users')
            .select('*')
            .in('wallet', wallets);
        const nextCursor = follows.length === limit ? follows[follows.length - 1].timestamp : null;
        res.json({
            success: true,
            data: { followers: users || [], nextCursor },
        });
    },
    async getFollowing(req, res) {
        const { wallet } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor;
        let query = supabase_js_1.supabase
            .from('follows')
            .select('following_wallet, timestamp')
            .eq('follower_wallet', wallet)
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (cursor) {
            query = query.lt('timestamp', cursor);
        }
        const { data: follows, error } = await query;
        if (error) {
            throw new errorHandler_js_1.AppError(500, 'DB_ERROR', 'Failed to fetch following');
        }
        const wallets = follows.map(f => f.following_wallet);
        const { data: users } = await supabase_js_1.supabase
            .from('users')
            .select('*')
            .in('wallet', wallets);
        const nextCursor = follows.length === limit ? follows[follows.length - 1].timestamp : null;
        res.json({
            success: true,
            data: { following: users || [], nextCursor },
        });
    },
    async follow(req, res) {
        const wallet = req.wallet;
        const { wallet: targetWallet } = req.params;
        if (wallet === targetWallet) {
            throw new errorHandler_js_1.AppError(400, 'INVALID_ACTION', 'Cannot follow yourself');
        }
        const txResponse = await solana_service_js_1.solanaService.buildFollowTx(wallet, targetWallet);
        await supabase_js_1.supabase.from('follows').insert({
            follower_wallet: wallet,
            following_wallet: targetWallet,
        });
        await supabase_js_1.supabase.rpc('increment_user_stat', { wallet_addr: wallet, stat_name: 'following_count' });
        await supabase_js_1.supabase.rpc('increment_user_stat', { wallet_addr: targetWallet, stat_name: 'follower_count' });
        await cache_service_js_1.cacheService.invalidateFollowing(wallet);
        await cache_service_js_1.cacheService.invalidateUser(wallet);
        await cache_service_js_1.cacheService.invalidateUser(targetWallet);
        await realtime_service_js_1.realtimeService.notifyFollow(wallet, targetWallet);
        res.json({ success: true, data: txResponse });
    },
    async unfollow(req, res) {
        const wallet = req.wallet;
        const { wallet: targetWallet } = req.params;
        const txResponse = await solana_service_js_1.solanaService.buildUnfollowTx(wallet, targetWallet);
        await supabase_js_1.supabase
            .from('follows')
            .delete()
            .eq('follower_wallet', wallet)
            .eq('following_wallet', targetWallet);
        await supabase_js_1.supabase.rpc('increment_user_stat', { wallet_addr: wallet, stat_name: 'following_count', delta: -1 });
        await supabase_js_1.supabase.rpc('increment_user_stat', { wallet_addr: targetWallet, stat_name: 'follower_count', delta: -1 });
        await cache_service_js_1.cacheService.invalidateFollowing(wallet);
        await cache_service_js_1.cacheService.invalidateUser(wallet);
        await cache_service_js_1.cacheService.invalidateUser(targetWallet);
        res.json({ success: true, data: txResponse });
    },
};
//# sourceMappingURL=users.controller.js.map