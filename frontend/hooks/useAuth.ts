"use client";

import { useCallback } from "react";
import bs58 from "bs58";

import { useSafeDynamicContext } from "./useSafeDynamicContext";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { ApiResponse, AuthChallenge, AuthSession } from "@/types";

export function useAuth() {
  const { primaryWallet, handleLogOut } = useSafeDynamicContext();
  const { token, setAuth, clearAuth } = useAuthStore();

  const login = useCallback(async () => {
    if (!primaryWallet) {
      throw new Error("No wallet connected");
    }

    const { data: challengeResponse } = await api.post<
      ApiResponse<AuthChallenge>
    >("/auth/challenge", { wallet: primaryWallet.address });

    if (!challengeResponse.data) {
      throw new Error("Challenge unavailable");
    }

    const rawSignature = await primaryWallet.signMessage(
      challengeResponse.data.message
    );
    if (!rawSignature) {
      throw new Error("Signing cancelled");
    }

    // Dynamic Labs returns base64-encoded signatures;
    // backend expects base58.
    const signature = bs58.encode(Buffer.from(rawSignature, "base64"));

    const { data: verifyResponse } = await api.post<ApiResponse<AuthSession>>(
      "/auth/verify",
      {
        wallet: primaryWallet.address,
        signature,
      }
    );

    if (!verifyResponse.data) {
      throw new Error("Auth failed");
    }

    setAuth({
      token: verifyResponse.data.token,
      wallet: primaryWallet.address,
      user: verifyResponse.data.user,
    });

    return verifyResponse.data;
  }, [primaryWallet, setAuth]);

  const logout = useCallback(async () => {
    await handleLogOut();
    clearAuth();
  }, [clearAuth, handleLogOut]);

  return {
    isAuthenticated: Boolean(token),
    token,
    wallet: primaryWallet?.address ?? null,
    login,
    logout,
  };
}
