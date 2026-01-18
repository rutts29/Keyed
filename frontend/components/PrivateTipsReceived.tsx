"use client"

import { Card, CardContent } from "@/components/ui/card"
import { usePrivateTipsReceived } from "@/hooks/usePrivacy"
import { lamportsToSol } from "@/lib/solana"

export function PrivateTipsReceived() {
  const { data, isLoading } = usePrivateTipsReceived()
  const tips = data?.tips ?? []

  return (
    <Card className="border-border/70 bg-card/70">
      <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Private tips received
          </p>
          <p>Anonymous tips from your supporters.</p>
        </div>
        {isLoading ? (
          <p>Loading private tips...</p>
        ) : tips.length === 0 ? (
          <p>No private tips yet.</p>
        ) : (
          <div className="space-y-2">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-xs"
              >
                <span>{lamportsToSol(tip.amount).toFixed(2)} SOL</span>
                <span>{new Date(tip.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
