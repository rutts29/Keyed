"use client"

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import type { ApiResponse, Comment, FeedItem } from "@/types"

type CommentsResponse = {
  comments: Comment[]
  nextCursor: string | null
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<FeedItem>>(
        `/posts/${postId}`
      )
      if (!data.data) {
        throw new Error("Post not found")
      }
      return data.data
    },
    enabled: Boolean(postId),
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "Post not found") {
        return false
      }
      return failureCount < 3
    },
  })
}

export function useInfiniteComments(postId: string, limit = 10) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.comments(postId), "infinite"],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ApiResponse<CommentsResponse>>(
        `/posts/${postId}/comments`,
        { params: { limit, cursor: pageParam } }
      )
      if (!data.data) {
        throw new Error("Comments unavailable")
      }
      return data.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(postId),
  })
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<ApiResponse<{ commentId: string }>>(
        `/posts/${postId}/comments`,
        { text }
      )
      if (!data.success) {
        throw new Error("Comment failed")
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) })
    },
  })
}

const feedInvalidateKeys = [
  queryKeys.feed("explore"),
  queryKeys.feed("personalized"),
  queryKeys.feed("following"),
] as const

export function useLikePost(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<{ liked: boolean }>>(
        `/posts/${postId}/like`
      )
      if (!data.success) {
        throw new Error("Like failed")
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })
      feedInvalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

export function useUnlikePost(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<ApiResponse<{ unliked: boolean }>>(
        `/posts/${postId}/like`
      )
      if (!data.success) {
        throw new Error("Unlike failed")
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })
      feedInvalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

export function useFollowUser(wallet: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<{ followed: boolean }>>(
        `/users/${wallet}/follow`
      )
      if (!data.success) {
        throw new Error("Follow failed")
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(wallet) })
    },
  })
}

export function useUnfollowUser(wallet: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<ApiResponse<{ unfollowed: boolean }>>(
        `/users/${wallet}/follow`
      )
      if (!data.success) {
        throw new Error("Unfollow failed")
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(wallet) })
    },
  })
}
