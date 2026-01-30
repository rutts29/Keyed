"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, Plus } from "lucide-react";

import { AirdropCard } from "@/components/AirdropCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyCampaigns, useReceivedDrops } from "@/hooks/useAirdrops";
import { formatTimestamp } from "@/lib/format";

function CampaignListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/70 bg-card/70">
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-60" />
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AirdropsPage() {
  const [tab, setTab] = useState<"campaigns" | "received">("campaigns");
  const { data: campaigns, isLoading: isLoadingCampaigns } = useMyCampaigns();
  const { data: received, isLoading: isLoadingReceived } = useReceivedDrops();

  const isLoading =
    tab === "campaigns" ? isLoadingCampaigns : isLoadingReceived;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Airdrops</h1>
        <Button size="sm" className="gap-1.5" asChild>
          <Link href="/airdrops/create">
            <Plus className="h-3.5 w-3.5" />
            New Campaign
          </Link>
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "campaigns" | "received")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-muted/40">
          <TabsTrigger value="campaigns">My Campaigns</TabsTrigger>
          <TabsTrigger value="received">Received Drops</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <CampaignListSkeleton />}

      {/* My Campaigns tab */}
      {tab === "campaigns" && !isLoadingCampaigns && (
        <>
          {(!campaigns || campaigns.length === 0) && (
            <Card className="border-border/70 bg-card/70">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Gift className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No campaigns yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Create your first airdrop to reward your community.
                </p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href="/airdrops/create">Create Campaign</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {campaigns && campaigns.length > 0 && (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <AirdropCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Received Drops tab */}
      {tab === "received" && !isLoadingReceived && (
        <>
          {(!received || received.length === 0) && (
            <Card className="border-border/70 bg-card/70">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Gift className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No drops received
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Follow creators and engage with the community to receive
                  airdrops.
                </p>
              </CardContent>
            </Card>
          )}
          {received && received.length > 0 && (
            <div className="space-y-3">
              {received.map((drop) => (
                <Card
                  key={drop.id}
                  className="border-border/70 bg-card/70"
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {drop.airdrop_campaigns.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(drop.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        drop.status === "sent"
                          ? "text-green-500 border-green-500/20"
                          : drop.status === "failed"
                            ? "text-red-500 border-red-500/20"
                            : ""
                      }
                    >
                      {drop.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
