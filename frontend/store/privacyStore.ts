import { create } from "zustand"

interface PrivacyState {
  isShieldModalOpen: boolean
  openShieldModal: () => void
  closeShieldModal: () => void
}

export const usePrivacyStore = create<PrivacyState>((set) => ({
  isShieldModalOpen: false,
  openShieldModal: () => set({ isShieldModalOpen: true }),
  closeShieldModal: () => set({ isShieldModalOpen: false }),
}))
