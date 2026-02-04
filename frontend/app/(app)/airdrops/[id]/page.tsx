"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Edit,
  Loader2,
  Play,
  Rocket,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AirdropProgress } from "@/components/AirdropProgress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  useBuildFundTx,
  useBuildRefundTx,
  useCampaign,
  useCancelCampaign,
  useConfirmCancel,
  useConfirmCreate,
  useConfirmFund,
  useDeleteCampaign,
  usePrepareCampaign,
  useStartCampaign,
} from "@/hooks/useAirdrops";
import { statusConfig } from "@/lib/airdrop-config";
import { formatTimestamp, formatWallet } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

type CampaignPageProps = {
  params: Promise<{ id: string }>;
};

// Flow state for multi-step on-chain flow
type FlowState = {
  step:
    | "idle"
    | "preparing"
    | "ready_to_create"
    | "creating"
    | "building_fund"
    | "ready_to_fund"
    | "funding"
    | "starting"
    | "building_refund"
    | "ready_to_refund"
    | "refunding";
  prepareData?: {
    recipientCount: number;
    totalTokensNeeded: number;
    estimatedFeeSOL: number;
    createCampaignTx: string;
    campaignPda: string;
    escrowAta: string;
    creatorBalance: number;
    hasSufficientBalance: boolean;
  };
  fundData?: {
    transaction: string;
    totalAmount: number;
    escrowAta: string;
  };
  refundData?: {
    transaction: string;
    refundAmount: number;
  };
};

export default function CampaignDetailPage({ params }: CampaignPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const wallet = useAuthStore((state) => state.wallet);
  const { data: campaign, isLoading, error, refetch } = useCampaign(id);

  // Mutations
  const { mutateAsync: prepareCampaign } = usePrepareCampaign();
  const { mutateAsync: confirmCreate } = useConfirmCreate();
  const { mutateAsync: buildFundTx } = useBuildFundTx();
  const { mutateAsync: confirmFund } = useConfirmFund();
  const { mutateAsync: startCampaign } = useStartCampaign();
  const { mutateAsync: cancelCampaign } = useCancelCampaign(id);
  const { mutateAsync: deleteCampaign } = useDeleteCampaign(id);
  const { mutateAsync: buildRefundTx } = useBuildRefundTx();
  const { mutateAsync: confirmCancel } = useConfirmCancel();

  // Flow state for multi-step operations
  const [flow, setFlow] = useState<FlowState>({ step: "idle" });

  const isCreator = campaign?.creatorWallet === wallet;
  const isLoaderActive = flow.step !== "idle";

  // Step 1: Prepare campaign (resolve audience, build createCampaignTx)
  const handlePrepare = async () => {
    try {
      setFlow({ step: "preparing" });
      const result = await prepareCampaign(id);
      setFlow({ step: "ready_to_create", prepareData: result });
      toast.success(`Found ${result.recipientCount} recipients`);
    } catch (error) {
      setFlow({ step: "idle" });
      toast.error(error instanceof Error ? error.message : "Failed to prepare");
    }
  };

  // Step 2: Sign and submit createCampaignTx
  const handleCreate = async () => {
    if (!flow.prepareData) return;
    try {
      setFlow((f) => ({ ...f, step: "creating" }));
      await confirmCreate({
        id,
        createCampaignTx: flow.prepareData.createCampaignTx,
      });
      toast.success("Campaign created on-chain");
      await refetch();
      // Move to fund step
      setFlow((f) => ({ ...f, step: "building_fund" }));
      const fundData = await buildFundTx(id);
      setFlow((f) => ({ ...f, step: "ready_to_fund", fundData }));
    } catch (error) {
      setFlow({ step: "idle" });
      toast.error(
        error instanceof Error ? error.message : "Failed to create campaign"
      );
    }
  };

  // Step 3: Get fund transaction (for created campaigns)
  const handleGetFundTx = async () => {
    try {
      setFlow({ step: "building_fund" });
      const fundData = await buildFundTx(id);
      setFlow({ step: "ready_to_fund", fundData });
    } catch (error) {
      setFlow({ step: "idle" });
      toast.error(
        error instanceof Error ? error.message : "Failed to build fund transaction"
      );
    }
  };

  // Step 4: Sign and submit fund transaction
  const handleFund = async () => {
    if (!flow.fundData) return;
    try {
      setFlow((f) => ({ ...f, step: "funding" }));
      await confirmFund({ id, fundTransaction: flow.fundData.transaction });
      toast.success("Campaign funded");
      await refetch();
      setFlow({ step: "idle" });
    } catch (error) {
      setFlow({ step: "idle" });
      toast.error(error instanceof Error ? error.message : "Failed to fund");
    }
  };

  // Step 5: Start distribution
  const handleStart = async () => {
    try {
      setFlow({ step: "starting" });
      await startCampaign(id);
      toast.success("Airdrop started");
      await refetch();
      setFlow({ step: "idle" });
    } catch (error) {
      setFlow({ step: "idle" });
      toast.error(error instanceof Error ? error.message : "Failed to start");
    }
  };

  // Cancel flow: Get refund transaction
  const handleGetRefundTx = async () => {
    try {
      setFlow({ step: "building_refund" });
      const refundData = await buildRefundTx(id);
      setFlow({ step: "ready_to_refund", refundData });
    } catch (error) {
      setFlow({ step: "idle" });
      toast.error(
        error instanceof Error ? error.message : "Failed to build refund transaction"
      );
    }
  };

  // Cancel flow: Sign refund and confirm cancel
  const handleRefundAndCancel = async () => {
    if (!flow.refundData) return;
    try {
      setFlow((f) => ({ ...f, step: "refunding" }));
      await confirmCancel({ id, refundTransaction: flow.refundData.transaction });
      toast.success("Campaign cancelled, tokens refunded");
      await refetch();
      setFlow({ step: "idle" });
    } catch (error) {
      setFlow({ step: "idle" });
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    }
  };

  // Simple cancel for draft campaigns (no on-chain state)
  const handleSimpleCancel = async () => {
    try {
      setFlow({ step: "refunding" });
      await cancelCampaign();
      toast.success("Campaign cancelled");
      await refetch();
      setFlow({ step: "idle" });
    } catch (error) {
      setFlow({ step: "idle" });
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    }
  };

  // Delete draft campaign
  const handleDelete = async () => {
    try {
      await deleteCampaign();
      toast.success("Campaign deleted");
      router.push("/airdrops");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
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

  const status = statusConfig[campaign.status] || statusConfig.draft;
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
              <span className="text-foreground">{campaign.totalRecipients}</span>
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
      {campaign.status === "draft" && flow.prepareData && (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold text-foreground">
              Ready to create on-chain
            </p>
            <Separator className="bg-border/70" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients</span>
                <span className="text-foreground">
                  {flow.prepareData.recipientCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total tokens needed</span>
                <span className="text-foreground">
                  {flow.prepareData.totalTokensNeeded}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your balance</span>
                <span
                  className={
                    flow.prepareData.hasSufficientBalance
                      ? "text-foreground"
                      : "text-destructive"
                  }
                >
                  {flow.prepareData.creatorBalance}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. fee</span>
                <span className="text-foreground">
                  {flow.prepareData.estimatedFeeSOL.toFixed(4)} SOL
                </span>
              </div>
            </div>
            {!flow.prepareData.hasSufficientBalance && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Insufficient balance. You need{" "}
                  {flow.prepareData.totalTokensNeeded -
                    flow.prepareData.creatorBalance}{" "}
                  more tokens.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fund transaction ready */}
      {flow.step === "ready_to_fund" && flow.fundData && (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold text-foreground">
              Ready to fund escrow
            </p>
            <Separator className="bg-border/70" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount to transfer</span>
                <span className="text-foreground">{flow.fundData.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Escrow</span>
                <span className="text-foreground font-mono text-xs">
                  {formatWallet(flow.fundData.escrowAta, 6)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund transaction ready */}
      {flow.step === "ready_to_refund" && flow.refundData && (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold text-foreground">
              Confirm refund and cancel
            </p>
            <Separator className="bg-border/70" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund amount</span>
                <span className="text-foreground">
                  {flow.refundData.refundAmount}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {isCreator && (
        <div className="flex gap-2">
          {/* Draft: Edit button */}
          {campaign.status === "draft" && (
            <Button variant="outline" className="gap-2" asChild>
              <Link href={`/airdrops/${id}/edit`}>
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}

          {/* Draft: Prepare button */}
          {campaign.status === "draft" && flow.step === "idle" && (
            <Button className="flex-1 gap-2" onClick={handlePrepare}>
              <Rocket className="h-4 w-4" />
              Prepare
            </Button>
          )}

          {/* Draft: Preparing... */}
          {campaign.status === "draft" && flow.step === "preparing" && (
            <Button className="flex-1 gap-2" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing...
            </Button>
          )}

          {/* Draft: Create on-chain button */}
          {campaign.status === "draft" && flow.step === "ready_to_create" && (
            <Button
              className="flex-1 gap-2"
              onClick={handleCreate}
              disabled={!flow.prepareData?.hasSufficientBalance}
            >
              <Wallet className="h-4 w-4" />
              Create Campaign (Sign)
            </Button>
          )}

          {/* Creating... */}
          {flow.step === "creating" && (
            <Button className="flex-1 gap-2" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </Button>
          )}

          {/* Created: Fund button */}
          {campaign.status === "created" && flow.step === "idle" && (
            <Button className="flex-1 gap-2" onClick={handleGetFundTx}>
              <Wallet className="h-4 w-4" />
              Fund Campaign
            </Button>
          )}

          {/* Building fund tx... */}
          {flow.step === "building_fund" && (
            <Button className="flex-1 gap-2" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </Button>
          )}

          {/* Ready to fund button */}
          {flow.step === "ready_to_fund" && (
            <Button className="flex-1 gap-2" onClick={handleFund}>
              <Check className="h-4 w-4" />
              Confirm Fund (Sign)
            </Button>
          )}

          {/* Funding... */}
          {flow.step === "funding" && (
            <Button className="flex-1 gap-2" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Funding...
            </Button>
          )}

          {/* Funded: Start button */}
          {campaign.status === "funded" && flow.step === "idle" && (
            <Button className="flex-1 gap-2" onClick={handleStart}>
              <Play className="h-4 w-4" />
              Start Airdrop
            </Button>
          )}

          {/* Starting... */}
          {flow.step === "starting" && (
            <Button className="flex-1 gap-2" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting...
            </Button>
          )}

          {/* Funded: Cancel with refund */}
          {campaign.status === "funded" && flow.step === "idle" && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleGetRefundTx}
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
          )}

          {/* Created: Simple cancel (no funds yet) */}
          {campaign.status === "created" && flow.step === "idle" && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleSimpleCancel}
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
          )}

          {/* Building refund... */}
          {flow.step === "building_refund" && (
            <Button variant="destructive" className="gap-2" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </Button>
          )}

          {/* Ready to refund */}
          {flow.step === "ready_to_refund" && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleRefundAndCancel}
            >
              <Check className="h-4 w-4" />
              Confirm Refund (Sign)
            </Button>
          )}

          {/* Refunding... */}
          {flow.step === "refunding" && (
            <Button variant="destructive" className="gap-2" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Cancelling...
            </Button>
          )}

          {/* Draft: Delete button (only when idle, not during flow) */}
          {campaign.status === "draft" && flow.step === "idle" && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}

          {/* Cancelled: Delete button */}
          {campaign.status === "cancelled" && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
