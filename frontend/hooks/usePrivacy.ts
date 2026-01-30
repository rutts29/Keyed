import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PublicKey, VersionedTransaction } from "@solana/web3.js"
import type { ISolana } from "@dynamic-labs/solana-core"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import { useAuthStore } from "@/store/authStore"
import { usePrivacyStore } from "@/store/privacyStore"
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext"
import {
  shieldSol,
  getShieldedBalance,
  withdrawSol,
  isSessionInitialized,
} from "@/lib/privacySdk"
import type {
  ApiResponse,
  PrivateTipReceived,
  PrivateTipSent,
  PrivacyBalance,
  PrivacyPoolInfo,
  PrivacySettings,
} from "@/types"

export function useWalletBalance() {
  const token = useAuthStore((state) => state.token)

  return useQuery<{ balance: number }>({
    queryKey: queryKeys.walletBalance(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ balance: number }>>(
        "/users/me/balance"
      )
      if (!data.data) {
        throw new Error("Balance unavailable")
      }
      return data.data
    },
    enabled: Boolean(token),
  })
}

export function usePrivacyBalance() {
  const { primaryWallet } = useSafeDynamicContext()
  const isInitialized = usePrivacyStore(
    (state) => state.isPrivacySessionInitialized
  )

  return useQuery<PrivacyBalance>({
    queryKey: queryKeys.privacyBalance(),
    queryFn: async () => {
      if (!primaryWallet) throw new Error("Wallet not connected")
      const address = await primaryWallet.address
      const publicKey = new PublicKey(address)
      const { lamports } = await getShieldedBalance({ publicKey })
      const sol = lamports / 1e9
      return { shielded: sol, available: sol, pending: 0 }
    },
    enabled: Boolean(primaryWallet) && isInitialized && isSessionInitialized(),
    staleTime: 30_000, // UTXO scanning is expensive
  })
}

export function useShieldSol() {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!primaryWallet) throw new Error("Wallet not connected")
      const signer: ISolana = await (primaryWallet as any).connector.getSigner()
      const address = await primaryWallet.address
      const publicKey = new PublicKey(address)

      return shieldSol({
        amount,
        publicKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signTransaction: (tx: VersionedTransaction) =>
          signer.signTransaction(tx as any) as unknown as Promise<VersionedTransaction>,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.privacyBalance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance() })
    },
  })
}

export function useWithdrawSol() {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!primaryWallet) throw new Error("Wallet not connected")
      const address = await primaryWallet.address
      const publicKey = new PublicKey(address)

      return withdrawSol({
        amount,
        publicKey,
        recipient: publicKey, // Withdraw to self
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.privacyBalance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance() })
    },
  })
}

export function usePrivateTip() {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async ({
      creatorWallet,
      amount,
      postId,
    }: {
      creatorWallet: string
      amount: number
      postId?: string
    }) => {
      if (!primaryWallet) throw new Error("Wallet not connected")
      const address = await primaryWallet.address
      const publicKey = new PublicKey(address)
      const recipient = new PublicKey(creatorWallet)

      // SDK handles the ZK withdraw to the creator
      const result = await withdrawSol({
        amount,
        publicKey,
        recipient,
      })

      // Log the tip to the backend for DB records
      await api.post("/privacy/tip/log", {
        creatorWallet,
        amount,
        postId,
        txSignature: result.tx,
      })

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.privacyBalance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.privacyTipsSent() })
    },
  })
}

export function usePrivacySettings() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: queryKeys.privacySettings(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PrivacySettings>>(
        "/privacy/settings"
      )
      if (!data.data) {
        throw new Error("Settings unavailable")
      }
      return data.data
    },
    enabled: Boolean(token),
  })
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: { defaultPrivateTips: boolean }) => {
      const { data } = await api.put<ApiResponse<PrivacySettings>>(
        "/privacy/settings",
        settings
      )
      if (!data.data) {
        throw new Error("Update failed")
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.privacySettings() })
    },
  })
}

export function usePrivateTipsReceived() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: queryKeys.privacyTipsReceived(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ tips: PrivateTipReceived[] }>>(
        "/privacy/tips/received"
      )
      if (!data.data) {
        throw new Error("Tips unavailable")
      }
      return data.data
    },
    enabled: Boolean(token),
  })
}

export function usePrivateTipsSent() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: queryKeys.privacyTipsSent(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ tips: PrivateTipSent[] }>>(
        "/privacy/tips/sent"
      )
      if (!data.data) {
        throw new Error("Tips unavailable")
      }
      return data.data
    },
    enabled: Boolean(token),
  })
}

export function usePrivacyPoolInfo() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: queryKeys.privacyPoolInfo(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PrivacyPoolInfo>>(
        "/privacy/pool/info"
      )
      if (!data.data) {
        throw new Error("Pool unavailable")
      }
      return data.data
    },
    enabled: Boolean(token),
  })
}
