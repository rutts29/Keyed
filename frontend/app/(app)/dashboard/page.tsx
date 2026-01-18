import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
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
          <CardContent className="text-2xl font-semibold">$4,820</CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Subscribers</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">214</CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Available balance</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">12.4 SOL</CardContent>
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
            <Button className="h-9">Withdraw earnings</Button>
            <Button variant="secondary" className="h-9">
              View payout history
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
