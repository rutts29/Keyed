"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

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
  fromWallet: string;
  postId: string | null;
  commentId: string | null;
  amount: number | null;
  read: boolean;
  createdAt: string;
  fromUser?: {
    wallet: string;
    username: string | null;
    profileImageUri: string | null;
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
  const decrementNotifications = useUIStore((state) => state.decrementNotifications);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.put<ApiResponse<{ read: true }>>(
        `/notifications/${notificationId}/read`
      );
      if (!data.data) throw new Error("Failed to mark notification as read");
      return data.data;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousData = queryClient.getQueriesData({ queryKey: ["notifications", "list"] });

      queryClient.setQueriesData(
        { queryKey: ["notifications", "list"] },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const data = old as { pages: NotificationsResponse[]; pageParams: unknown[] };
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((n) =>
                n.id === notificationId ? { ...n, read: true } : n
              ),
            })),
          };
        }
      );

      decrementNotifications();
      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to mark notification as read");
    },
    onSettled: () => {
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
    onError: () => {
      toast.error("Failed to mark all notifications as read");
    },
  });
}
