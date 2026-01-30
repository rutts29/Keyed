"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";

import { AudienceSelector } from "@/components/AudienceSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateCampaign,
  useFundCampaign,
  usePrepareCampaign,
  useStartCampaign,
} from "@/hooks/useAirdrops";
import type { AirdropAudienceType, AirdropType } from "@/types";

const STEPS = ["Details", "Token Config", "Audience", "Review"] as const;

export default function CreateAirdropPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1: Details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [airdropType, setAirdropType] = useState<AirdropType>("spl_token");

  // Step 2: Token config
  const [tokenMint, setTokenMint] = useState("");
  const [amountPerRecipient, setAmountPerRecipient] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [collectionMint, setCollectionMint] = useState("");

  // Step 3: Audience
  const [audienceType, setAudienceType] =
    useState<AirdropAudienceType>("followers");
  const [audienceFilter, setAudienceFilter] = useState<
    Record<string, unknown>
  >({});

  // Step 4: Prepare result
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [prepareResult, setPrepareResult] = useState<{
    recipientCount: number;
    totalTokensNeeded: number;
    estimatedFeeSOL: number;
    fundTransaction: string;
  } | null>(null);

  const { mutateAsync: createCampaign, isPending: isCreating } =
    useCreateCampaign();
  const { mutateAsync: prepare, isPending: isPreparing } =
    usePrepareCampaign();
  const { mutateAsync: fund, isPending: isFunding } =
    useFundCampaign();
  const { mutateAsync: start, isPending: isStarting } =
    useStartCampaign();

  const isBusy = isCreating || isPreparing || isFunding || isStarting;

  const handleCreateAndPrepare = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    try {
      // Create campaign
      const campaign = await createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        type: airdropType,
        tokenMint: airdropType === "spl_token" ? tokenMint.trim() || undefined : undefined,
        amountPerRecipient: amountPerRecipient
          ? Number(amountPerRecipient)
          : undefined,
        metadataUri: airdropType === "cnft" ? metadataUri.trim() || undefined : undefined,
        collectionMint: airdropType === "cnft" ? collectionMint.trim() || undefined : undefined,
        audienceType,
        audienceFilter:
          Object.keys(audienceFilter).length > 0 ? audienceFilter : undefined,
      });

      setCampaignId(campaign.id);

      // Prepare (resolve audience, build fund tx) — pass ID directly to avoid stale closure
      const result = await prepare(campaign.id);
      setPrepareResult(result);

      toast.success(`Found ${result.recipientCount} recipients`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to prepare campaign"
      );
    }
  };

  const handleFundAndStart = async () => {
    if (!prepareResult || !campaignId) return;

    try {
      await fund({ id: campaignId, fundTransaction: prepareResult.fundTransaction });
      toast.success("Campaign funded");

      await start(campaignId);
      toast.success("Airdrop started!");
      router.push(`/airdrops/${campaignId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fund campaign"
      );
    }
  };

  const canNext =
    step === 0
      ? Boolean(name.trim())
      : step === 1
        ? airdropType === "spl_token"
          ? Boolean(tokenMint.trim())
          : Boolean(metadataUri.trim())
        : true;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/airdrops")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          Create Airdrop
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                i <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs ${i <= step ? "text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="h-px w-6 bg-border" />
            )}
          </div>
        ))}
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6">
          {/* Step 1: Details */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Campaign name</Label>
                <Input
                  placeholder="e.g. Community Reward Drop"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="What is this airdrop for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[72px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Airdrop type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={airdropType === "spl_token" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAirdropType("spl_token")}
                  >
                    SPL Token
                  </Button>
                  <Button
                    type="button"
                    variant={airdropType === "cnft" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAirdropType("cnft")}
                  >
                    cNFT
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Token config */}
          {step === 1 && airdropType === "spl_token" && (
            <>
              <div className="space-y-2">
                <Label>Token mint address</Label>
                <Input
                  placeholder="Token mint pubkey"
                  value={tokenMint}
                  onChange={(e) => setTokenMint(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount per recipient</Label>
                <Input
                  type="number"
                  placeholder="e.g. 100"
                  value={amountPerRecipient}
                  onChange={(e) => setAmountPerRecipient(e.target.value)}
                />
              </div>
            </>
          )}
          {step === 1 && airdropType === "cnft" && (
            <>
              <div className="space-y-2">
                <Label>Metadata URI</Label>
                <Input
                  placeholder="https://arweave.net/..."
                  value={metadataUri}
                  onChange={(e) => setMetadataUri(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Collection mint (optional)</Label>
                <Input
                  placeholder="Collection mint pubkey"
                  value={collectionMint}
                  onChange={(e) => setCollectionMint(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Step 3: Audience */}
          {step === 2 && (
            <AudienceSelector
              value={audienceType}
              onChange={setAudienceType}
              filter={audienceFilter}
              onFilterChange={setAudienceFilter}
            />
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-foreground">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground">
                    {airdropType === "spl_token" ? "SPL Token" : "cNFT"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audience</span>
                  <span className="text-foreground capitalize">
                    {audienceType.replaceAll("_", " ")}
                  </span>
                </div>
                {tokenMint && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token</span>
                    <span className="text-foreground font-mono text-xs">
                      {tokenMint.slice(0, 8)}...{tokenMint.slice(-4)}
                    </span>
                  </div>
                )}
                {amountPerRecipient && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount each</span>
                    <span className="text-foreground">
                      {amountPerRecipient}
                    </span>
                  </div>
                )}
              </div>

              {prepareResult && (
                <div className="rounded-lg border border-border/70 bg-muted/40 p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Ready to send
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Recipients: {prepareResult.recipientCount}</p>
                    <p>
                      Total tokens: {prepareResult.totalTokensNeeded}
                    </p>
                    <p>
                      Est. fee: {prepareResult.estimatedFeeSOL.toFixed(4)} SOL
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {!prepareResult && (
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleCreateAndPrepare}
                    disabled={isBusy}
                  >
                    {isCreating || isPreparing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Rocket className="h-4 w-4" />
                    )}
                    Prepare
                  </Button>
                )}
                {prepareResult && (
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleFundAndStart}
                    disabled={isBusy}
                  >
                    {isFunding || isStarting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Rocket className="h-4 w-4" />
                    )}
                    Fund &amp; Start
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          {step < 3 && (
            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
              >
                Next
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
