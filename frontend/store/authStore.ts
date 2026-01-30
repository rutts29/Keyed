import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { UserProfile } from "@/types";

interface AuthState {
  token: string | null;
  wallet: string | null;
  connectedAt: string | null;
  user: UserProfile | null;
  /** True once AuthSync has validated the session after hydration. */
  authReady: boolean;
  setAuth: (auth: {
    token: string;
    wallet: string;
    user: UserProfile | null;
  }) => void;
  setWallet: (wallet: string) => void;
  setUser: (user: UserProfile) => void;
  setAuthReady: () => void;
  clearAuth: () => void;
}

const storage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage(() => localStorage);

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      wallet: null,
      connectedAt: null,
      user: null,
      authReady: false,
      setAuth: (auth) =>
        set({ token: auth.token, wallet: auth.wallet, user: auth.user, authReady: true }),
      setWallet: (wallet) =>
        set((state) => ({
          wallet,
          connectedAt:
            state.wallet === wallet
              ? (state.connectedAt ?? new Date().toISOString())
              : new Date().toISOString(),
        })),
      setUser: (user) => set({ user }),
      setAuthReady: () => set({ authReady: true }),
      clearAuth: () =>
        set({ token: null, wallet: null, connectedAt: null, user: null, authReady: true }),
    }),
    {
      name: "solshare-auth",
      storage,
      partialize: (state) => ({
        token: state.token,
        wallet: state.wallet,
        connectedAt: state.connectedAt,
        user: state.user,
      }),
    }
  )
);
