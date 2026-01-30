"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { RoomGateBadge } from "@/components/RoomGateBadge";
import { formatTimestamp, formatWallet } from "@/lib/format";
import type { ChatRoom } from "@/types";

type RoomCardProps = {
  room: ChatRoom;
};

export function RoomCard({ room }: RoomCardProps) {
  const memberCount = room.chat_members?.[0]?.count ?? 0;

  return (
    <Link href={`/rooms/${room.id}`}>
      <Card className="border-border/70 bg-card/70 transition-colors hover:bg-muted/60 hover:border-border">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {room.name}
              </h3>
              {room.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {room.description}
                </p>
              )}
            </div>
            <RoomGateBadge gateType={room.gate_type} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {memberCount}
            </span>
            <span>{formatWallet(room.creator_wallet, 4)}</span>
            <span>{formatTimestamp(room.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
