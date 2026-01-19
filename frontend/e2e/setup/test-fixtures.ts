import type {
  UserProfile,
  Post,
  FeedItem,
  Comment,
  PrivacyBalance,
  Transaction,
  SearchResult,
  CreatorVault,
} from "@/types";
import { TEST_WALLETS } from "./mock-wallet";

// ============================================================================
// Test Users
// ============================================================================

export const testUsers: Record<string, UserProfile> = {
  creator: {
    wallet: TEST_WALLETS.creator.address,
    username: "testcreator",
    bio: "I create amazing content on SolShare",
    profileImageUri: "https://picsum.photos/seed/creator/200",
    followerCount: 1250,
    followingCount: 42,
    postCount: 87,
    createdAt: "2024-01-15T10:00:00Z",
    isVerified: true,
  },
  tipper: {
    wallet: TEST_WALLETS.tipper.address,
    username: "generoustipper",
    bio: "Supporting creators I love",
    profileImageUri: "https://picsum.photos/seed/tipper/200",
    followerCount: 320,
    followingCount: 150,
    postCount: 12,
    createdAt: "2024-02-20T14:30:00Z",
    isVerified: false,
  },
  viewer: {
    wallet: TEST_WALLETS.viewer.address,
    username: "newviewer",
    bio: null,
    profileImageUri: null,
    followerCount: 5,
    followingCount: 25,
    postCount: 0,
    createdAt: "2024-06-01T08:00:00Z",
    isVerified: false,
  },
};

// ============================================================================
// Test Posts
// ============================================================================

export const testPosts: Post[] = [
  {
    id: "post-test-001",
    creatorWallet: TEST_WALLETS.creator.address,
    contentUri: "https://picsum.photos/seed/post1/800/600",
    contentType: "image",
    caption: "Check out my latest digital artwork! Created with love on Solana.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    likes: 156,
    comments: 23,
    tipsReceived: 4.5,
    isTokenGated: false,
    requiredToken: null,
    llmDescription: "Vibrant digital artwork featuring abstract geometric shapes",
    autoTags: ["art", "digital", "abstract", "colorful"],
    sceneType: "artwork",
    mood: "inspiring",
    safetyScore: 0.98,
    altText: "Abstract digital artwork with geometric shapes in vibrant colors",
  },
  {
    id: "post-test-002",
    creatorWallet: TEST_WALLETS.creator.address,
    contentUri: "https://picsum.photos/seed/post2/800/600",
    contentType: "image",
    caption: "Exclusive content for my token holders! 🔒",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    likes: 89,
    comments: 12,
    tipsReceived: 2.1,
    isTokenGated: true,
    requiredToken: "SolShareCreatorToken",
    llmDescription: "Premium exclusive content for token holders",
    autoTags: ["exclusive", "premium", "token-gated"],
    sceneType: "promotional",
    mood: "exclusive",
    safetyScore: 0.95,
    altText: "Token-gated exclusive content preview",
  },
  {
    id: "post-test-003",
    creatorWallet: TEST_WALLETS.creator.address,
    contentUri: "https://picsum.photos/seed/post3/800/600",
    contentType: "image",
    caption: "Behind the scenes of my creative process",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    likes: 234,
    comments: 45,
    tipsReceived: 6.8,
    isTokenGated: false,
    requiredToken: null,
    llmDescription: "Behind the scenes look at creative workspace",
    autoTags: ["bts", "creative", "workspace", "process"],
    sceneType: "documentary",
    mood: "authentic",
    safetyScore: 0.99,
    altText: "Creator workspace with art supplies and computer",
  },
];

export const testFeedItems: FeedItem[] = testPosts.map((post, index) => ({
  ...post,
  creator: testUsers.creator,
  isLiked: index === 0, // First post is liked
  isFollowing: true,
  hasAccess: !post.isTokenGated, // Only have access to non-gated posts
}));

// ============================================================================
// Test Comments
// ============================================================================

export const testComments: Comment[] = [
  {
    id: "comment-001",
    postId: "post-test-001",
    commenterWallet: TEST_WALLETS.tipper.address,
    text: "This is absolutely stunning! Love your work.",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    commenter: testUsers.tipper,
  },
  {
    id: "comment-002",
    postId: "post-test-001",
    commenterWallet: TEST_WALLETS.viewer.address,
    text: "Amazing colors!",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    commenter: testUsers.viewer,
  },
];

// ============================================================================
// Privacy / Shielded Balance
// ============================================================================

export const testPrivacyBalance: PrivacyBalance = {
  shielded: 2.5,
  available: 2.5,
  pending: 0,
};

export const testPrivacyBalanceWithPending: PrivacyBalance = {
  shielded: 3.0,
  available: 2.5,
  pending: 0.5,
};

// ============================================================================
// Transactions
// ============================================================================

export const testTransactions: Transaction[] = [
  {
    signature: "tx-sig-001-mock",
    type: "tip",
    fromWallet: TEST_WALLETS.tipper.address,
    toWallet: TEST_WALLETS.creator.address,
    amount: 0.5,
    postId: "post-test-001",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: "confirmed",
  },
  {
    signature: "tx-sig-002-mock",
    type: "like",
    fromWallet: TEST_WALLETS.viewer.address,
    toWallet: null,
    amount: null,
    postId: "post-test-001",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "confirmed",
  },
  {
    signature: "tx-sig-003-mock",
    type: "follow",
    fromWallet: TEST_WALLETS.tipper.address,
    toWallet: TEST_WALLETS.creator.address,
    amount: null,
    postId: null,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "confirmed",
  },
];

// ============================================================================
// Search Results
// ============================================================================

export const testSearchResults: SearchResult[] = [
  {
    postId: "post-test-001",
    score: 0.95,
    description: "Vibrant digital artwork featuring abstract geometric shapes",
    creatorWallet: TEST_WALLETS.creator.address,
  },
  {
    postId: "post-test-003",
    score: 0.82,
    description: "Behind the scenes look at creative workspace",
    creatorWallet: TEST_WALLETS.creator.address,
  },
];

// ============================================================================
// Creator Vault / Earnings
// ============================================================================

export const testCreatorVault: CreatorVault = {
  totalEarned: 125.5,
  withdrawn: 50.0,
  subscribers: 42,
  availableBalance: 75.5,
};

// ============================================================================
// Mock API Response Helpers
// ============================================================================

export function createMockApiResponse<T>(data: T, success = true) {
  return {
    success,
    data,
    error: success
      ? undefined
      : { code: "ERROR", message: "Mock error", details: null },
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  hasMore = false,
  nextCursor: string | null = null
) {
  return {
    items,
    hasMore,
    nextCursor,
  };
}

// ============================================================================
// Test Data Generators
// ============================================================================

export function generateTestPosts(count: number): Post[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `generated-post-${i + 1}`,
    creatorWallet: TEST_WALLETS.creator.address,
    contentUri: `https://picsum.photos/seed/gen${i}/800/600`,
    contentType: "image" as const,
    caption: `Generated test post ${i + 1}`,
    timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    likes: Math.floor(Math.random() * 500),
    comments: Math.floor(Math.random() * 50),
    tipsReceived: Math.random() * 10,
    isTokenGated: i % 5 === 0, // Every 5th post is token-gated
    requiredToken: i % 5 === 0 ? "TestToken" : null,
    llmDescription: `Description for generated post ${i + 1}`,
    autoTags: ["generated", "test"],
    sceneType: "test",
    mood: "neutral",
    safetyScore: 0.95,
    altText: `Alt text for generated post ${i + 1}`,
  }));
}

export function generateTestComments(postId: string, count: number): Comment[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `gen-comment-${postId}-${i + 1}`,
    postId,
    commenterWallet:
      i % 2 === 0 ? TEST_WALLETS.tipper.address : TEST_WALLETS.viewer.address,
    text: `Test comment ${i + 1} on post ${postId}`,
    timestamp: new Date(Date.now() - i * 5 * 60 * 1000).toISOString(),
    commenter: i % 2 === 0 ? testUsers.tipper : testUsers.viewer,
  }));
}
