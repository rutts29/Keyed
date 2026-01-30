"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, LogOut, Users } from "lucide-react";
import { toast } from "sonner";

import { ChatRoomView } from "@/components/ChatRoom";
import { RoomGateBadge } from "@/components/RoomGateBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useJoinRoom, useLeaveRoom, useRoom } from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";

type RoomPageProps = {
  params: Promise<{ id: string }>;
};

export default function RoomPage({ params }: RoomPageProps) {
  const { id: roomId } = use(params);
  const wallet = useAuthStore((state) => state.wallet);
  const { data: room, isLoading, error } = useRoom(roomId);
  const { mutateAsync: joinRoom, isPending: isJoining } = useJoinRoom(roomId);
  const { mutateAsync: leaveRoom, isPending: isLeaving } =
    useLeaveRoom(roomId);

  const memberCount = room?.chat_members?.[0]?.count ?? 0;
  const isCreator = room?.creator_wallet === wallet;

  // Check if current user is a member (simple heuristic: if we can load messages, we're in)
  // The actual membership is enforced server-side on message load
  const handleJoin = async () => {
    try {
      const result = await joinRoom();
      if ("hasAccess" in result && !result.hasAccess) {
        toast.error("You don't meet the token requirements to join this room");
        return;
      }
      toast.success("Joined room");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join room"
      );
    }
  };

  const handleLeave = async () => {
    try {
      await leaveRoom();
      toast.success("Left room");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to leave room"
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

  if (error || !room) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Room not found or you don&apos;t have access.
          </p>
          <Button variant="secondary" className="mt-4" asChild>
            <Link href="/rooms">Back to rooms</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Room header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/rooms">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-foreground">
                {room.name}
              </h1>
              <RoomGateBadge gateType={room.gate_type} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {memberCount} members
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Join"
            )}
          </Button>
          {!isCreator && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive"
              onClick={handleLeave}
              disabled={isLeaving}
            >
              <LogOut className="h-3 w-3" />
              Leave
            </Button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <ChatRoomView roomId={roomId} />
      </div>
    </div>
  );
}
