"use client";

import { Badge } from "@/components/ui/badge";
import type { ChatGateType } from "@/types";

const gateConfig: Record<ChatGateType, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  token: { label: "Token Gated", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  nft: { label: "NFT Gated", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  both: { label: "Token + NFT", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
};

export function RoomGateBadge({ gateType }: { gateType: ChatGateType }) {
  const config = gateConfig[gateType];
  return (
    <Badge variant="outline" className={`text-[10px] ${config.className}`}>
      {config.label}
    </Badge>
  );
}
