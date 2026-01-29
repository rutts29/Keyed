import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  wallet?: string;
}

export interface UserProfile {
  wallet: string;
  username: string | null;
  bio: string | null;
  profileImageUri: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: Date | null;
  isVerified: boolean;
}

export interface Post {
  id: string;
  creatorWallet: string;
  contentUri: string;
  contentType: 'image' | 'video' | 'text' | 'multi';
  caption: string | null;
  timestamp: Date;
  likes: number;
  comments: number;
  tipsReceived: bigint;
  isTokenGated: boolean;
  requiredToken: string | null;
  llmDescription: string | null;
  autoTags: string[] | null;
  sceneType: string | null;
  mood: string | null;
  safetyScore: number | null;
  altText: string | null;
}

export interface Comment {
  id: string;
  postId: string;
  commenterWallet: string;
  text: string;
  timestamp: Date;
}

export interface Follow {
  followerWallet: string;
  followingWallet: string;
  timestamp: Date;
}

export interface Like {
  userWallet: string;
  postId: string;
  timestamp: Date;
}

export interface Transaction {
  signature: string;
  type: 'tip' | 'subscribe' | 'post' | 'follow' | 'like';
  fromWallet: string | null;
  toWallet: string | null;
  amount: bigint | null;
  postId: string | null;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface ModerationResult {
  verdict: 'allow' | 'warn' | 'block';
  scores: {
    nsfw: number;
    violence: number;
    hate: number;
    childSafety: number;
    spam: number;
    drugsWeapons: number;
  };
  maxScore: number;
  blockedCategory?: string;
  explanation: string;
  processingTimeMs: number;
  violationId?: string;
}

export interface AIAnalysis {
  description: string;
  tags: string[];
  sceneType: string;
  objects: string[];
  mood: string;
  colors: string[];
  safetyScore: number;
  altText: string;
  embedding?: number[];
}

export interface TransactionResponse {
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
  metadata?: {
    postId?: string;
    aiAnalysis?: AIAnalysis;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Semantic Search types
export interface SearchResultItem {
  postId: string;
  score: number;
  description?: string;
  creatorWallet?: string;
}

export interface SemanticSearchResult {
  results: SearchResultItem[];
  expandedQuery: string;
}

// Recommendation types
export interface RecommendationItem {
  postId: string;
  score: number;
  reason?: string;
}

export interface RecommendationResult {
  recommendations: RecommendationItem[];
  tasteProfile: string | null;
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'tip' | 'new_post';

export interface Notification {
  id: string;
  recipient: string;
  type: NotificationType;
  fromWallet: string | null;
  postId: string | null;
  commentId: string | null;
  amount: number | null;
  read: boolean;
  createdAt: Date;
}

export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export interface FeedItem extends Post {
  creator: UserProfile;
  isLiked?: boolean;
  isFollowing?: boolean;
}
