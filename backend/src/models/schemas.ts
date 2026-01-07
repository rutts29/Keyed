import { z } from 'zod';

export const UserProfileSchema = z.object({
  wallet: z.string(),
  username: z.string().nullable(),
  bio: z.string().nullable(),
  profile_image_uri: z.string().nullable(),
  follower_count: z.number(),
  following_count: z.number(),
  post_count: z.number(),
  created_at: z.string().nullable(),
  is_verified: z.boolean(),
});

export const PostSchema = z.object({
  id: z.string(),
  creator_wallet: z.string(),
  content_uri: z.string(),
  content_type: z.enum(['image', 'video', 'text', 'multi']),
  caption: z.string().nullable(),
  timestamp: z.string(),
  likes: z.number(),
  comments: z.number(),
  tips_received: z.number(),
  is_token_gated: z.boolean(),
  required_token: z.string().nullable(),
  llm_description: z.string().nullable(),
  auto_tags: z.array(z.string()).nullable(),
  scene_type: z.string().nullable(),
  mood: z.string().nullable(),
  safety_score: z.number().nullable(),
  alt_text: z.string().nullable(),
});

export const CommentSchema = z.object({
  id: z.string(),
  post_id: z.string(),
  commenter_wallet: z.string(),
  text: z.string(),
  timestamp: z.string(),
});

export const TransactionSchema = z.object({
  signature: z.string(),
  type: z.enum(['tip', 'subscribe', 'post', 'follow', 'like']),
  from_wallet: z.string().nullable(),
  to_wallet: z.string().nullable(),
  amount: z.number().nullable(),
  post_id: z.string().nullable(),
  timestamp: z.string(),
  status: z.enum(['pending', 'confirmed', 'failed']),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
