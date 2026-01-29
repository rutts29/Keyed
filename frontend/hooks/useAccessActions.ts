"use client"

import { useSignedMutation } from "./useSignedMutation"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import type { ApiResponse, TransactionResponse } from "@/types"

export function useVerifyTokenAccess(postId: string) {
  return useSignedMutation({
    mutationFn: () =>
      api.post<ApiResponse<TransactionResponse>>("/access/verify-token", {
        postId,
      }),
    invalidateKeys: [queryKeys.access(postId)],
  })
}

export function useVerifyNftAccess(postId: string) {
  return useSignedMutation<string>({
    mutationFn: (nftMint) =>
      api.post<ApiResponse<TransactionResponse>>("/access/verify-nft", {
        postId,
        nftMint,
      }),
    invalidateKeys: [queryKeys.access(postId)],
  })
}
