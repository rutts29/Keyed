import { QueryClient } from "@tanstack/react-query";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        refetchOnWindowFocus: false,
      },
    },
  });

export const queryKeys = {
  user: (wallet: string) => ["user", wallet] as const,
  userPosts: (wallet: string) => ["user", wallet, "posts"] as const,
  post: (postId: string) => ["post", postId] as const,
  feed: (type: "personalized" | "explore" | "following" | "trending") =>
    ["feed", type] as const,
  search: (query: string) => ["search", query] as const,
  comments: (postId: string) => ["comments", postId] as const,
  access: (postId: string) => ["access", postId] as const,
  vault: () => ["vault"] as const,
  earnings: () => ["earnings"] as const,
  privacyBalance: () => ["privacy", "balance"] as const,
  privacyTipsReceived: () => ["privacy", "tips", "received"] as const,
  privacyTipsSent: () => ["privacy", "tips", "sent"] as const,
  privacySettings: () => ["privacy", "settings"] as const,
  privacyPoolInfo: () => ["privacy", "pool"] as const,
};
