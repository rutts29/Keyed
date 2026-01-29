"use client"

import { useState } from "react"
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { signAndSubmitTransaction } from "@/lib/solana"
import { usePrivacyBalance, useShieldSol } from "@/hooks/usePrivacy"
import { usePrivacyStore } from "@/store/privacyStore"

export function ShieldModal() {
  const { primaryWallet } = useSafeDynamicContext()
  const { data } = usePrivacyBalance()
  const { mutateAsync, isPending } = useShieldSol()
  const isOpen = usePrivacyStore((state) => state.isShieldModalOpen)
  const closeShieldModal = usePrivacyStore((state) => state.closeShieldModal)
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState<"idle" | "shielding" | "success">("idle")

  const resetState = () => {
    setAmount("")
    setStatus("idle")
  }

  const handleClose = () => {
    resetState()
    closeShieldModal()
  }

  const handleSubmit = async () => {
    const value = Number.parseFloat(amount)
    if (!value || value <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (!primaryWallet) {
      toast.error("Connect your wallet to continue")
      return
    }

    setStatus("shielding")
    try {
      const transaction = await mutateAsync(value)
      await signAndSubmitTransaction(transaction.transaction, primaryWallet)
      setStatus("success")
      toast.success("Shield transaction confirmed")
      handleClose()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Shielding failed"
      )
      setStatus("idle")
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shield SOL</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Shielded SOL can be used to send anonymous tips.</p>
          <div className="space-y-2">
            <Label htmlFor="shield-amount">Amount (SOL)</Label>
            <Input
              id="shield-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.5"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs">
            <p>
              Available balance: {typeof data?.available === "number" ? data.available : 0} SOL
            </p>
            <p className="mt-1">Shielding is reversible via withdrawal.</p>
          </div>
          {status === "shielding" && <Progress value={60} />}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              Shield
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
