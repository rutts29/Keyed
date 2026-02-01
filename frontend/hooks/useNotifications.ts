"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import type { ApiResponse } from "@/types";

export type NotificationType =
  | "new_post"
  | "like"
  | "comment"
  | "follow"
  | "tip"
  | "airdrop_received";

export interface Notification {
  id: string;
  recipient: string;
  type: NotificationType;
  from_wallet: string;
  post_id: string | null;
  comment_id: string | null;
  amount: number | null;
  read: boolean;
  created_at: string;
  from_user?: {
    wallet: string;
    username: string | null;
    profile_image_uri: string | null;
  };
}

type NotificationsResponse = {
  notifications: Notification[];
  nextCursor: string | null;
};

type UnreadCountResponse = { count: number };

export function useNotifications(filter?: NotificationType) {
  const token = useAuthStore((state) => state.token);

  return useInfiniteQuery({
    queryKey: queryKeys.notifications(filter),
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: "20" };
      if (filter) params.type = filter;
      if (pageParam) params.cursor = pageParam;

      const { data } = await api.get<ApiResponse<NotificationsResponse>>(
        "/notifications",
        { params }
      );
      if (!data.data) throw new Error("Failed to load notifications");
      return data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(token),
  });
}

export function useUnreadCount() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.unreadCount(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<UnreadCountResponse>>(
        "/notifications/unread-count"
      );
      if (!data.data) throw new Error("Failed to load unread count");
      return data.data;
    },
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.put<ApiResponse<{ read: true }>>(
        `/notifications/${notificationId}/read`
      );
      if (!data.data) throw new Error("Failed to mark notification as read");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const resetNotifications = useUIStore((state) => state.resetNotifications);

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put<ApiResponse<{ read: true }>>(
        "/notifications/read-all"
      );
      if (!data.data) throw new Error("Failed to mark all as read");
      return data.data;
    },
    onSuccess: () => {
      resetNotifications();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
