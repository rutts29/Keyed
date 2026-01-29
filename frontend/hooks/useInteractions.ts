"use client"

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

import { useSafeDynamicContext } from "./useSafeDynamicContext"
import { useSignedMutation } from "./useSignedMutation"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import { signAndSubmitTransaction } from "@/lib/solana"
import type { ApiResponse, Comment, FeedItem, TransactionResponse } from "@/types"

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
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async (text: string) => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        `/posts/${postId}/comments`,
        { text }
      )
      if (!data.data) {
        throw new Error("Comment failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
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
  return useSignedMutation({
    mutationFn: () =>
      api.post<ApiResponse<TransactionResponse>>(`/posts/${postId}/like`),
    invalidateKeys: [queryKeys.post(postId), ...feedInvalidateKeys],
  })
}

export function useUnlikePost(postId: string) {
  return useSignedMutation({
    mutationFn: () =>
      api.delete<ApiResponse<TransactionResponse>>(`/posts/${postId}/like`),
    invalidateKeys: [queryKeys.post(postId), ...feedInvalidateKeys],
  })
}

export function useFollowUser(wallet: string) {
  return useSignedMutation({
    mutationFn: () =>
      api.post<ApiResponse<TransactionResponse>>(`/users/${wallet}/follow`),
    invalidateKeys: [queryKeys.user(wallet)],
  })
}

export function useUnfollowUser(wallet: string) {
  return useSignedMutation({
    mutationFn: () =>
      api.delete<ApiResponse<TransactionResponse>>(`/users/${wallet}/follow`),
    invalidateKeys: [queryKeys.user(wallet)],
  })
}
