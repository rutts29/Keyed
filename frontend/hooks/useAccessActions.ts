"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useSafeDynamicContext } from "./useSafeDynamicContext"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import { signAndSubmitTransaction } from "@/lib/solana"
import type { ApiResponse, TransactionResponse } from "@/types"

export function useVerifyTokenAccess(postId: string) {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async () => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        "/access/verify-token",
        { postId }
      )
      if (!data.data) {
        throw new Error("Verification failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.access(postId) })
    },
  })
}

export function useVerifyNftAccess(postId: string) {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async (nftMint: string) => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        "/access/verify-nft",
        { postId, nftMint }
      )
      if (!data.data) {
        throw new Error("Verification failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.access(postId) })
    },
  })
}
