export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface UserProfile {
  wallet: string;
  username: string | null;
  bio: string | null;
  profileImageUri: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: string | null;
  isVerified: boolean;
}

export interface UserWithRelation extends UserProfile {
  isFollowing?: boolean;
}

export type ContentType = "image" | "video" | "text" | "multi";

export interface Post {
  id: string;
  creatorWallet: string;
  contentUri: string;
  contentType: ContentType;
  caption: string | null;
  timestamp: string;
  likes: number;
  comments: number;
  tipsReceived: number;
  isTokenGated: boolean;
  requiredToken: string | null;
  llmDescription: string | null;
  autoTags: string[] | null;
  sceneType: string | null;
  mood: string | null;
  safetyScore: number | null;
  altText: string | null;
}

export interface FeedItem extends Post {
  creator: UserProfile;
  isLiked?: boolean;
  isFollowing?: boolean;
  hasAccess?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  commenterWallet: string;
  text: string;
  timestamp: string;
  commenter?: UserProfile;
}

export interface CreatorVault {
  totalEarned: number;
  withdrawn: number;
  subscribers: number;
  availableBalance: number;
}

export type TransactionType =
  | "tip"
  | "subscribe"
  | "post"
  | "follow"
  | "like";

export type TransactionStatus = "pending" | "confirmed" | "failed";

export interface Transaction {
  signature: string;
  type: TransactionType;
  fromWallet: string | null;
  toWallet: string | null;
  amount: number | null;
  postId: string | null;
  timestamp: string;
  status: TransactionStatus;
}

export interface SearchResult {
  postId: string;
  score: number;
  description?: string;
  creatorWallet?: string;
}

export interface SemanticSearchResponse {
  results: SearchResult[];
  expandedQuery: string;
}

export interface ModerationScores {
  nsfw: number;
  violence: number;
  hate: number;
  childSafety: number;
  spam: number;
  drugsWeapons: number;
}

export type ModerationVerdict = "allow" | "warn" | "block";

export interface ModerationResult {
  verdict: ModerationVerdict;
  scores: ModerationScores;
  maxScore: number;
  blockedCategory?: string;
  explanation: string;
  processingTimeMs: number;
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

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export type GateType = "token" | "nft" | "both";

export interface AccessRequirements {
  requiredToken?: string;
  minimumBalance?: number;
  requiredNftCollection?: string;
  gateType: GateType;
}

export interface AccessVerification {
  hasAccess: boolean;
  requirements?: AccessRequirements;
}

export interface AuthChallenge {
  message: string;
  expiresAt: number;
}

export interface AuthSession {
  token: string;
  wallet: string;
  user: UserProfile | null;
  expiresAt: number;
}

export interface PrivacyBalance {
  shielded: number;
  available: number;
  pending: number;
}

export interface PrivateTipRequest {
  creatorWallet: string;
  amount: number;
  postId?: string;
  isPrivate: true;
}

export interface PrivateTipReceived {
  id: string;
  amount: number;
  tx_signature: string;
  post_id: string | null;
  timestamp: string;
}

export interface PrivateTipSent {
  signature: string;
  to_wallet: string;
  amount: number;
  post_id: string | null;
  timestamp: string;
  status: TransactionStatus;
}

export interface PrivacySettings {
  wallet: string;
  default_private_tips: boolean;
}

export interface PrivacyPoolInfo {
  totalDeposits: number;
  totalWithdrawals: number;
  activeCommitments: number;
}

export interface ShieldRequest {
  amount: number;
}

// Chat types

export type ChatGateType = "token" | "nft" | "both" | "open";

export interface ChatRoom {
  id: string;
  creator_wallet: string;
  name: string;
  description: string | null;
  required_token: string | null;
  minimum_balance: number;
  required_nft_collection: string | null;
  gate_type: ChatGateType;
  max_members: number;
  is_active: boolean;
  created_at: string;
  chat_members?: { count: number }[];
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_wallet: string;
  content: string;
  created_at: string;
  users?: {
    wallet: string;
    username: string | null;
    profile_image_uri: string | null;
  };
}

// Airdrop types

export type AirdropType = "spl_token" | "cnft";
export type AirdropAudienceType =
  | "followers"
  | "tippers"
  | "subscribers"
  | "token_holders"
  | "custom";
export type AirdropStatus =
  | "draft"
  | "funded"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface AirdropCampaign {
  id: string;
  creator_wallet: string;
  name: string;
  description: string | null;
  type: AirdropType;
  token_mint: string | null;
  amount_per_recipient: number | null;
  metadata_uri: string | null;
  collection_mint: string | null;
  audience_type: AirdropAudienceType;
  audience_filter: Record<string, unknown> | null;
  status: AirdropStatus;
  total_recipients: number;
  successful_transfers: number;
  failed_transfers: number;
  escrow_pubkey: string | null;
  fund_tx_signature: string | null;
  created_at: string;
  completed_at: string | null;
}

export type AirdropRecipientStatus = "pending" | "sent" | "failed";

export interface AirdropRecipient {
  id: string;
  campaign_id: string;
  wallet: string;
  status: AirdropRecipientStatus;
  tx_signature: string | null;
  error_message: string | null;
  created_at: string;
}
