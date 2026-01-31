/**
 * Candidate sources — fetch raw posts from different origins.
 *
 * Mirrors x-algorithm's two primary sources:
 *   Thunder (in-network)  -> InNetworkSource (posts from followed users)
 *   Phoenix (out-of-network) -> OutOfNetworkSource (AI-retrieved posts)
 *
 * Plus a TrendingSource for explore-style discovery.
 *
 * @see https://github.com/xai-org/x-algorithm/tree/main/home-mixer/sources
 */

import type { Source } from './interfaces.js';
import type { FeedQuery, FeedCandidate } from './types.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

function getAIServiceHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.AI_SERVICE_API_KEY) {
    headers['X-Internal-API-Key'] = env.AI_SERVICE_API_KEY;
  }
  return headers;
}

function rowToCandidate(row: any, source: FeedCandidate['source']): FeedCandidate {
  return {
    postId: row.id,
    creatorWallet: row.creator_wallet,
    timestamp: row.timestamp,
    contentUri: row.content_uri,
    caption: row.caption || null,
    likes: row.likes || 0,
    comments: row.comments || 0,
    tipsReceived: row.tips_received || 0,
    description: row.llm_description || null,
    autoTags: row.auto_tags || null,
    sceneType: row.scene_type || null,
    mood: row.mood || null,
    source,
    engagementScores: null,
    finalScore: 0,
    isTokenGated: row.is_token_gated || false,
    requiredToken: row.required_token || null,
  };
}

/**
 * InNetworkSource — fetches recent posts from followed accounts.
 *
 * Equivalent to x-algorithm's Thunder source: sub-millisecond lookups
 * for in-network content. We use Supabase + Redis cache here.
 */
export class InNetworkSource implements Source<FeedQuery, FeedCandidate> {
  name = 'InNetworkSource';

  enable(query: FeedQuery): boolean {
    return query.followingWallets.length > 0;
  }

  async getCandidates(query: FeedQuery): Promise<FeedCandidate[]> {
    const feedWallets = query.followingWallets;

    let dbQuery = supabase
      .from('posts')
      .select('*')
      .in('creator_wallet', feedWallets)
      .order('timestamp', { ascending: false })
      .limit(query.limit * 3);

    if (query.cursor) {
      dbQuery = dbQuery.lt('timestamp', query.cursor);
    }

    const { data: posts, error } = await dbQuery;

    if (error) {
      logger.error({ error, source: this.name }, 'Failed to fetch in-network posts');
      return [];
    }

    return (posts || []).map((row) => rowToCandidate(row, 'in_network'));
  }
}

/**
 * OutOfNetworkSource — retrieves ML-discovered posts via the AI service's
 * two-tower retrieval endpoint.
 *
 * Equivalent to x-algorithm's Phoenix Retrieval source.
 */
export class OutOfNetworkSource implements Source<FeedQuery, FeedCandidate> {
  name = 'OutOfNetworkSource';

  enable(query: FeedQuery): boolean {
    return true; // Always enabled for discovery
  }

  async getCandidates(query: FeedQuery): Promise<FeedCandidate[]> {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/pipeline/retrieve`, {
        method: 'POST',
        headers: getAIServiceHeaders(),
        body: JSON.stringify({
          user_wallet: query.userWallet,
          liked_post_ids: query.likedPostIds,
          following_wallets: query.followingWallets,
          exclude_ids: query.seenPostIds,
          limit: query.limit * 3,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        logger.error({ status: response.status, body }, 'Out-of-network retrieval failed');
        return [];
      }

      const data = (await response.json()) as { candidates?: Array<any> };
      const candidates: FeedCandidate[] = [];

      for (const c of data.candidates || []) {
        candidates.push({
          postId: c.post_id,
          creatorWallet: c.creator_wallet,
          timestamp: '', // Will be hydrated
          contentUri: '',
          caption: null,
          likes: 0,
          comments: 0,
          tipsReceived: 0,
          description: c.description || null,
          autoTags: c.tags || null,
          sceneType: c.scene_type || null,
          mood: c.mood || null,
          source: 'out_of_network',
          engagementScores: c.scores || null,
          finalScore: c.final_score || 0,
          isTokenGated: false,
          requiredToken: null,
        });
      }

      return candidates;
    } catch (error) {
      logger.error({ error, source: this.name }, 'Out-of-network retrieval error');
      return [];
    }
  }
}

/**
 * TrendingSource — fetches globally trending posts from the last 24-48 hours.
 * Used to inject popular content into the feed for new users or variety.
 */
export class TrendingSource implements Source<FeedQuery, FeedCandidate> {
  name = 'TrendingSource';

  enable(query: FeedQuery): boolean {
    // Enable for cold-start users (no likes) or always for mix-in
    return query.likedPostIds.length < 5;
  }

  async getCandidates(query: FeedQuery): Promise<FeedCandidate[]> {
    const oneDayAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .gte('timestamp', oneDayAgo)
      .order('likes', { ascending: false })
      .limit(query.limit);

    if (error) {
      logger.error({ error, source: this.name }, 'Failed to fetch trending posts');
      return [];
    }

    return (posts || []).map((row) => rowToCandidate(row, 'trending'));
  }
}
