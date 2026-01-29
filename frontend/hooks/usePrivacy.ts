import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryClient"
import { useAuthStore } from "@/store/authStore"
import { usePrivacyStore } from "@/store/privacyStore"
import type {
  ApiResponse,
  PrivateTipReceived,
  PrivateTipSent,
  PrivacyBalance,
  PrivacyPoolInfo,
  PrivacySettings,
  TransactionResponse,
} from "@/types"

export function usePrivacyBalance() {
  const setBalance = usePrivacyStore((state) => state.setBalance)
  const setLoading = usePrivacyStore((state) => state.setLoadingBalance)
  const token = useAuthStore((state) => state.token)

  return useQuery<PrivacyBalance>({
    queryKey: queryKeys.privacyBalance(),
    queryFn: async () => {
      setLoading(true)
      try {
        const { data } = await api.get<ApiResponse<PrivacyBalance>>(
          "/privacy/balance"
        )
        if (!data.data) {
          throw new Error("Balance unavailable")
        }
        setBalance(data.data)
        return data.data
      } finally {
        setLoading(false)
      }
    },
    enabled: Boolean(token),
  })
}

export function useShieldSol() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        "/privacy/shield",
        { amount }
      )
      if (!data.data) {
        throw new Error("Shielding unavailable")
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.privacyBalance() })
    },
  })
}

export function usePrivateTip() {
  const queryClient = useQueryClient()

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
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        "/privacy/tip",
        { creatorWallet, amount, postId }
      )
      if (!data.data) {
        throw new Error("Private tip unavailable")
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.privacyBalance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.privacyTipsSent() })
    },
  })
}

export function usePrivacySettings() {
  const setSettings = usePrivacyStore((state) => state.setSettings)
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
      setSettings(data.data)
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
