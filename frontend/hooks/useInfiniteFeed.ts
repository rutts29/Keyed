"use client"

import { useAuthStore } from "@/store/authStore"
import { queryKeys } from "@/lib/queryClient"
import type { FeedItem } from "@/types"

import { useInfiniteList } from "./useInfiniteList"

type FeedType = "personalized" | "explore" | "following" | "trending"

const feedEndpoints: Record<FeedType, string> = {
  personalized: "/feed",
  explore: "/feed/explore",
  following: "/feed/following",
  trending: "/feed/trending",
}

export function useInfiniteFeed(feedType: FeedType, limit = 20) {
  const token = useAuthStore((state) => state.token)
  const requiresAuth = feedType === "personalized" || feedType === "following"

  return useInfiniteList<FeedItem>({
    queryKey: queryKeys.feed(feedType),
    endpoint: feedEndpoints[feedType],
    dataKey: "posts",
    limit,
    enabled: !requiresAuth || Boolean(token),
  })
}
