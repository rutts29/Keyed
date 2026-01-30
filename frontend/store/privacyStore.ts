import { create } from "zustand"
import { persist } from "zustand/middleware"

interface PrivacyState {
  // UI state
  isShieldModalOpen: boolean
  balanceHidden: boolean
  openShieldModal: () => void
  closeShieldModal: () => void
  toggleBalanceVisibility: () => void

  // SDK session state
  isPrivacySessionInitialized: boolean
  isInitializingSession: boolean
  shieldedBalanceLamports: number | null
  setSessionInitialized: (value: boolean) => void
  setInitializingSession: (value: boolean) => void
  setShieldedBalance: (lamports: number) => void
  resetPrivacySession: () => void
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      // UI state
      isShieldModalOpen: false,
      balanceHidden: false,
      openShieldModal: () => set({ isShieldModalOpen: true }),
      closeShieldModal: () => set({ isShieldModalOpen: false }),
      toggleBalanceVisibility: () =>
        set((state) => ({ balanceHidden: !state.balanceHidden })),

      // SDK session state
      isPrivacySessionInitialized: false,
      isInitializingSession: false,
      shieldedBalanceLamports: null,
      setSessionInitialized: (value: boolean) =>
        set({ isPrivacySessionInitialized: value }),
      setInitializingSession: (value: boolean) =>
        set({ isInitializingSession: value }),
      setShieldedBalance: (lamports: number) =>
        set({ shieldedBalanceLamports: lamports }),
      resetPrivacySession: () =>
        set({
          isPrivacySessionInitialized: false,
          isInitializingSession: false,
          shieldedBalanceLamports: null,
        }),
    }),
    {
      name: "solshare-privacy",
      partialize: (state) => ({ balanceHidden: state.balanceHidden }),
    }
  )
)
