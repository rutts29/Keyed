"use client";

import { useEffect, useRef } from "react";
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext";

import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

export function AuthSync() {
  const { primaryWallet, sdkHasLoaded } = useSafeDynamicContext();
  const token = useAuthStore((state) => state.token);
  const wallet = useAuthStore((state) => state.wallet);
  const setWallet = useAuthStore((state) => state.setWallet);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);
  const { login } = useAuth();
  const lastWalletRef = useRef<string | null>(null);
  const isAuthenticating = useRef(false);

  // Always sync wallet address from Dynamic context
  useEffect(() => {
    if (primaryWallet?.address && primaryWallet.address !== wallet) {
      setWallet(primaryWallet.address);
    }
  }, [primaryWallet, wallet, setWallet]);

  useEffect(() => {
    // Wait for Dynamic Labs SDK to fully initialise before making
    // any auth decisions. Before that, primaryWallet is unreliable.
    if (!sdkHasLoaded) return;

    if (!primaryWallet?.address) {
      // SDK loaded but no wallet connected — clear any stale session
      if (token) {
        clearAuth(); // clearAuth also sets authReady = true
      } else {
        setAuthReady();
      }
      lastWalletRef.current = null;
      return;
    }

    // Wallet is connected and we already have a token — session is valid
    if (token) {
      setAuthReady();
      return;
    }

    if (isAuthenticating.current) {
      return;
    }

    if (lastWalletRef.current === primaryWallet.address) {
      setAuthReady();
      return;
    }

    lastWalletRef.current = primaryWallet.address;
    isAuthenticating.current = true;

    login().catch(() => {
      // Backend unavailable — wallet address is already stored above
      setAuthReady();
    }).finally(() => {
      isAuthenticating.current = false;
    });
  }, [clearAuth, login, primaryWallet, sdkHasLoaded, setAuthReady, token]);

  return null;
}
