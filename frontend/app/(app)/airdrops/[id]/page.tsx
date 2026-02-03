"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play, Rocket, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AirdropProgress } from "@/components/AirdropProgress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  useCampaign,
  useCancelCampaign,
  useDeleteCampaign,
  useFundCampaign,
  usePrepareCampaign,
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
  const router = useRouter();
  const wallet = useAuthStore((state) => state.wallet);
  const { data: campaign, isLoading, error } = useCampaign(id);
  const { mutateAsync: startCampaign, isPending: isStarting } =
    useStartCampaign();
  const { mutateAsync: cancelCampaign, isPending: isCancelling } =
    useCancelCampaign(id);
  const { mutateAsync: deleteCampaign, isPending: isDeleting } =
    useDeleteCampaign(id);
  const { mutateAsync: prepareCampaign, isPending: isPreparing } =
    usePrepareCampaign();
  const { mutateAsync: fundCampaign, isPending: isFunding } =
    useFundCampaign();

  const [prepareResult, setPrepareResult] = useState<{
    recipientCount: number;
    totalTokensNeeded: number;
    estimatedFeeSOL: number;
    fundTransaction: string;
  } | null>(null);

  const isCreator = campaign?.creatorWallet === wallet;

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

  const handleDelete = async () => {
    try {
      await deleteCampaign();
      toast.success("Campaign deleted");
      router.push("/airdrops");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete"
      );
    }
  };

  const handlePrepare = async () => {
    try {
      const result = await prepareCampaign(id);
      setPrepareResult(result);
      toast.success(`Found ${result.recipientCount} recipients`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to prepare"
      );
    }
  };

  const handleFundAndStart = async () => {
    if (!prepareResult) return;
    try {
      await fundCampaign({ id, fundTransaction: prepareResult.fundTransaction });
      toast.success("Campaign funded");
      await startCampaign(id);
      toast.success("Airdrop started!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fund"
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
    campaign.totalRecipients -
    campaign.successfulTransfers -
    campaign.failedTransfers;

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
              total={campaign.totalRecipients}
              sent={campaign.successfulTransfers}
              failed={campaign.failedTransfers}
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
                {campaign.audienceType.replaceAll("_", " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipients</span>
              <span className="text-foreground">
                {campaign.totalRecipients}
              </span>
            </div>
            {campaign.tokenMint && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token</span>
                <span className="text-foreground font-mono text-xs">
                  {formatWallet(campaign.tokenMint, 6)}
                </span>
              </div>
            )}
            {campaign.amountPerRecipient && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount each</span>
                <span className="text-foreground">
                  {campaign.amountPerRecipient}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creator</span>
              <span className="text-foreground font-mono text-xs">
                {formatWallet(campaign.creatorWallet, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">
                {formatTimestamp(campaign.createdAt)}
              </span>
            </div>
            {campaign.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="text-foreground">
                  {formatTimestamp(campaign.completedAt)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prepare result for draft campaigns */}
      {campaign.status === "draft" && prepareResult && (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold text-foreground">Ready to send</p>
            <Separator className="bg-border/70" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients</span>
                <span className="text-foreground">{prepareResult.recipientCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total tokens</span>
                <span className="text-foreground">{prepareResult.totalTokensNeeded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. fee</span>
                <span className="text-foreground">{prepareResult.estimatedFeeSOL.toFixed(4)} SOL</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          {campaign.status === "funded" && (
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
          {campaign.status === "draft" && !prepareResult && (
            <Button
              className="flex-1 gap-2"
              onClick={handlePrepare}
              disabled={isPreparing}
            >
              {isPreparing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Prepare
            </Button>
          )}
          {campaign.status === "draft" && prepareResult && (
            <Button
              className="flex-1 gap-2"
              onClick={handleFundAndStart}
              disabled={isFunding || isStarting}
            >
              {isFunding || isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Fund & Start
            </Button>
          )}
          {campaign.status === "draft" && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
