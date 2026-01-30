"use client";

import { useState } from "react";
import { MessageSquare, Plus } from "lucide-react";

import { CreateRoomModal } from "@/components/CreateRoomModal";
import { RoomCard } from "@/components/RoomCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyRooms, useRooms } from "@/hooks/useChat";
import { useChatStore } from "@/store/chatStore";

function RoomListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/70 bg-card/70">
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-60" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function RoomsPage() {
  const [tab, setTab] = useState<"all" | "mine">("all");
  const openCreateRoom = useChatStore((state) => state.openCreateRoom);

  const { data: allRoomsData, isLoading: isLoadingAll } = useRooms();
  const { data: myRoomsData, isLoading: isLoadingMine } = useMyRooms();

  const allRooms = allRoomsData?.pages.flatMap((p) => p.rooms) ?? [];
  const createdRooms = myRoomsData?.created ?? [];
  const joinedRooms = myRoomsData?.joined ?? [];
  const myRooms = [...createdRooms, ...joinedRooms];

  const rooms = tab === "all" ? allRooms : myRooms;
  const isLoading = tab === "all" ? isLoadingAll : isLoadingMine;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Chat Rooms</h1>
        <Button size="sm" className="gap-1.5" onClick={openCreateRoom}>
          <Plus className="h-3.5 w-3.5" />
          Create Room
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "all" | "mine")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-muted/40">
          <TabsTrigger value="all">All Rooms</TabsTrigger>
          <TabsTrigger value="mine">My Rooms</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <RoomListSkeleton />}

      {!isLoading && rooms.length === 0 && (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {tab === "mine" ? "No rooms yet" : "No rooms available"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {tab === "mine"
                ? "Create your first chat room to start engaging with your community."
                : "Be the first to create a chat room!"}
            </p>
            <Button className="mt-4" size="sm" onClick={openCreateRoom}>
              Create Room
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && rooms.length > 0 && (
        <div className="space-y-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}

      <CreateRoomModal />
    </div>
  );
}
