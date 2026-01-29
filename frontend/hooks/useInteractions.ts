"use client"

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

import { useSafeDynamicContext } from "./useSafeDynamicContext"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import { signAndSubmitTransaction } from "@/lib/solana"
import type { ApiResponse, Comment, FeedItem, TransactionResponse } from "@/types"

type CommentsResponse = {
  comments: Comment[]
  nextCursor: string | null
}

export function usePost(postId: string) {
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL)

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
    enabled: hasApi && Boolean(postId),
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "Post not found") {
        return false
      }
      return failureCount < 3
    },
  })
}

export function useInfiniteComments(postId: string, limit = 10) {
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL)

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
    enabled: hasApi && Boolean(postId),
  })
}

export function usePostComments(postId: string) {
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL)

  return useQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CommentsResponse>>(
        `/posts/${postId}/comments`
      )
      if (!data.data) {
        throw new Error("Comments unavailable")
      }
      return data.data
    },
    enabled: hasApi && Boolean(postId),
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

export function useLikePost(postId: string) {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async () => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        `/posts/${postId}/like`
      )
      if (!data.data) {
        throw new Error("Like failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.feed("explore") })
      queryClient.invalidateQueries({ queryKey: queryKeys.feed("personalized") })
      queryClient.invalidateQueries({ queryKey: queryKeys.feed("following") })
    },
  })
}

export function useUnlikePost(postId: string) {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async () => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.delete<ApiResponse<TransactionResponse>>(
        `/posts/${postId}/like`
      )
      if (!data.data) {
        throw new Error("Unlike failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.feed("explore") })
      queryClient.invalidateQueries({ queryKey: queryKeys.feed("personalized") })
      queryClient.invalidateQueries({ queryKey: queryKeys.feed("following") })
    },
  })
}

export function useFollowUser(wallet: string) {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async () => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        `/users/${wallet}/follow`
      )
      if (!data.data) {
        throw new Error("Follow failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(wallet) })
    },
  })
}

export function useUnfollowUser(wallet: string) {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async () => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.delete<ApiResponse<TransactionResponse>>(
        `/users/${wallet}/follow`
      )
      if (!data.data) {
        throw new Error("Unfollow failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(wallet) })
    },
  })
}
