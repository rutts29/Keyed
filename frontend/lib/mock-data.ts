import type { FeedItem, UserProfile } from "@/types";

export type Post = {
  id: string;
  author: {
    name: string;
    handle: string;
    initials: string;
  };
  content: string;
  topic?: string;
  createdAt: string;
  stats: {
    replies: number;
    reposts: number;
    likes: number;
  };
};

export type Trend = {
  topic: string;
  label: string;
  posts: string;
};

export type SuggestedUser = {
  name: string;
  handle: string;
  initials: string;
  summary: string;
};

// Mock creator profiles for FeedItem compatibility
const mockCreators: Record<string, UserProfile> = {
  maya: {
    wallet: "MayaChenWa11etAddressForMockData1111111111",
    username: "mayastream",
    bio: "Creator drops and premium content",
    profileImageUri: null,
    followerCount: 3200,
    followingCount: 210,
    postCount: 128,
    createdAt: "2024-01-01T00:00:00.000Z",
    isVerified: true,
  },
  jae: {
    wallet: "JaeParkWa11etAddressForMockData11111111111",
    username: "jae.builds",
    bio: "Building on Solana",
    profileImageUri: null,
    followerCount: 1500,
    followingCount: 300,
    postCount: 85,
    createdAt: "2024-01-01T00:00:00.000Z",
    isVerified: false,
  },
  solshare: {
    wallet: "SolShareTeamWa11etAddressForMockData111111",
    username: "solshare",
    bio: "Official SolShare account",
    profileImageUri: null,
    followerCount: 10000,
    followingCount: 50,
    postCount: 200,
    createdAt: "2024-01-01T00:00:00.000Z",
    isVerified: true,
  },
  leah: {
    wallet: "LeahIdrisWa11etAddressForMockData111111111",
    username: "leah.sol",
    bio: "Design enthusiast",
    profileImageUri: null,
    followerCount: 800,
    followingCount: 150,
    postCount: 45,
    createdAt: "2024-01-01T00:00:00.000Z",
    isVerified: false,
  },
  andre: {
    wallet: "AndreColeWa11etAddressForMockData111111111",
    username: "andre",
    bio: "Solana native discovery",
    profileImageUri: null,
    followerCount: 2500,
    followingCount: 180,
    postCount: 95,
    createdAt: "2024-01-01T00:00:00.000Z",
    isVerified: true,
  },
};

export const posts: Post[] = [
  {
    id: "post-001",
    author: {
      name: "Maya Chen",
      handle: "@mayastream",
      initials: "MC",
    },
    content:
      "Weekly creator drop: verified drops, gated access, and tips in one thread. SolShare makes it simple to ship premium content without the overhead.",
    topic: "Creator Drops",
    createdAt: "3h",
    stats: { replies: 18, reposts: 34, likes: 220 },
  },
  {
    id: "post-002",
    author: {
      name: "Jae Park",
      handle: "@jae.builds",
      initials: "JP",
    },
    content:
      "Testing the social graph: follows, tips, and token-gated rooms all feel instant. The UI keeps it focused and clean.",
    topic: "Product",
    createdAt: "5h",
    stats: { replies: 9, reposts: 21, likes: 142 },
  },
  {
    id: "post-003",
    author: {
      name: "SolShare Team",
      handle: "@solshare",
      initials: "SS",
    },
    content:
      "Feature highlight: creators can set access rules per post. NFTs, tokens, or subscriptions — all in one flow.",
    topic: "Announcements",
    createdAt: "8h",
    stats: { replies: 31, reposts: 60, likes: 430 },
  },
  {
    id: "post-004",
    author: {
      name: "Leah Idris",
      handle: "@leah.sol",
      initials: "LI",
    },
    content:
      "Love the minimal dark theme. The feed feels calm, and the CTA for posting is always within reach.",
    topic: "Design",
    createdAt: "12h",
    stats: { replies: 6, reposts: 15, likes: 95 },
  },
  {
    id: "post-005",
    author: {
      name: "Andre Cole",
      handle: "@andre",
      initials: "AC",
    },
    content:
      "Solana-native discovery is finally here. Curated trends and instant access checks keep the signal high.",
    topic: "Discovery",
    createdAt: "1d",
    stats: { replies: 22, reposts: 44, likes: 312 },
  },
];

// FeedItem-compatible mock posts for testing tip functionality
export const feedItems: FeedItem[] = [
  {
    id: "post-001",
    creatorWallet: mockCreators.maya.wallet,
    contentUri: "",
    contentType: "text",
    caption: "Weekly creator drop: verified drops, gated access, and tips in one thread. SolShare makes it simple to ship premium content without the overhead.",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    likes: 220,
    comments: 18,
    tipsReceived: 5,
    isTokenGated: false,
    requiredToken: null,
    llmDescription: null,
    autoTags: ["creator", "drops", "tips"],
    sceneType: null,
    mood: null,
    safetyScore: null,
    altText: null,
    creator: mockCreators.maya,
    isLiked: false,
    isFollowing: false,
    hasAccess: true,
  },
  {
    id: "post-002",
    creatorWallet: mockCreators.jae.wallet,
    contentUri: "",
    contentType: "text",
    caption: "Testing the social graph: follows, tips, and token-gated rooms all feel instant. The UI keeps it focused and clean.",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    likes: 142,
    comments: 9,
    tipsReceived: 2,
    isTokenGated: false,
    requiredToken: null,
    llmDescription: null,
    autoTags: ["product", "ux"],
    sceneType: null,
    mood: null,
    safetyScore: null,
    altText: null,
    creator: mockCreators.jae,
    isLiked: false,
    isFollowing: true,
    hasAccess: true,
  },
  {
    id: "post-003",
    creatorWallet: mockCreators.solshare.wallet,
    contentUri: "",
    contentType: "text",
    caption: "Feature highlight: creators can set access rules per post. NFTs, tokens, or subscriptions — all in one flow.",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    likes: 430,
    comments: 31,
    tipsReceived: 15,
    isTokenGated: true,
    requiredToken: "SOL",
    llmDescription: null,
    autoTags: ["feature", "nft", "tokens"],
    sceneType: null,
    mood: null,
    safetyScore: null,
    altText: null,
    creator: mockCreators.solshare,
    isLiked: true,
    isFollowing: true,
    hasAccess: true,
  },
  {
    id: "post-004",
    creatorWallet: mockCreators.leah.wallet,
    contentUri: "",
    contentType: "text",
    caption: "Love the minimal dark theme. The feed feels calm, and the CTA for posting is always within reach.",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    likes: 95,
    comments: 6,
    tipsReceived: 1,
    isTokenGated: false,
    requiredToken: null,
    llmDescription: null,
    autoTags: ["design", "ui"],
    sceneType: null,
    mood: null,
    safetyScore: null,
    altText: null,
    creator: mockCreators.leah,
    isLiked: false,
    isFollowing: false,
    hasAccess: true,
  },
  {
    id: "post-005",
    creatorWallet: mockCreators.andre.wallet,
    contentUri: "",
    contentType: "text",
    caption: "Solana-native discovery is finally here. Curated trends and instant access checks keep the signal high.",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    likes: 312,
    comments: 22,
    tipsReceived: 8,
    isTokenGated: false,
    requiredToken: null,
    llmDescription: null,
    autoTags: ["discovery", "solana"],
    sceneType: null,
    mood: null,
    safetyScore: null,
    altText: null,
    creator: mockCreators.andre,
    isLiked: false,
    isFollowing: true,
    hasAccess: true,
  },
];

export const trends: Trend[] = [
  {
    topic: "Token-gated drops",
    label: "Creators are bundling content + perks.",
    posts: "1,294 posts",
  },
  {
    topic: "Live mint rooms",
    label: "Low-friction access for superfans.",
    posts: "842 posts",
  },
  {
    topic: "Weekly creator tips",
    label: "Short, high-signal advice threads.",
    posts: "508 posts",
  },
  {
    topic: "Solana builders",
    label: "Small teams shipping fast.",
    posts: "1,976 posts",
  },
];

export const suggestedUsers: SuggestedUser[] = [
  {
    name: "Ari Vega",
    handle: "@ari.creates",
    initials: "AV",
    summary: "Design systems + tokenized merch.",
  },
  {
    name: "Kaito Shin",
    handle: "@kaito",
    initials: "KS",
    summary: "Live sessions, gated Q&A, and drops.",
  },
  {
    name: "Nova Lane",
    handle: "@novalane",
    initials: "NL",
    summary: "Web3 educator + weekly sessions.",
  },
];
