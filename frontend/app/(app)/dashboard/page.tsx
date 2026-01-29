"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ArrowUp,
  Calendar,
  CircleDollarSign,
  CreditCard,
  FileText,
  Star,
  CheckCircle,
  Users,
} from "lucide-react";
import { PrivateTipsReceived } from "@/components/PrivateTipsReceived";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreatorVault, useEarnings, useWithdrawEarnings } from "@/hooks/usePayments";
import { usePrivateTipsReceived } from "@/hooks/usePrivacy";
import { lamportsToSol } from "@/lib/solana";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types";

import { formatWallet, formatTimestamp } from "@/lib/format";

type FilterType = "all" | "tip" | "subscribe" | "withdrawal";

// Get transaction type color classes
function getTypeColor(type: TransactionType | "withdrawal"): string {
  switch (type) {
    case "tip":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "subscribe":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "withdrawal":
      return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    default:
      return "text-muted-foreground bg-muted/50 border-border/50";
  }
}

// Get status badge styles
function getStatusStyles(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/10 text-emerald-400";
    case "pending":
      return "bg-amber-500/10 text-amber-400";
    case "failed":
      return "bg-rose-500/10 text-rose-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// CSS-only Bar Chart Component
function EarningsChart({
  data,
  isLoading,
}: {
  data: { date: string; amount: number; label: string }[];
  isLoading: boolean;
}) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  if (isLoading) {
    return (
      <div className="flex h-40 items-end gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Chart grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-t border-border/30 w-full" />
        ))}
      </div>

      {/* Bars */}
      <div className="relative flex h-40 items-end gap-1.5">
        {data.map((item, index) => {
          const heightPercent = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          return (
            <div
              key={item.date}
              className="group relative flex-1 flex flex-col items-center"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="bg-popover border border-border rounded-md px-2 py-1 text-xs shadow-lg">
                  <p className="font-medium text-foreground">
                    {item.amount.toFixed(2)} SOL
                  </p>
                  <p className="text-muted-foreground">{item.label}</p>
                </div>
              </div>

              {/* Bar */}
              <div
                className="w-full rounded-t-sm transition-all duration-500 ease-out cursor-pointer hover:opacity-80"
                style={{
                  height: `${Math.max(heightPercent, 2)}%`,
                  background: `linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 100%)`,
                  animationDelay: `${index * 50}ms`,
                }}
              />

              {/* Label */}
              <p className="mt-2 text-[10px] text-muted-foreground truncate w-full text-center">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Glow effect */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{
          background: `linear-gradient(to top, hsl(var(--primary) / 0.1), transparent)`,
        }}
      />
    </div>
  );
}

// Stat Card Component with animations
function StatCard({
  title,
  value,
  suffix,
  growth,
  isLoading,
  icon,
}: {
  title: string;
  value: string;
  suffix?: string;
  growth?: number;
  isLoading: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/70 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-semibold text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              {value}
            </span>
            {suffix && (
              <span className="text-sm text-muted-foreground">{suffix}</span>
            )}
            {growth !== undefined && growth !== 0 && (
              <span
                className={cn(
                  "ml-auto flex items-center gap-0.5 text-xs font-medium",
                  growth > 0 ? "text-emerald-400" : "text-rose-400"
                )}
              >
                <ArrowUp className={cn("h-3 w-3", growth < 0 && "rotate-180")} />
                {Math.abs(growth).toFixed(0)}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Transaction Item Component
function TransactionItem({ tx }: { tx: Transaction }) {
  const typeLabel = tx.type === "subscribe" ? "Subscription" : tx.type.charAt(0).toUpperCase() + tx.type.slice(1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium",
            getTypeColor(tx.type)
          )}
        >
          {tx.type === "tip" && <CircleDollarSign className="h-4 w-4" />}
          {tx.type === "subscribe" && <Star className="h-4 w-4" />}
          {tx.type !== "tip" && tx.type !== "subscribe" && <CheckCircle className="h-4 w-4" />}
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">{typeLabel}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>From: {formatWallet(tx.fromWallet)}</span>
            <span className="text-border">|</span>
            <span>{formatTimestamp(tx.timestamp)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-right">
        <div>
          <p className="text-sm font-medium text-foreground">
            {tx.amount ? `+${lamportsToSol(tx.amount).toFixed(4)} SOL` : "--"}
          </p>
          <Badge variant="outline" className={cn("text-[10px]", getStatusStyles(tx.status))}>
            {tx.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Analytics Breakdown Card
function AnalyticsBreakdown({
  publicTips,
  privateTips,
  isLoading,
}: {
  publicTips: number;
  privateTips: number;
  isLoading: boolean;
}) {
  const total = publicTips + privateTips;
  const publicPercent = total > 0 ? (publicTips / total) * 100 : 0;
  const privatePercent = total > 0 ? (privateTips / total) * 100 : 0;
  const hasData = total > 0;

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Tip Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !hasData ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>No tips received yet</p>
            <p className="text-xs mt-1">Analytics will appear here once you receive tips</p>
          </div>
        ) : (
          <>
            {/* Ratio Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Public Tips</span>
                <span className="text-muted-foreground">Private Tips</span>
              </div>
              <div className="h-3 flex rounded-full overflow-hidden bg-muted/50">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${publicPercent}%` }}
                />
                <div
                  className="bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-500"
                  style={{ width: `${privatePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-emerald-400">
                  {publicTips.toFixed(2)} SOL ({publicPercent.toFixed(0)}%)
                </span>
                <span className="text-violet-400">
                  {privateTips.toFixed(2)} SOL ({privatePercent.toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Stats */}
            <Separator className="bg-border/50" />
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {total.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Total Tips (SOL)</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {Math.round((privateTips / total) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Privacy Rate</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: earnings, isLoading: earningsLoading } = useEarnings();
  const { data: vault, isLoading: vaultLoading } = useCreatorVault();
  const { data: privateTipsData, isLoading: privateTipsLoading } = usePrivateTipsReceived();
  const { mutateAsync, isPending } = useWithdrawEarnings();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [visibleCount, setVisibleCount] = useState(5);

  const recentTransactions = useMemo(
    () => earnings?.recentTransactions ?? [],
    [earnings?.recentTransactions]
  );

  // Calculate chart data from transactions (last 7 days)
  const chartData = useMemo(() => {
    const days: { date: string; amount: number; label: string }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

      const dayAmount = recentTransactions
        .filter((tx) => {
          const txDate = new Date(tx.timestamp).toISOString().split("T")[0];
          return txDate === dateStr && (tx.type === "tip" || tx.type === "subscribe");
        })
        .reduce((sum, tx) => sum + lamportsToSol(tx.amount ?? 0), 0);

      days.push({ date: dateStr, amount: dayAmount, label: dayLabel });
    }

    return days;
  }, [recentTransactions]);

  // Calculate this month's earnings
  const thisMonthEarnings = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return recentTransactions
      .filter((tx) => {
        const txDate = new Date(tx.timestamp);
        return txDate >= monthStart && (tx.type === "tip" || tx.type === "subscribe");
      })
      .reduce((sum, tx) => sum + lamportsToSol(tx.amount ?? 0), 0);
  }, [recentTransactions]);

  // Calculate previous month for growth comparison
  const lastMonthEarnings = useMemo(() => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return recentTransactions
      .filter((tx) => {
        const txDate = new Date(tx.timestamp);
        return (
          txDate >= lastMonthStart &&
          txDate <= lastMonthEnd &&
          (tx.type === "tip" || tx.type === "subscribe")
        );
      })
      .reduce((sum, tx) => sum + lamportsToSol(tx.amount ?? 0), 0);
  }, [recentTransactions]);

  const monthlyGrowth = useMemo(() => {
    if (lastMonthEarnings === 0) return thisMonthEarnings > 0 ? 100 : 0;
    return ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100;
  }, [thisMonthEarnings, lastMonthEarnings]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (activeFilter === "all") return recentTransactions;
    if (activeFilter === "withdrawal") {
      // Note: withdrawals might not be in recentTransactions, show none for now
      return [];
    }
    return recentTransactions.filter((tx) => tx.type === activeFilter);
  }, [recentTransactions, activeFilter]);

  // Calculate private tips total (in SOL)
  const privateTipsTotal = useMemo(() => {
    const tips = privateTipsData?.tips ?? [];
    return tips.reduce((sum, tip) => sum + lamportsToSol(tip.amount), 0);
  }, [privateTipsData]);

  // Calculate public tips total (in SOL)
  const publicTipsTotal = useMemo(() => {
    return recentTransactions
      .filter((tx) => tx.type === "tip")
      .reduce((sum, tx) => sum + lamportsToSol(tx.amount ?? 0), 0);
  }, [recentTransactions]);

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

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 5, filteredTransactions.length));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Creator earnings
          </h1>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live payouts
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total tips"
          value={earnings ? lamportsToSol(earnings.totalTips).toFixed(2) : "--"}
          suffix="SOL"
          isLoading={earningsLoading}
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Subscribers"
          value={earnings?.subscriberCount?.toString() ?? "--"}
          isLoading={earningsLoading}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Available balance"
          value={vault ? lamportsToSol(vault.availableBalance).toFixed(2) : "--"}
          suffix="SOL"
          isLoading={vaultLoading}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="This month"
          value={thisMonthEarnings.toFixed(2)}
          suffix="SOL"
          growth={monthlyGrowth}
          isLoading={earningsLoading}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Earnings Chart */}
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              Earnings Trend (Last 7 Days)
            </CardTitle>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-foreground">
                {chartData.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">SOL total</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EarningsChart data={chartData} isLoading={earningsLoading} />
        </CardContent>
      </Card>

      {/* Analytics Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsBreakdown
          publicTips={publicTipsTotal}
          privateTips={privateTipsTotal}
          isLoading={earningsLoading || privateTipsLoading}
        />

        {/* Withdrawal Section */}
        <Card className="border-border/70 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Withdraw Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Transfer your available balance to your connected wallet.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[120px]">
                <Input
                  placeholder="Amount"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  className="h-10 pr-12"
                  type="number"
                  step="0.01"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  SOL
                </span>
              </div>
              <Button
                onClick={handleWithdraw}
                disabled={isPending}
                className="h-10"
              >
                {isPending ? "Processing..." : "Withdraw"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Available: {vault ? lamportsToSol(vault.availableBalance).toFixed(4) : "--"} SOL
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm text-muted-foreground">
              Recent Transactions
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.length} transactions
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Tabs */}
          <Tabs
            value={activeFilter}
            onValueChange={(v) => {
              setActiveFilter(v as FilterType);
              setVisibleCount(5);
            }}
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="tip">Tips</TabsTrigger>
              <TabsTrigger value="subscribe">Subscriptions</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
            </TabsList>

            <TabsContent value={activeFilter} className="mt-4 space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-50" strokeWidth={1} />
                  <p className="text-sm">No transactions found</p>
                  <p className="text-xs">
                    {activeFilter === "withdrawal"
                      ? "Your withdrawal history will appear here"
                      : "Transactions will appear as you receive tips and subscriptions"}
                  </p>
                </div>
              ) : (
                <>
                  {filteredTransactions.slice(0, visibleCount).map((tx) => (
                    <TransactionItem key={tx.signature} tx={tx} />
                  ))}

                  {/* Load More */}
                  {visibleCount < filteredTransactions.length && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadMore}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Load more ({filteredTransactions.length - visibleCount} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Private Tips Section */}
      <PrivateTipsReceived />
    </div>
  );
}
