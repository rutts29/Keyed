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
