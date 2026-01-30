"use client"

import { useCallback } from "react"
import type { ISolana } from "@dynamic-labs/solana-core"
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext"
import { usePrivacyStore } from "@/store/privacyStore"
import {
  initializePrivacySession,
  clearPrivacySession,
  isSessionInitialized,
} from "@/lib/privacySdk"

export function usePrivacySession() {
  const { primaryWallet } = useSafeDynamicContext()
  const isInitialized = usePrivacyStore(
    (state) => state.isPrivacySessionInitialized
  )
  const isInitializing = usePrivacyStore(
    (state) => state.isInitializingSession
  )
  const setSessionInitialized = usePrivacyStore(
    (state) => state.setSessionInitialized
  )
  const setInitializingSession = usePrivacyStore(
    (state) => state.setInitializingSession
  )
  const resetPrivacySession = usePrivacyStore(
    (state) => state.resetPrivacySession
  )

  const initialize = useCallback(async () => {
    if (isSessionInitialized() || isInitializing) return
    if (!primaryWallet) return

    setInitializingSession(true)
    try {
      const signer: ISolana = await (primaryWallet as any).connector.getSigner()
      await initializePrivacySession(async (msg: Uint8Array) => {
        const signed = await signer.signMessage(msg)
        return signed.signature
      })
      setSessionInitialized(true)
    } finally {
      setInitializingSession(false)
    }
  }, [primaryWallet, isInitializing, setSessionInitialized, setInitializingSession])

  const logout = useCallback(() => {
    clearPrivacySession()
    resetPrivacySession()
  }, [resetPrivacySession])

  return {
    initialize,
    logout,
    isInitialized,
    isInitializing,
    hasWallet: Boolean(primaryWallet),
  }
}
