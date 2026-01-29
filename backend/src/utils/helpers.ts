import { createHash, randomBytes } from 'crypto';
import imageHash from 'imghash';
import { logger } from './logger.js';
import { supabase } from '../config/supabase.js';
import { cacheService } from '../services/cache.service.js';

/**
 * Generate a cryptographically secure random nonce for authentication challenges.
 * Uses crypto.randomBytes() instead of Math.random() for security.
 */
export function generateNonce(length = 32): string {
  return randomBytes(Math.ceil(length * 0.75))
    .toString('base64url')
    .slice(0, length);
}

export function generateChallengeMessage(wallet: string, nonce: string): string {
  const timestamp = Date.now();
  return `Sign this message to authenticate with SolShare.\n\nWallet: ${wallet}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

/**
 * Compute a perceptual hash (pHash) for an image.
 * Unlike cryptographic hashes, perceptual hashes remain similar for visually similar images,
 * making them effective for detecting modified versions of blocked content.
 * 
 * Falls back to SHA-256 if perceptual hashing fails (e.g., invalid image format).
 */
export async function hashImage(buffer: Buffer): Promise<string> {
  try {
    // Compute 16-bit perceptual hash for good balance of accuracy and size
    const hash = await imageHash.hash(buffer, 16);
    return hash;
  } catch (error) {
    // Log the error for diagnosability before falling back
    logger.warn({ 
      err: error, 
      bufferSize: buffer.length 
    }, 'Perceptual hash failed, falling back to SHA-256');
    // Fallback to SHA-256 for non-image files or corrupted images
    return createHash('sha256').update(buffer).digest('hex');
  }
}

/**
 * Fetch the list of wallets a user is following, using cache when available.
 */
export async function getFollowingWallets(wallet: string): Promise<string[]> {
  let following = await cacheService.getFollowing(wallet);
  if (!following) {
    const { data } = await supabase
      .from('follows')
      .select('following_wallet')
      .eq('follower_wallet', wallet);
    following = data?.map(f => f.following_wallet) || [];
    await cacheService.setFollowing(wallet, following);
  }
  return following;
}

/**
 * Enrich an array of posts with `isLiked` status for a given wallet.
 */
export async function enrichPostsWithLikeStatus<T extends { id: string }>(
  posts: T[],
  wallet: string
): Promise<(T & { isLiked: boolean })[]> {
  const postIds = posts.map(p => p.id);
  if (postIds.length === 0) return posts.map(p => ({ ...p, isLiked: false }));
  const { data: likes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_wallet', wallet)
    .in('post_id', postIds);
  const likedSet = new Set(likes?.map(l => l.post_id) || []);
  return posts.map(post => ({ ...post, isLiked: likedSet.has(post.id) }));
}
