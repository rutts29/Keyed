import { create } from "zustand"

import type { PrivacyBalance, PrivacySettings } from "@/types"

interface PrivacyState {
  balance: PrivacyBalance | null
  isLoadingBalance: boolean
  settings: PrivacySettings | null
  isShieldModalOpen: boolean
  isPrivateTipModalOpen: boolean
  privateTipTarget: { wallet: string; postId?: string } | null
  setBalance: (balance: PrivacyBalance) => void
  setSettings: (settings: PrivacySettings) => void
  setLoadingBalance: (loading: boolean) => void
  openShieldModal: () => void
  closeShieldModal: () => void
  openPrivateTipModal: (wallet: string, postId?: string) => void
  closePrivateTipModal: () => void
}

export const usePrivacyStore = create<PrivacyState>((set) => ({
  balance: null,
  isLoadingBalance: false,
  settings: null,
  isShieldModalOpen: false,
  isPrivateTipModalOpen: false,
  privateTipTarget: null,
  setBalance: (balance) => set({ balance }),
  setSettings: (settings) => set({ settings }),
  setLoadingBalance: (loading) => set({ isLoadingBalance: loading }),
  openShieldModal: () => set({ isShieldModalOpen: true }),
  closeShieldModal: () => set({ isShieldModalOpen: false }),
  openPrivateTipModal: (wallet, postId) =>
    set({ isPrivateTipModalOpen: true, privateTipTarget: { wallet, postId } }),
  closePrivateTipModal: () =>
    set({ isPrivateTipModalOpen: false, privateTipTarget: null }),
}))
