import { useEffect, useMemo, useState } from "react"
import { useDynamicContext } from "@dynamic-labs/sdk-react-core"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { signAndSubmitTransaction } from "@/lib/solana"
import { usePrivateTip, usePrivacyBalance, usePrivacySettings } from "@/hooks/usePrivacy"
import { useTip } from "@/hooks/usePayments"
import { usePrivacyStore } from "@/store/privacyStore"
import { useUIStore } from "@/store/uiStore"

const presets = [0.1, 0.5, 1]

export function TipModal() {
  const { primaryWallet } = useDynamicContext()
  const { data: privacySettings } = usePrivacySettings()
  const { data: privacyBalance } = usePrivacyBalance()
  const openShieldModal = usePrivacyStore((state) => state.openShieldModal)
  const isOpen = useUIStore((state) => state.isTipModalOpen)
  const tipTarget = useUIStore((state) => state.tipTarget)
  const closeTipModal = useUIStore((state) => state.closeTipModal)
  const [amount, setAmount] = useState("0.1")
  const [isPrivate, setIsPrivate] = useState(false)

  useEffect(() => {
    if (privacySettings) {
      setIsPrivate(privacySettings.default_private_tips)
    }
  }, [privacySettings])

  const privateBalance = privacyBalance?.available ?? 0
  const amountValue = Number.parseFloat(amount) || 0
  const canSendPrivate = amountValue > 0 && privateBalance >= amountValue

  const { mutateAsync: sendPrivateTip, isPending: isPrivatePending } =
    usePrivateTip()
  const { mutateAsync: sendPublicTip, isPending: isPublicPending } = useTip()
  const isPending = isPublicPending || isPrivatePending

  const recipient = useMemo(
    () => tipTarget?.wallet ?? "creator",
    [tipTarget]
  )

  useEffect(() => {
    if (isOpen && !tipTarget) {
      closeTipModal()
    }
  }, [closeTipModal, isOpen, tipTarget])

  const handleSubmit = async () => {
    if (!primaryWallet) {
      toast.error("Connect your wallet to continue")
      return
    }
    if (!amountValue || amountValue <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (!tipTarget) {
      toast.error("Missing creator")
      return
    }
    if (isPrivate && !canSendPrivate) {
      toast.error("Insufficient shielded balance")
      return
    }

    try {
      if (isPrivate) {
        const transaction = await sendPrivateTip({
            creatorWallet: tipTarget.wallet,
            amount: amountValue,
            postId: tipTarget.postId,
        })
        await signAndSubmitTransaction(transaction.transaction, primaryWallet)
      } else {
        await sendPublicTip({
          creatorWallet: tipTarget.wallet,
          amountInSol: amountValue,
          postId: tipTarget.postId,
        })
      }
      toast.success("Tip sent")
      closeTipModal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tip failed")
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeTipModal()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a tip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Support {recipient} with a quick tip.</p>
          <div className="space-y-2">
            <Label htmlFor="tip-amount">Amount (SOL)</Label>
            <Input
              id="tip-amount"
              type="number"
              min="0"
              step="0.01"
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
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/40 p-3">
            <div>
              <Label>Tip privately</Label>
              <p className="text-xs text-muted-foreground">
                Hide your identity from the creator.
              </p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          {isPrivate ? (
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs">
              <p>Shielded balance: {privateBalance.toFixed(2)} SOL</p>
              {!canSendPrivate ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-xs"
                  onClick={openShieldModal}
                >
                  Shield more SOL
                </Button>
              ) : null}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeTipModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              Send tip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
