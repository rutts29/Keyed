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
    if (
      !wallet ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    const likesChannel = supabase
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

    const followsChannel = supabase
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
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(followsChannel);
    };
  }, [queryClient, wallet]);
}
