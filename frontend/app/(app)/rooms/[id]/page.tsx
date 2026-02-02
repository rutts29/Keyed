"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, LogOut, ShieldCheck, Users } from "lucide-react";
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

  const memberCount = room?.chatMembers?.[0]?.count ?? 0;
  const isCreator = room?.creatorWallet === wallet;
  const isMember = room?.isMember ?? false;
  const isGated = room?.gateType !== "open";

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
              <RoomGateBadge gateType={room.gateType} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {memberCount} members
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isMember ? (
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
          ) : !isCreator ? (
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
          ) : null}
        </div>
      </div>

      {/* Chat area — only visible to members */}
      <div className="flex-1 overflow-hidden">
        {isMember ? (
          <ChatRoomView roomId={roomId} />
        ) : (
          <Card className="mx-auto mt-12 max-w-sm border-border/70 bg-card/70">
            <CardContent className="flex flex-col items-center py-10 text-center space-y-4">
              {isGated ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10">
                    <ShieldCheck className="h-7 w-7 text-yellow-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Token-gated room
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You need the required token to join this room. Click Join
                      and your wallet will be verified automatically.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                    <Lock className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Join to view messages
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You need to join this room before you can see the
                      conversation.
                    </p>
                  </div>
                </>
              )}
              <Button
                size="sm"
                onClick={handleJoin}
                disabled={isJoining}
                className="mt-2"
              >
                {isJoining ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : null}
                Join room
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
