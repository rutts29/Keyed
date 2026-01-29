"use client"

import { queryKeys } from "@/lib/queryClient"
import type { FeedItem } from "@/types"

import { useInfiniteList } from "./useInfiniteList"

export function useUserPosts(wallet: string, limit = 20) {
  return useInfiniteList<FeedItem>({
    queryKey: queryKeys.userPosts(wallet),
    endpoint: `/users/${wallet}/posts`,
    dataKey: "posts",
    limit,
    enabled: Boolean(wallet) && wallet !== "me",
  })
}
