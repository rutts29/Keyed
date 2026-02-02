"use client"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSubscribe } from "@/hooks/usePayments"
import { useUserProfile } from "@/hooks/useUserProfile"
import { formatWallet } from "@/lib/format"
import { useUIStore } from "@/store/uiStore"

export function SubscribeModal() {
  const isOpen = useUIStore((state) => state.isSubscribeModalOpen)
  const subscribeTarget = useUIStore((state) => state.subscribeTarget)
  const closeSubscribeModal = useUIStore((state) => state.closeSubscribeModal)
  const { mutateAsync, isPending } = useSubscribe()

  const creatorWallet = subscribeTarget?.wallet ?? ""
  const { data: creator, isLoading: isLoadingCreator } = useUserProfile(
    isOpen ? creatorWallet : ""
  )

  const price = creator?.subscriptionPrice
  const displayName = creator?.username ?? formatWallet(creatorWallet, 6)

  const handleSubmit = async () => {
    if (!price || price <= 0) {
      toast.error("This creator hasn't set a subscription price")
      return
    }
    if (!subscribeTarget) {
      toast.error("Missing creator")
      return
    }

    try {
      await mutateAsync({ creatorWallet: subscribeTarget.wallet, amountInSol: price })
      toast.success("Subscription activated")
      closeSubscribeModal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Subscribe failed")
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeSubscribeModal()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          {isLoadingCreator ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : price != null && price > 0 ? (
            <>
              <p>
                Subscribe to <span className="font-medium text-foreground">{displayName}</span> for:
              </p>
              <div className="rounded-lg border border-border/70 bg-muted/40 p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">{price} SOL</p>
                <p className="text-xs text-muted-foreground mt-1">per month</p>
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                This creator hasn&apos;t set a subscription price yet.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeSubscribeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || isLoadingCreator || !price || price <= 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subscribing...
                </>
              ) : (
                "Subscribe"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
