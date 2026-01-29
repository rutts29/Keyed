"use client"

import type { UserProfile } from "@/types"

import { useInfiniteList } from "./useInfiniteList"

export function useExploreCreators(limit = 20) {
  return useInfiniteList<UserProfile>({
    queryKey: ["users", "explore"],
    endpoint: "/users/explore",
    dataKey: "users",
    limit,
  })
}
