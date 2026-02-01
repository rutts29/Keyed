"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * Blocks rendering of children until auth state is resolved.
 * Redirects to the marketing page when no session exists.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const authReady = useAuthStore((state) => state.authReady);
  const token = useAuthStore((state) => state.token);
  const wallet = useAuthStore((state) => state.wallet);

  useEffect(() => {
    if (authReady && !token && !wallet) {
      window.location.href = "/";
    }
  }, [authReady, token, wallet]);

  // Still resolving auth — show nothing (avoids flash of app UI)
  if (!authReady) return null;

  // No session — will redirect, render nothing
  if (!token && !wallet) return null;

  return <>{children}</>;
}
