/**
 * Candidate hydrators — enrich candidates with additional data.
 *
 * Mirrors x-algorithm's hydrator pattern: after sourcing, candidates
 * may need additional fields populated from the database.
 *
 * @see https://github.com/xai-org/x-algorithm/tree/main/home-mixer/candidate_hydrators
 */

import type { Hydrator, QueryHydrator } from './interfaces.js';
import type { FeedQuery, FeedCandidate } from './types.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getFollowingWallets } from '../utils/helpers.js';

/**
 * UserContextHydrator — populates the query with user data.
 * This is the first step in the pipeline: fetch following list,
 * liked posts, seen posts, and blocked users.
 *
 * Mirrors x-algorithm's query hydration stage.
 */
export class UserContextHydrator implements QueryHydrator<FeedQuery> {
  name = 'UserContextHydrator';

  enable(): boolean {
    return true;
  }

  async hydrate(query: FeedQuery): Promise<Partial<FeedQuery>> {
    const [following, likes, seen] = await Promise.all([
      getFollowingWallets(query.userWallet),
      this.fetchLikedPostIds(query.userWallet),
      this.fetchSeenPostIds(query.userWallet),
    ]);

    return {
      followingWallets: following,
      likedPostIds: likes,
      seenPostIds: seen,
      blockedWallets: [], // TODO: implement blocked users table
      mutedKeywords: [], // TODO: implement muted keywords
    };
  }

  private async fetchLikedPostIds(wallet: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_wallet', wallet)
      .order('timestamp', { ascending: false })
      .limit(50);
    if (error) {
      logger.error({ error, wallet }, 'Failed to fetch liked post IDs');
    }
    return data?.map((l) => l.post_id) || [];
  }

  private async fetchSeenPostIds(wallet: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('interactions')
      .select('post_id')
      .eq('user_wallet', wallet)
      .eq('interaction_type', 'view')
      .order('timestamp', { ascending: false })
      .limit(200);
    if (error) {
      logger.error({ error, wallet }, 'Failed to fetch seen post IDs');
    }
    return data?.map((i) => i.post_id) || [];
  }
}

/**
 * CoreDataHydrator — enriches out-of-network candidates with full post data.
 *
 * OON candidates from the AI service may only have post_id and scores.
 * This hydrator fetches the full post record from Supabase.
 */
export class CoreDataHydrator implements Hydrator<FeedQuery, FeedCandidate> {
  name = 'CoreDataHydrator';

  enable(): boolean {
    return true;
  }

  async hydrate(_query: FeedQuery, candidates: FeedCandidate[]): Promise<FeedCandidate[]> {
    // Find candidates missing core data (no timestamp means not hydrated)
    const needsHydration = candidates.filter((c) => !c.timestamp);
    if (needsHydration.length === 0) return candidates;

    const ids = needsHydration.map((c) => c.postId);

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .in('id', ids);

    if (error) {
      logger.error({ error, hydrator: this.name }, 'Core data hydration failed');
      return candidates;
    }

    const postMap = new Map((posts || []).map((p) => [p.id, p]));

    return candidates.map((c) => {
      if (c.timestamp) return c; // Already hydrated
      const post = postMap.get(c.postId);
      if (!post) return c; // Post not found — will be filtered later

      return {
        ...c,
        timestamp: post.timestamp,
        contentUri: post.content_uri,
        caption: post.caption || null,
        likes: post.likes || 0,
        comments: post.comments || 0,
        tipsReceived: post.tips_received || 0,
        description: c.description || post.llm_description || null,
        autoTags: c.autoTags || post.auto_tags || null,
        sceneType: c.sceneType || post.scene_type || null,
        mood: c.mood || post.mood || null,
        isTokenGated: post.is_token_gated || false,
        requiredToken: post.required_token || null,
      };
    });
  }
}
