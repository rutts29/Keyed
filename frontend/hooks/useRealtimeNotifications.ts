"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

export function useRealtimeNotifications() {
  const wallet = useAuthStore((state) => state.wallet);
  const queryClient = useQueryClient();
  const incrementNotifications = useUIStore(
    (state) => state.incrementNotifications
  );

  useEffect(() => {
    // Early return if supabase client is not available or wallet is not connected
    if (!supabase || !wallet) {
      return;
    }

    // Store reference to supabase client for cleanup
    const client = supabase;

    const likesChannel = client
      .channel("likes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
          filter: `post_id=in.(SELECT id FROM posts WHERE creator_wallet='${wallet}')`,
        },
        (payload) => {
          queryClient.invalidateQueries({
            queryKey: ["post", payload.new.post_id],
          });
          incrementNotifications();
        }
      )
      .subscribe();

    const followsChannel = client
      .channel("follows")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "follows",
          filter: `following_wallet=eq.${wallet}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user", wallet] });
          incrementNotifications();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(likesChannel);
      client.removeChannel(followsChannel);
    };
  }, [incrementNotifications, queryClient, wallet]);
}
