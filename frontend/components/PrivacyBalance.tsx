import { Eye, EyeOff, Lock, Shield, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePrivacyBalance, useWalletBalance } from "@/hooks/usePrivacy"
import { usePrivacySession } from "@/hooks/usePrivacySession"
import { usePrivacyStore } from "@/store/privacyStore"

export function PrivacyBalance() {
  const { data: privacyData, isLoading: privacyLoading } = usePrivacyBalance()
  const { data: walletData, isLoading: walletLoading } = useWalletBalance()
  const { initialize, isInitialized, isInitializing, hasWallet } = usePrivacySession()
  const openShieldModal = usePrivacyStore((state) => state.openShieldModal)
  const balanceHidden = usePrivacyStore((state) => state.balanceHidden)
  const toggleBalanceVisibility = usePrivacyStore(
    (state) => state.toggleBalanceVisibility
  )

  const isLoading = walletLoading || (isInitialized && privacyLoading)

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-full rounded-xl" />
        <Skeleton className="h-8 w-full rounded-xl" />
      </div>
    )
  }

  const solBalance = walletData?.balance ?? 0
  const shieldedBalance = privacyData?.available ?? 0
  const hidden = "••••••"

  return (
    <div className="space-y-1.5">
      {/* SOL Balance */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground/70" />
          <span>
            {balanceHidden ? hidden : `${solBalance.toFixed(4)}`}{" "}
            <span className="text-muted-foreground/60">SOL</span>
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={toggleBalanceVisibility}
          aria-label={balanceHidden ? "Show balances" : "Hide balances"}
        >
          {balanceHidden ? (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground/60" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
        </Button>
      </div>

      {/* Shielded Balance */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {isInitialized ? (
            <span>
              {balanceHidden ? hidden : `${shieldedBalance.toFixed(4)}`}{" "}
              <span className="text-muted-foreground/60">shielded</span>
            </span>
          ) : (
            <span className="text-muted-foreground/60">
              {isInitializing ? "Initializing..." : "Privacy session inactive"}
            </span>
          )}
        </div>
        {isInitialized ? (
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={openShieldModal}>
            Shield
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px]"
            onClick={() => initialize()}
            disabled={isInitializing || !hasWallet}
          >
            <Lock className="mr-1 h-3 w-3" />
            {isInitializing ? "..." : "Activate"}
          </Button>
        )}
      </div>
    </div>
  )
}
