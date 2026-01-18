"use client";

import { useEffect, useRef } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

export function AuthSync() {
  const { primaryWallet } = useDynamicContext();
  const token = useAuthStore((state) => state.token);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { login } = useAuth();
  const lastWalletRef = useRef<string | null>(null);
  const isAuthenticating = useRef(false);

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

    login().catch((error) => {
      clearAuth();
      toast.error(
        error instanceof Error ? error.message : "Wallet authentication failed"
      );
    }).finally(() => {
      isAuthenticating.current = false;
    });
  }, [clearAuth, login, primaryWallet, token]);

  return null;
}
