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
  subscriptionPrice: number | null;
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
  txSignature: string;
  postId: string | null;
  timestamp: string;
}

export interface PrivateTipSent {
  signature: string;
  toWallet: string;
  amount: number;
  postId: string | null;
  timestamp: string;
  status: TransactionStatus;
}

export interface PrivacySettings {
  wallet: string;
  defaultPrivateTips: boolean;
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
  creatorWallet: string;
  name: string;
  description: string | null;
  requiredToken: string | null;
  minimumBalance: number;
  requiredNftCollection: string | null;
  gateType: ChatGateType;
  maxMembers: number;
  isActive: boolean;
  createdAt: string;
  chatMembers?: { count: number }[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderWallet: string;
  content: string;
  createdAt: string;
  users?: {
    wallet: string;
    username: string | null;
    profileImageUri: string | null;
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
  creatorWallet: string;
  name: string;
  description: string | null;
  type: AirdropType;
  tokenMint: string | null;
  amountPerRecipient: number | null;
  metadataUri: string | null;
  collectionMint: string | null;
  audienceType: AirdropAudienceType;
  audienceFilter: Record<string, unknown> | null;
  status: AirdropStatus;
  totalRecipients: number;
  successfulTransfers: number;
  failedTransfers: number;
  escrowPubkey: string | null;
  fundTxSignature: string | null;
  createdAt: string;
  completedAt: string | null;
}

export type AirdropRecipientStatus = "pending" | "sent" | "failed";

export interface AirdropRecipient {
  id: string;
  campaignId: string;
  wallet: string;
  status: AirdropRecipientStatus;
  txSignature: string | null;
  errorMessage: string | null;
  createdAt: string;
}
