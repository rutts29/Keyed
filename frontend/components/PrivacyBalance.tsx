import { Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePrivacyBalance } from "@/hooks/usePrivacy"
import { usePrivacyStore } from "@/store/privacyStore"

export function PrivacyBalance() {
  const { data, isLoading } = usePrivacyBalance()
  const openShieldModal = usePrivacyStore((state) => state.openShieldModal)

  if (isLoading) {
    return <Skeleton className="h-8 w-full" />
  }

  const available = data?.available ?? 0

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span>{available.toFixed(2)} SOL shielded</span>
      </div>
      <Button size="sm" variant="outline" onClick={openShieldModal}>
        Shield
      </Button>
    </div>
  )
}
