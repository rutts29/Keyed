"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { ApiResponse, ChatMessage, ChatRoom } from "@/types";

// --- Query hooks ---

type RoomsResponse = { rooms: ChatRoom[]; nextCursor: string | null };
type MyRoomsResponse = { created: ChatRoom[]; joined: ChatRoom[] };
type MessagesResponse = { messages: ChatMessage[]; nextCursor: string | null };

export function useRooms(creator?: string) {
  const token = useAuthStore((state) => state.token);

  return useInfiniteQuery({
    queryKey: queryKeys.chatRooms(creator),
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: "20" };
      if (creator) params.creator = creator;
      if (pageParam) params.cursor = pageParam;

      const { data } = await api.get<ApiResponse<RoomsResponse>>(
        "/chat/rooms",
        { params }
      );
      if (!data.data) throw new Error("Failed to load rooms");
      return data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(token),
  });
}

export function useMyRooms() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.myRooms(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MyRoomsResponse>>(
        "/chat/rooms/mine"
      );
      if (!data.data) throw new Error("Failed to load rooms");
      return data.data;
    },
    enabled: Boolean(token),
  });
}

export function useRoom(roomId: string) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.chatRoom(roomId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ChatRoom>>(
        `/chat/rooms/${roomId}`
      );
      if (!data.data) throw new Error("Room not found");
      return data.data;
    },
    enabled: Boolean(token) && Boolean(roomId),
  });
}

export function useChatMessages(roomId: string) {
  const token = useAuthStore((state) => state.token);

  return useInfiniteQuery({
    queryKey: queryKeys.chatMessages(roomId),
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: "50" };
      if (pageParam) params.cursor = pageParam;

      const { data } = await api.get<ApiResponse<MessagesResponse>>(
        `/chat/rooms/${roomId}/messages`,
        { params }
      );
      if (!data.data) throw new Error("Failed to load messages");
      return data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(token) && Boolean(roomId),
  });
}

// --- Mutation hooks ---

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      requiredToken?: string;
      minimumBalance?: number;
      requiredNftCollection?: string;
      gateType?: string;
    }) => {
      const { data } = await api.post<ApiResponse<ChatRoom>>(
        "/chat/rooms",
        input
      );
      if (!data.data) throw new Error("Failed to create room");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms() });
      queryClient.invalidateQueries({ queryKey: queryKeys.myRooms() });
    },
  });
}

type JoinResponse =
  | { joined: true }
  | { alreadyJoined: true }
  | {
      hasAccess: false;
      requirements: {
        gateType: string;
        requiredToken?: string;
        minimumBalance?: number;
        requiredNftCollection?: string;
      };
    };

export function useJoinRoom(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<JoinResponse>>(
        `/chat/rooms/${roomId}/join`
      );
      if (!data.data) throw new Error("Failed to join room");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRoom(roomId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myRooms() });
    },
  });
}

export function useLeaveRoom(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<{ left: true }>>(
        `/chat/rooms/${roomId}/leave`
      );
      if (!data.data) throw new Error("Failed to leave room");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRoom(roomId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myRooms() });
    },
  });
}

export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post<ApiResponse<ChatMessage>>(
        `/chat/rooms/${roomId}/messages`,
        { content }
      );
      if (!data.data) throw new Error("Failed to send message");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chatMessages(roomId),
      });
    },
  });
}

// --- Realtime hook ---

export function useChatRealtime(roomId: string) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const wallet = useAuthStore((state) => state.wallet);

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      queryClient.setQueryData(
        queryKeys.chatMessages(roomId),
        (old: unknown) => {
          if (!old || typeof old !== "object" || !("pages" in old)) return old;
          const data = old as { pages: MessagesResponse[]; pageParams: unknown[] };
          const firstPage = data.pages[0];
          if (!firstPage) return old;
          return {
            ...data,
            pages: [
              { ...firstPage, messages: [message, ...firstPage.messages] },
              ...data.pages.slice(1),
            ],
          };
        }
      );
    },
    [queryClient, roomId]
  );

  useEffect(() => {
    if (!supabase || !roomId || !wallet) return;

    const client = supabase;
    const channel = client
      .channel(`chat:room:${roomId}`, {
        config: { presence: { key: wallet } },
      })
      .on("broadcast", { event: "chat:message" }, (payload) => {
        const msg = payload.payload;
        // Validate payload before treating as ChatMessage
        if (
          msg &&
          typeof msg === "object" &&
          typeof msg.id === "string" &&
          typeof msg.content === "string" &&
          typeof msg.sender_wallet === "string" &&
          typeof msg.room_id === "string"
        ) {
          // Avoid duplicating own messages (already added by mutation)
          if (msg.sender_wallet !== wallet) {
            appendMessage(msg as ChatMessage);
          }
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ wallet });
        }
      });

    channelRef.current = channel;

    return () => {
      client.removeChannel(channel);
      channelRef.current = null;
    };
  }, [appendMessage, roomId, wallet]);

  return { onlineCount };
}
