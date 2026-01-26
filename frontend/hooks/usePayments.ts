"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useSafeDynamicContext } from "./useSafeDynamicContext"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import { signAndSubmitTransaction, solToLamports } from "@/lib/solana"
import { useAuthStore } from "@/store/authStore"
import type { ApiResponse, CreatorVault, Transaction, TransactionResponse } from "@/types"

type EarningsResponse = {
  totalTips: number
  totalSubscriptions: number
  subscriberCount: number
  recentTransactions: Transaction[]
}

export function useTip() {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async ({
      creatorWallet,
      amountInSol,
      postId,
    }: {
      creatorWallet: string
      amountInSol: number
      postId?: string
    }) => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        "/payments/tip",
        {
          creatorWallet,
          amount: solToLamports(amountInSol),
          postId,
        }
      )
      if (!data.data) {
        throw new Error("Tip unavailable")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.earnings() })
    },
  })
}

export function useSubscribe() {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async ({
      creatorWallet,
      amountInSol,
    }: {
      creatorWallet: string
      amountInSol: number
    }) => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        "/payments/subscribe",
        {
          creatorWallet,
          amountPerMonth: solToLamports(amountInSol),
        }
      )
      if (!data.data) {
        throw new Error("Subscribe failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.earnings() })
    },
  })
}

export function useCancelSubscription(creatorWallet: string) {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async () => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.delete<ApiResponse<TransactionResponse>>(
        `/payments/subscribe/${creatorWallet}`
      )
      if (!data.data) {
        throw new Error("Cancel failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.earnings() })
    },
  })
}

export function useWithdrawEarnings() {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async (amountInSol: number) => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        "/payments/withdraw",
        { amount: solToLamports(amountInSol) }
      )
      if (!data.data) {
        throw new Error("Withdraw failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vault() })
      queryClient.invalidateQueries({ queryKey: queryKeys.earnings() })
    },
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
