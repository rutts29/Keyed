"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchController = void 0;
const supabase_js_1 = require("../config/supabase.js");
const ai_service_js_1 = require("../services/ai.service.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.searchController = {
    async semanticSearch(req, res) {
        const { query, limit, rerank } = req.body;
        const aiResults = await ai_service_js_1.aiService.semanticSearch(query, limit, rerank);
        if (aiResults.results.length === 0) {
            res.json({
                success: true,
                data: { posts: [], expandedQuery: aiResults.expandedQuery },
            });
            return;
        }
        const postIds = aiResults.results.map(r => r.post_id);
        const { data: posts, error } = await supabase_js_1.supabase
            .from('posts')
            .select('*, users!posts_creator_wallet_fkey(*)')
            .in('id', postIds);
        if (error) {
            throw new errorHandler_js_1.AppError(500, 'DB_ERROR', 'Failed to fetch posts');
        }
        const scoreMap = new Map(aiResults.results.map(r => [r.post_id, r.score]));
        const sortedPosts = posts
            .map(post => ({ ...post, relevanceScore: scoreMap.get(post.id) || 0 }))
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
        res.json({
            success: true,
            data: {
                posts: sortedPosts,
                expandedQuery: aiResults.expandedQuery,
            },
        });
    },
    async suggest(req, res) {
        const q = req.query.q || '';
        if (q.length < 2) {
            res.json({ success: true, data: { suggestions: [] } });
            return;
        }
        const { data: tagMatches } = await supabase_js_1.supabase
            .from('posts')
            .select('auto_tags')
            .not('auto_tags', 'is', null)
            .limit(100);
        const allTags = new Set();
        tagMatches?.forEach(p => {
            p.auto_tags?.forEach((tag) => {
                if (tag.toLowerCase().includes(q.toLowerCase())) {
                    allTags.add(tag);
                }
            });
        });
        const suggestions = Array.from(allTags).slice(0, 10);
        res.json({
            success: true,
            data: { suggestions },
        });
    },
    async searchUsers(req, res) {
        const q = req.query.q || '';
        const limit = parseInt(req.query.limit) || 20;
        if (q.length < 2) {
            res.json({ success: true, data: { users: [] } });
            return;
        }
        const { data: users, error } = await supabase_js_1.supabase
            .from('users')
            .select('*')
            .ilike('username', `%${q}%`)
            .limit(limit);
        if (error) {
            throw new errorHandler_js_1.AppError(500, 'DB_ERROR', 'Failed to search users');
        }
        res.json({
            success: true,
            data: { users: users || [] },
        });
    },
};
//# sourceMappingURL=search.controller.js.map