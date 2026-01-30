"use client"

import { useState } from "react"
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext"
import { usePrivacySession } from "@/hooks/usePrivacySession"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { usePrivacyBalance, useWithdrawSol } from "@/hooks/usePrivacy"

type WithdrawStatus = "idle" | "proving" | "submitting" | "confirming" | "success"

const STATUS_LABELS: Record<WithdrawStatus, string> = {
  idle: "",
  proving: "Generating ZK proof...",
  submitting: "Submitting to network...",
  confirming: "Confirming transaction...",
  success: "Withdrawal confirmed!",
}

const STATUS_PROGRESS: Record<WithdrawStatus, number> = {
  idle: 0,
  proving: 30,
  submitting: 60,
  confirming: 85,
  success: 100,
}

interface WithdrawModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WithdrawModal({ open, onOpenChange }: WithdrawModalProps) {
  const { primaryWallet } = useSafeDynamicContext()
  const { isInitialized } = usePrivacySession()
  const { data } = usePrivacyBalance()
  const { mutateAsync, isPending } = useWithdrawSol()
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState<WithdrawStatus>("idle")

  const resetState = () => {
    setAmount("")
    setStatus("idle")
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
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
    if (!isInitialized) {
      toast.error("Privacy session not initialized")
      return
    }

    try {
      setStatus("proving")
      const result = await mutateAsync(value)

      setStatus("success")
      const withdrawnSol = result.amount_in_lamports / 1e9
      const feeSol = result.fee_in_lamports / 1e9
      toast.success(
        `Withdrew ${withdrawnSol.toFixed(4)} SOL (fee: ${feeSol.toFixed(4)} SOL)`
      )
      handleClose()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Withdrawal failed"
      )
      setStatus("idle")
    }
  }

  const isProcessing = status !== "idle" && status !== "success"
  const shieldedBalance = data?.available ?? 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw Shielded SOL</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Unshield SOL back to your wallet.</p>
          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Amount (SOL)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.5"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs">
            <p>
              Shielded balance: {shieldedBalance.toFixed(4)} SOL
            </p>
            <p className="mt-1">A small fee is deducted for withdrawal.</p>
          </div>
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={STATUS_PROGRESS[status]} />
              <p className="text-xs text-center">{STATUS_LABELS[status]}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || isProcessing}>
              {isProcessing ? "Processing..." : "Withdraw"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
