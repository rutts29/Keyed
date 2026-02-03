import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { aiService } from '../services/ai.service.js';
import { cacheService } from '../services/cache.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { enrichPostsWithLikeStatus } from '../utils/helpers.js';

export const searchController = {
  /**
   * Hybrid search: combines fast keyword search with semantic search
   * Prioritizes exact matches, then adds semantic results
   */
  async semanticSearch(req: AuthenticatedRequest, res: Response) {
    const { query, limit = 20, rerank = true } = req.body;

    if (!query || query.trim().length < 2) {
      res.json({
        success: true,
        data: { posts: [], expandedQuery: query || '', results: [] },
      });
      return;
    }

    const searchTerm = query.trim().toLowerCase();

    // 1. Fast keyword search in Supabase (caption and tags)
    const { data: keywordPosts } = await supabase
      .from('posts')
      .select('*, users!posts_creator_wallet_fkey(*)')
      .or(`caption.ilike.%${searchTerm}%,auto_tags.cs.{${searchTerm}}`)
      .order('timestamp', { ascending: false })
      .limit(limit);

    const keywordPostIds = new Set(keywordPosts?.map(p => p.id) || []);

    // 1b. Search users by username or wallet address
    const { data: matchingUsers } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${searchTerm}%,wallet.ilike.%${searchTerm}%`)
      .order('follower_count', { ascending: false })
      .limit(10);

    // 2. Semantic search (runs in parallel conceptually, but we need keyword results first)
    let semanticResults: { postId: string; score: number; description?: string; creatorWallet?: string }[] = [];
    let expandedQuery = query;

    try {
      const searchResults = await aiService.semanticSearch(query, limit, rerank);
      semanticResults = searchResults.results;
      expandedQuery = searchResults.expandedQuery || query;

      logger.debug({
        query,
        keywordCount: keywordPosts?.length || 0,
        semanticCount: semanticResults.length,
        expandedQuery
      }, 'Hybrid search completed');
    } catch (error) {
      // Semantic search failed, fall back to keyword only
      logger.warn({ error, query }, 'Semantic search failed, using keyword results only');
    }

    // 3. Merge results: keyword matches get boosted score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultMap = new Map<string, { post: any; score: number; description?: string }>();

    // Add keyword matches with high score (1.0 for exact matches)
    keywordPosts?.forEach(post => {
      const isExactMatch = post.caption?.toLowerCase().includes(searchTerm);
      resultMap.set(post.id, {
        post,
        score: isExactMatch ? 1.0 : 0.9,
        description: post.caption,
      });
    });

    // Add semantic results (fetch post data if not already in results)
    const missingIds = semanticResults
      .filter(r => !resultMap.has(r.postId))
      .map(r => r.postId);

    if (missingIds.length > 0) {
      const { data: semanticPosts } = await supabase
        .from('posts')
        .select('*, users!posts_creator_wallet_fkey(*)')
        .in('id', missingIds);

      semanticPosts?.forEach(post => {
        const semanticResult = semanticResults.find(r => r.postId === post.id);
        resultMap.set(post.id, {
          post,
          score: semanticResult?.score || 0.5,
          description: semanticResult?.description || post.caption,
        });
      });
    }

    // For posts that are in both, boost the score
    semanticResults.forEach(r => {
      if (keywordPostIds.has(r.postId)) {
        const existing = resultMap.get(r.postId);
        if (existing) {
          // Boost score for posts found by both methods
          existing.score = Math.min(1.0, existing.score + 0.1);
        }
      }
    });

    // Sort by score and convert to response format
    const sortedResults = Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Format for frontend (returns both posts array and results array for compatibility)
    const posts = sortedResults.map(r => ({
      ...r.post,
      relevanceScore: r.score,
    }));

    const results = sortedResults.map(r => ({
      postId: r.post.id as string,
      score: r.score,
      description: r.description,
      creatorWallet: r.post.creator_wallet as string,
    }));

    // Add like status if user is authenticated
    let enrichedPosts = posts;
    if (req.wallet) {
      enrichedPosts = await enrichPostsWithLikeStatus(posts, req.wallet);
    }

    res.json({
      success: true,
      data: {
        posts: enrichedPosts,
        results,
        users: matchingUsers || [],
        expandedQuery,
        totalResults: sortedResults.length,
      },
    });
  },

  /**
   * Search autocomplete suggestions based on existing tags
   * Cached for 2 minutes per prefix to reduce database load
   */
  async suggest(req: AuthenticatedRequest, res: Response) {
    const q = (req.query.q as string) || '';

    if (q.length < 2) {
      res.json({ success: true, data: { suggestions: [] } });
      return;
    }

    // Check cache first
    const cached = await cacheService.getSuggestions(q);
    if (cached) {
      res.json({ success: true, data: { suggestions: cached } });
      return;
    }

    // Get tags from posts that match the query
    const { data: tagMatches } = await supabase
      .from('posts')
      .select('auto_tags')
      .not('auto_tags', 'is', null)
      .limit(100);

    const allTags = new Set<string>();
    tagMatches?.forEach(p => {
      p.auto_tags?.forEach((tag: string) => {
        if (tag.toLowerCase().includes(q.toLowerCase())) {
          allTags.add(tag);
        }
      });
    });

    // Also search for usernames
    const { data: users } = await supabase
      .from('users')
      .select('username')
      .ilike('username', `${q}%`)
      .limit(5);

    const suggestions = [
      ...Array.from(allTags).slice(0, 10),
      ...(users?.map(u => `@${u.username}`) || []),
    ];

    // Cache the suggestions
    await cacheService.setSuggestions(q, suggestions);

    res.json({
      success: true,
      data: { suggestions },
    });
  },

  /**
   * Search users by username
   */
  async searchUsers(req: AuthenticatedRequest, res: Response) {
    const q = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (q.length < 2) {
      res.json({ success: true, data: { users: [] } });
      return;
    }
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', `%${q}%`)
      .order('follower_count', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to search users');
    }
    
    res.json({
      success: true,
      data: { users: users || [] },
    });
  },

  /**
   * Search posts by tags
   */
  async searchByTag(req: AuthenticatedRequest, res: Response) {
    const tag = req.query.tag as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;
    
    if (!tag) {
      res.json({ success: true, data: { posts: [], nextCursor: null } });
      return;
    }
    
    let query = supabase
      .from('posts')
      .select('*, users!posts_creator_wallet_fkey(*)')
      .contains('auto_tags', [tag])
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (cursor) {
      query = query.lt('timestamp', cursor);
    }
    
    const { data: posts, error } = await query;
    
    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to search by tag');
    }
    
    let enrichedPosts = posts;
    if (req.wallet) {
      enrichedPosts = await enrichPostsWithLikeStatus(posts, req.wallet);
    }
    
    const nextCursor = posts.length === limit ? posts[posts.length - 1].timestamp : null;
    
    res.json({
      success: true,
      data: { posts: enrichedPosts, nextCursor },
    });
  },
};
