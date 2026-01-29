"use client";

import { useEffect, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

/**
 * Safe wrapper around useDynamicContext that handles SSR gracefully.
 * Returns null values during SSR and initial hydration.
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
      return {
        primaryWallet: null,
        user: null,
        isAuthenticated: false,
        setShowAuthFlow: () => {},
        handleLogOut: () => Promise.resolve(),
      };
    }

    return context;
  } catch {
    // Provider not available (during SSG or if not wrapped)
    return {
      primaryWallet: null,
      user: null,
      isAuthenticated: false,
      setShowAuthFlow: () => {},
      handleLogOut: () => Promise.resolve(),
    };
  }
}
