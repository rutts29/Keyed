"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSubscribe } from "@/hooks/usePayments"
import { useUIStore } from "@/store/uiStore"

const presets = [1, 2.5, 5]

export function SubscribeModal() {
  const isOpen = useUIStore((state) => state.isSubscribeModalOpen)
  const subscribeTarget = useUIStore((state) => state.subscribeTarget)
  const closeSubscribeModal = useUIStore((state) => state.closeSubscribeModal)
  const [amount, setAmount] = useState("1")
  const { mutateAsync, isPending } = useSubscribe()

  const recipient = subscribeTarget?.wallet ?? "creator"

  const handleSubmit = async () => {
    const value = Number.parseFloat(amount)
    if (!value || value <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (!subscribeTarget) {
      toast.error("Missing creator")
      return
    }

    try {
      await mutateAsync({ creatorWallet: subscribeTarget.wallet, amountInSol: value })
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
          <p>Support {recipient} with a monthly subscription.</p>
          <div className="space-y-2">
            <Label htmlFor="subscribe-amount">Amount (SOL / month)</Label>
            <Input
              id="subscribe-amount"
              type="number"
              min="0"
              step="0.1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAmount(preset.toString())}
                >
                  {preset} SOL
                </Button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeSubscribeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              Subscribe
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
