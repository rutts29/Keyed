"use client";

import { useEffect, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const SAFE_DEFAULTS = {
  primaryWallet: null,
  user: null,
  isAuthenticated: false,
  sdkHasLoaded: false,
  setShowAuthFlow: () => {},
  handleLogOut: () => Promise.resolve(),
};

/**
 * Safe wrapper around useDynamicContext that handles SSR gracefully.
 * Returns null values during SSR and initial hydration.
 * Exposes `sdkHasLoaded` so callers can distinguish "wallet not connected"
 * from "SDK still loading".
 */
export function useSafeDynamicContext() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Try to use the real context, but handle the case where provider isn't available
  try {
    const context = useDynamicContext();

    // During SSR or before mount, return safe defaults
    if (!mounted) {
      return SAFE_DEFAULTS;
    }

    return context;
  } catch {
    // Provider not available (during SSG or if not wrapped)
    return SAFE_DEFAULTS;
  }
}
