"use client";

import { useEffect, useRef } from "react";
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

export function AuthSync() {
  const { primaryWallet } = useSafeDynamicContext();
  const token = useAuthStore((state) => state.token);
  const wallet = useAuthStore((state) => state.wallet);
  const setWallet = useAuthStore((state) => state.setWallet);
  const clearAuth = useAuthStore((state) => state.clearAuth);
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
    if (!primaryWallet?.address) {
      if (token) {
        clearAuth();
      }
      lastWalletRef.current = null;
      return;
    }

    if (token || isAuthenticating.current) {
      return;
    }

    if (lastWalletRef.current === primaryWallet.address) {
      return;
    }

    lastWalletRef.current = primaryWallet.address;
    isAuthenticating.current = true;

    login().catch(() => {
      // Backend unavailable — wallet address is already stored above
    }).finally(() => {
      isAuthenticating.current = false;
    });
  }, [clearAuth, login, primaryWallet, token]);

  return null;
}
