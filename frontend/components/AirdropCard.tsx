"use client";

import Link from "next/link";

import { AirdropProgress } from "@/components/AirdropProgress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { statusConfig } from "@/lib/airdrop-config";
import { formatTimestamp } from "@/lib/format";
import type { AirdropCampaign } from "@/types";

type AirdropCardProps = {
  campaign: AirdropCampaign;
};

export function AirdropCard({ campaign }: AirdropCardProps) {
  const status = statusConfig[campaign.status];
  const typeBadge = campaign.type === "spl_token" ? "SPL Token" : "cNFT";

  return (
    <Link href={`/airdrops/${campaign.id}`}>
      <Card className="border-border/70 bg-card/70 transition-colors hover:bg-muted/60 hover:border-border">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {campaign.name}
              </h3>
              {campaign.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {campaign.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {typeBadge}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                {status.label}
              </Badge>
            </div>
          </div>

          {(campaign.status === "processing" || campaign.status === "completed") && (
            <AirdropProgress
              total={campaign.total_recipients}
              sent={campaign.successful_transfers}
              failed={campaign.failed_transfers}
              pending={
                campaign.total_recipients -
                campaign.successful_transfers -
                campaign.failed_transfers
              }
            />
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{campaign.total_recipients} recipients</span>
            <span>{formatTimestamp(campaign.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
