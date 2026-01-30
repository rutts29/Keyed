"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AirdropAudienceType } from "@/types";

const audienceOptions: { value: AirdropAudienceType; label: string; desc: string }[] = [
  { value: "followers", label: "Followers", desc: "All your followers" },
  { value: "tippers", label: "Tippers", desc: "Users who have tipped you" },
  { value: "subscribers", label: "Subscribers", desc: "Active subscribers" },
  { value: "token_holders", label: "Token Holders", desc: "Holders of a specific token" },
  { value: "custom", label: "Custom", desc: "Paste a wallet list" },
];

type AudienceSelectorProps = {
  value: AirdropAudienceType;
  onChange: (value: AirdropAudienceType) => void;
  filter: Record<string, unknown>;
  onFilterChange: (filter: Record<string, unknown>) => void;
};

export function AudienceSelector({
  value,
  onChange,
  filter,
  onFilterChange,
}: AudienceSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Target audience</Label>
      <div className="grid grid-cols-2 gap-2">
        {audienceOptions.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant={value === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(opt.value)}
            className="flex flex-col items-start h-auto py-2 px-3 text-left"
          >
            <span className="text-xs font-medium">{opt.label}</span>
            <span className="text-[10px] opacity-70">{opt.desc}</span>
          </Button>
        ))}
      </div>

      {value === "tippers" && (
        <div className="space-y-2">
          <Label htmlFor="min-tip">Minimum tip amount (SOL)</Label>
          <Input
            id="min-tip"
            type="number"
            placeholder="0"
            value={(filter.minTipAmount as string) ?? ""}
            onChange={(e) =>
              onFilterChange({ ...filter, minTipAmount: e.target.value })
            }
          />
        </div>
      )}

      {value === "token_holders" && (
        <div className="space-y-2">
          <Label htmlFor="holder-token">Token mint address</Label>
          <Input
            id="holder-token"
            placeholder="Token mint pubkey"
            value={(filter.tokenMint as string) ?? ""}
            onChange={(e) =>
              onFilterChange({ ...filter, tokenMint: e.target.value })
            }
          />
        </div>
      )}

      {value === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="wallet-list">
            Wallet addresses (one per line)
          </Label>
          <textarea
            id="wallet-list"
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={"wallet1...\nwallet2...\nwallet3..."}
            value={(filter.walletList as string) ?? ""}
            onChange={(e) =>
              onFilterChange({ ...filter, walletList: e.target.value })
            }
          />
        </div>
      )}
    </div>
  );
}
