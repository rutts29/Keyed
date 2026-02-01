"use client"

import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import type {
  ApiResponse,
  UserWithRelation,
  FeedItem,
} from "@/types"

type PageData = {
  posts: FeedItem[]
  nextCursor?: string | null
}

/**
 * Prefetches core data a logged-in user will need immediately:
 * profile, wallet balance, personalized feed (first page),
 * explore feed (first page), unread notification count,
 * trending topics, and suggested users.
 *
 * All fetches run in parallel and fail silently so a single
 * slow/broken endpoint never blocks the rest.
 */
export function usePrefetchCore() {
  const queryClient = useQueryClient()

  const prefetch = useCallback(
    (wallet: string) => {
      // User profile
      queryClient.prefetchQuery({
        queryKey: queryKeys.user(wallet),
        queryFn: async () => {
          const { data } = await api.get<ApiResponse<UserWithRelation>>(
            `/users/${wallet}`
          )
          return data.data
        },
      })

      // Wallet SOL balance
      queryClient.prefetchQuery({
        queryKey: queryKeys.walletBalance(),
        queryFn: async () => {
          const { data } = await api.get<ApiResponse<{ balance: number }>>(
            "/users/me/balance"
          )
          return data.data
        },
      })

      // Personalized feed (first page)
      queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.feed("personalized"),
        queryFn: async () => {
          const { data } = await api.get<ApiResponse<PageData>>("/feed", {
            params: { limit: 20 },
          })
          return {
            posts: data.data?.posts ?? [],
            nextCursor: data.data?.nextCursor ?? null,
          }
        },
        initialPageParam: undefined as string | undefined,
      })

      // Explore feed (first page)
      queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.feed("explore"),
        queryFn: async () => {
          const { data } = await api.get<ApiResponse<PageData>>(
            "/feed/explore",
            { params: { limit: 20 } }
          )
          return {
            posts: data.data?.posts ?? [],
            nextCursor: data.data?.nextCursor ?? null,
          }
        },
        initialPageParam: undefined as string | undefined,
      })

      // Unread notification count
      queryClient.prefetchQuery({
        queryKey: queryKeys.unreadCount(),
        queryFn: async () => {
          const { data } = await api.get<ApiResponse<{ count: number }>>(
            "/notifications/unread-count"
          )
          return data.data
        },
      })

      // Trending topics
      queryClient.prefetchQuery({
        queryKey: ["trending", "topics"],
        queryFn: async () => {
          const { data } = await api.get<
            ApiResponse<{ topics: unknown[] }>
          >("/feed/trending-topics")
          return data.data?.topics ?? []
        },
      })

      // Suggested users
      queryClient.prefetchQuery({
        queryKey: ["users", "suggested"],
        queryFn: async () => {
          const { data } = await api.get<
            ApiResponse<{ users: unknown[] }>
          >("/users/suggested")
          return data.data?.users ?? []
        },
      })
    },
    [queryClient]
  )

  return prefetch
}
