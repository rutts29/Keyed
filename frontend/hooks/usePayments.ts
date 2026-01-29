"use client"

import { useQuery } from "@tanstack/react-query"

import { useSignedMutation } from "./useSignedMutation"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import { solToLamports } from "@/lib/solana"
import { useAuthStore } from "@/store/authStore"
import type { ApiResponse, CreatorVault, Transaction, TransactionResponse } from "@/types"

type EarningsResponse = {
  totalTips: number
  totalSubscriptions: number
  subscriberCount: number
  recentTransactions: Transaction[]
}

export function useTip() {
  return useSignedMutation<{
    creatorWallet: string
    amountInSol: number
    postId?: string
  }>({
    mutationFn: ({ creatorWallet, amountInSol, postId }) =>
      api.post<ApiResponse<TransactionResponse>>("/payments/tip", {
        creatorWallet,
        amount: solToLamports(amountInSol),
        postId,
      }),
    invalidateKeys: [queryKeys.earnings()],
  })
}

export function useSubscribe() {
  return useSignedMutation<{
    creatorWallet: string
    amountInSol: number
  }>({
    mutationFn: ({ creatorWallet, amountInSol }) =>
      api.post<ApiResponse<TransactionResponse>>("/payments/subscribe", {
        creatorWallet,
        amountPerMonth: solToLamports(amountInSol),
      }),
    invalidateKeys: [queryKeys.earnings()],
  })
}

export function useCancelSubscription(creatorWallet: string) {
  return useSignedMutation({
    mutationFn: () =>
      api.delete<ApiResponse<TransactionResponse>>(
        `/payments/subscribe/${creatorWallet}`
      ),
    invalidateKeys: [queryKeys.earnings()],
  })
}

export function useWithdrawEarnings() {
  return useSignedMutation<number>({
    mutationFn: (amountInSol) =>
      api.post<ApiResponse<TransactionResponse>>("/payments/withdraw", {
        amount: solToLamports(amountInSol),
      }),
    invalidateKeys: [queryKeys.vault(), queryKeys.earnings()],
  })
}

export function useCreatorVault() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: queryKeys.vault(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CreatorVault>>("/payments/vault")
      if (!data.data) {
        throw new Error("Vault unavailable")
      }
      return data.data
    },
    enabled: Boolean(token),
  })
}

export function useEarnings() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: queryKeys.earnings(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<EarningsResponse>>(
        "/payments/earnings"
      )
      if (!data.data) {
        throw new Error("Earnings unavailable")
      }
      return data.data
    },
    enabled: Boolean(token),
  })
}
