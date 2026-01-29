"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

export type RealtimeEventType = "like" | "follow" | "comment";

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export interface UseRealtimeNotificationsReturn {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
}

export function useRealtimeNotifications(
  walletAddress?: string
): UseRealtimeNotificationsReturn {
  const storeWallet = useAuthStore((state) => state.wallet);
  const wallet = walletAddress ?? storeWallet;
  const queryClient = useQueryClient();
  const incrementNotifications = useUIStore(
    (state) => state.incrementNotifications
  );

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const handleLike = useCallback(
    (payload: Record<string, unknown>) => {
      const postId = payload.new && typeof payload.new === "object"
        ? (payload.new as Record<string, unknown>).post_id
        : undefined;
      const likerWallet = payload.new && typeof payload.new === "object"
        ? (payload.new as Record<string, unknown>).liker_wallet
        : undefined;

      // Don't notify for own likes
      if (likerWallet === wallet) return;

      setLastEvent({
        type: "like",
        payload,
        timestamp: new Date(),
      });

      if (postId) {
        queryClient.invalidateQueries({
          queryKey: ["post", postId],
        });
      }
      incrementNotifications();

      toast("Someone liked your post", {
        description: "Tap to view",
        action: postId
          ? {
              label: "View",
              onClick: () => {
                window.location.href = `/post/${postId}`;
              },
            }
          : undefined,
      });
    },
    [incrementNotifications, queryClient, wallet]
  );

  const handleFollow = useCallback(
    (payload: Record<string, unknown>) => {
      const followerWallet = payload.new && typeof payload.new === "object"
        ? (payload.new as Record<string, unknown>).follower_wallet
        : undefined;

      setLastEvent({
        type: "follow",
        payload,
        timestamp: new Date(),
      });

      queryClient.invalidateQueries({ queryKey: ["user", wallet] });
      incrementNotifications();

      // Try to get username, fallback to truncated wallet
      const displayName = followerWallet
        ? `@${String(followerWallet).slice(0, 6)}...`
        : "Someone";

      toast(`${displayName} started following you`, {
        description: "Tap to view their profile",
        action: followerWallet
          ? {
              label: "View",
              onClick: () => {
                window.location.href = `/profile/${followerWallet}`;
              },
            }
          : undefined,
      });
    },
    [incrementNotifications, queryClient, wallet]
  );

  const handleComment = useCallback(
    (payload: Record<string, unknown>) => {
      const postId = payload.new && typeof payload.new === "object"
        ? (payload.new as Record<string, unknown>).post_id
        : undefined;
      const commenterWallet = payload.new && typeof payload.new === "object"
        ? (payload.new as Record<string, unknown>).commenter_wallet
        : undefined;

      // Don't notify for own comments
      if (commenterWallet === wallet) return;

      setLastEvent({
        type: "comment",
        payload,
        timestamp: new Date(),
      });

      if (postId) {
        queryClient.invalidateQueries({
          queryKey: ["comments", postId],
        });
        queryClient.invalidateQueries({
          queryKey: ["post", postId],
        });
      }
      incrementNotifications();

      const displayName = commenterWallet
        ? `@${String(commenterWallet).slice(0, 6)}...`
        : "Someone";

      toast(`${displayName} commented on your post`, {
        description: "Tap to view",
        action: postId
          ? {
              label: "View",
              onClick: () => {
                window.location.href = `/post/${postId}`;
              },
            }
          : undefined,
      });
    },
    [incrementNotifications, queryClient, wallet]
  );

  useEffect(() => {
    // Early return if supabase client is not available or wallet is not connected
    if (!supabase || !wallet) {
      setIsConnected(false);
      return;
    }

    // Store reference to supabase client for cleanup
    const client = supabase;

    // Subscribe to likes on user's posts
    // Note: Supabase realtime filters have limitations with subqueries,
    // so we filter on the client side for post ownership
    const likesChannel = client
      .channel(`likes-${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
        },
        (payload) => {
          // The backend should set post_creator_wallet on likes,
          // or we check if the post belongs to the user
          const newData = payload.new as Record<string, unknown>;
          const postCreator = newData.post_creator_wallet;
          if (postCreator === wallet) {
            handleLike(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        }
      });

    // Subscribe to new followers
    const followsChannel = client
      .channel(`follows-${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "follows",
          filter: `following_wallet=eq.${wallet}`,
        },
        (payload) => {
          handleFollow(payload);
        }
      )
      .subscribe();

    // Subscribe to comments on user's posts
    const commentsChannel = client
      .channel(`comments-${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
        },
        (payload) => {
          // The backend should set post_creator_wallet on comments,
          // or we check if the post belongs to the user
          const newData = payload.new as Record<string, unknown>;
          const postCreator = newData.post_creator_wallet;
          if (postCreator === wallet) {
            handleComment(payload);
          }
        }
      )
      .subscribe();

    channelsRef.current = [likesChannel, followsChannel, commentsChannel];

    return () => {
      setIsConnected(false);
      channelsRef.current.forEach((channel) => {
        client.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [handleComment, handleFollow, handleLike, wallet]);

  return { isConnected, lastEvent };
}
