"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { AudienceSelector } from "@/components/AudienceSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCampaign, useUpdateCampaign } from "@/hooks/useAirdrops";
import type { AirdropAudienceType, AirdropType } from "@/types";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditCampaignPage({ params }: EditPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaign(id);
  const { mutateAsync: updateCampaign, isPending: isUpdating } = useUpdateCampaign(id);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [airdropType, setAirdropType] = useState<AirdropType>("spl_token");
  const [tokenMint, setTokenMint] = useState("");
  const [amountPerRecipient, setAmountPerRecipient] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [collectionMint, setCollectionMint] = useState("");
  const [audienceType, setAudienceType] = useState<AirdropAudienceType>("followers");
  const [audienceFilter, setAudienceFilter] = useState<Record<string, unknown>>({});

  // Pre-fill form when campaign loads
  useEffect(() => {
    if (campaign) {
      setName(campaign.name || "");
      setDescription(campaign.description || "");
      setAirdropType(campaign.type);
      setTokenMint(campaign.tokenMint || "");
      setAmountPerRecipient(campaign.amountPerRecipient?.toString() || "");
      setMetadataUri(campaign.metadataUri || "");
      setCollectionMint(campaign.collectionMint || "");
      setAudienceType(campaign.audienceType);
      setAudienceFilter(campaign.audienceFilter || {});
    }
  }, [campaign]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    try {
      await updateCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        type: airdropType,
        tokenMint: airdropType === "spl_token" ? tokenMint.trim() || undefined : undefined,
        amountPerRecipient: amountPerRecipient ? Number(amountPerRecipient) : undefined,
        metadataUri: airdropType === "cnft" ? metadataUri.trim() || undefined : undefined,
        collectionMint: airdropType === "cnft" ? collectionMint.trim() || undefined : undefined,
        audienceType,
        audienceFilter: Object.keys(audienceFilter).length > 0 ? audienceFilter : undefined,
      });
      toast.success("Campaign updated");
      router.push(`/airdrops/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update campaign");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Campaign not found
      </div>
    );
  }

  if (campaign.status !== "draft") {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Only draft campaigns can be edited
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push(`/airdrops/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Edit Campaign</h1>
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-6 p-6">
          {/* Details Section */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Details</p>
            <Separator className="bg-border/70" />
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
          </div>

          {/* Token Config Section */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Token Configuration</p>
            <Separator className="bg-border/70" />
            {airdropType === "spl_token" ? (
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
            ) : (
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
          </div>

          {/* Audience Section */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Audience</p>
            <Separator className="bg-border/70" />
            <AudienceSelector
              value={audienceType}
              onChange={setAudienceType}
              filter={audienceFilter}
              onFilterChange={setAudienceFilter}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/airdrops/${id}`)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSave}
              disabled={isUpdating || !name.trim()}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
