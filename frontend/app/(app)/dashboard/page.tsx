"use client";

import { useState } from "react";
import { toast } from "sonner";

import { PrivateTipsReceived } from "@/components/PrivateTipsReceived";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCreatorVault, useEarnings, useWithdrawEarnings } from "@/hooks/usePayments";
import { lamportsToSol } from "@/lib/solana";

export default function DashboardPage() {
  const { data: earnings } = useEarnings();
  const { data: vault } = useCreatorVault();
  const { mutateAsync, isPending } = useWithdrawEarnings();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const recentTransactions = earnings?.recentTransactions ?? [];

  const handleWithdraw = async () => {
    const value = Number.parseFloat(withdrawAmount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await mutateAsync(value);
      toast.success("Withdrawal submitted");
      setWithdrawAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Withdraw failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Creator earnings
          </h1>
        </div>
        <Badge variant="secondary">Live payouts</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total tips</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {earnings ? lamportsToSol(earnings.totalTips).toFixed(2) : "--"} SOL
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Subscribers</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {earnings?.subscriberCount ?? "--"}
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Available balance</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {vault ? lamportsToSol(vault.availableBalance).toFixed(2) : "--"} SOL
          </CardContent>
        </Card>
      </div>
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Recent transactions
            </p>
            <p>Track tips, subscriptions, and withdrawals in real time.</p>
          </div>
          <Separator className="bg-border/70" />
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Amount in SOL"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              className="h-9 w-40"
            />
            <Button className="h-9" onClick={handleWithdraw} disabled={isPending}>
              Withdraw earnings
            </Button>
          </div>
          <Separator className="bg-border/70" />
          <div className="space-y-2 text-xs">
            {recentTransactions.length === 0 ? (
              <p>No recent transactions yet.</p>
            ) : (
              recentTransactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.signature}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2"
                >
                  <div>
                    <p className="text-foreground">{tx.type.toUpperCase()}</p>
                    <p className="text-muted-foreground">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground">
                      {tx.amount
                        ? `${lamportsToSol(tx.amount).toFixed(2)} SOL`
                        : "--"}
                    </p>
                    <p className="text-muted-foreground">{tx.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <PrivateTipsReceived />
    </div>
  );
}
