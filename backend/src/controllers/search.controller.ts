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
   * AI-powered semantic search
   * Expands query and searches by meaning, not just keywords
   */
  async semanticSearch(req: AuthenticatedRequest, res: Response) {
    const { query, limit = 20, rerank = true } = req.body;
    
    if (!query || query.trim().length < 2) {
      res.json({
        success: true,
        data: { posts: [], expandedQuery: query || '' },
      });
      return;
    }
    
    const searchResults = await aiService.semanticSearch(query, limit, rerank);
    
    logger.debug({ 
      query, 
      resultCount: searchResults.results.length, 
      expandedQuery: searchResults.expandedQuery 
    }, 'Semantic search completed');
    
    if (searchResults.results.length === 0) {
      res.json({
        success: true,
        data: { posts: [], expandedQuery: searchResults.expandedQuery },
      });
      return;
    }
    
    // Fetch full post data for the results
    const postIds = searchResults.results.map(r => r.postId);
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*, users!posts_creator_wallet_fkey(*)')
      .in('id', postIds);
    
    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch posts');
    }
    
    // Sort posts by relevance score and add score to response
    const scoreMap = new Map(searchResults.results.map(r => [r.postId, r.score]));
    const sortedPosts = posts
      .map(post => ({ 
        ...post, 
        relevanceScore: scoreMap.get(post.id) || 0,
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Add like status if user is authenticated
    let enrichedPosts = sortedPosts;
    if (req.wallet) {
      enrichedPosts = await enrichPostsWithLikeStatus(sortedPosts, req.wallet);
    }
    
    res.json({
      success: true,
      data: {
        posts: enrichedPosts,
        expandedQuery: searchResults.expandedQuery,
        totalResults: searchResults.results.length,
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
