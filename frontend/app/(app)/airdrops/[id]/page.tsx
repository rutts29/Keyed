"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Play, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AirdropProgress } from "@/components/AirdropProgress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  useCampaign,
  useCancelCampaign,
  useStartCampaign,
} from "@/hooks/useAirdrops";
import { statusConfig } from "@/lib/airdrop-config";
import { formatTimestamp, formatWallet } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

type CampaignPageProps = {
  params: Promise<{ id: string }>;
};

export default function CampaignDetailPage({ params }: CampaignPageProps) {
  const { id } = use(params);
  const wallet = useAuthStore((state) => state.wallet);
  const { data: campaign, isLoading, error } = useCampaign(id);
  const { mutateAsync: startCampaign, isPending: isStarting } =
    useStartCampaign();
  const { mutateAsync: cancelCampaign, isPending: isCancelling } =
    useCancelCampaign(id);

  const isCreator = campaign?.creator_wallet === wallet;

  const handleStart = async () => {
    try {
      await startCampaign(id);
      toast.success("Airdrop started");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start"
      );
    }
  };

  const handleCancel = async () => {
    try {
      await cancelCampaign();
      toast.success("Campaign cancelled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">Campaign not found.</p>
          <Button variant="secondary" className="mt-4" asChild>
            <Link href="/airdrops">Back to airdrops</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = statusConfig[campaign.status];
  const pending =
    campaign.total_recipients -
    campaign.successful_transfers -
    campaign.failed_transfers;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/airdrops">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {campaign.name}
          </h1>
          {campaign.description && (
            <p className="text-xs text-muted-foreground">
              {campaign.description}
            </p>
          )}
        </div>
        <Badge variant="outline" className={`text-xs ${status.className}`}>
          {status.label}
        </Badge>
      </div>

      {/* Progress */}
      {(campaign.status === "processing" ||
        campaign.status === "completed" ||
        campaign.status === "failed") && (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="p-4">
            <AirdropProgress
              total={campaign.total_recipients}
              sent={campaign.successful_transfers}
              failed={campaign.failed_transfers}
              pending={pending}
            />
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold text-foreground">Details</p>
          <Separator className="bg-border/70" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="text-foreground">
                {campaign.type === "spl_token" ? "SPL Token" : "cNFT"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Audience</span>
              <span className="text-foreground capitalize">
                {campaign.audience_type.replaceAll("_", " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipients</span>
              <span className="text-foreground">
                {campaign.total_recipients}
              </span>
            </div>
            {campaign.token_mint && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token</span>
                <span className="text-foreground font-mono text-xs">
                  {formatWallet(campaign.token_mint, 6)}
                </span>
              </div>
            )}
            {campaign.amount_per_recipient && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount each</span>
                <span className="text-foreground">
                  {campaign.amount_per_recipient}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creator</span>
              <span className="text-foreground font-mono text-xs">
                {formatWallet(campaign.creator_wallet, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">
                {formatTimestamp(campaign.created_at)}
              </span>
            </div>
            {campaign.completed_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="text-foreground">
                  {formatTimestamp(campaign.completed_at)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {isCreator && (
        <div className="flex gap-2">
          {campaign.status === "funded" && (
            <Button
              className="flex-1 gap-2"
              onClick={handleStart}
              disabled={isStarting}
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Airdrop
            </Button>
          )}
          {(campaign.status === "draft" ||
            campaign.status === "funded") && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
