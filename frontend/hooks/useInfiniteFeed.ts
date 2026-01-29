"use client";

import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import type { ApiResponse, FeedItem } from "@/types";

type FeedType = "personalized" | "explore" | "following" | "trending";

const feedEndpoints: Record<FeedType, string> = {
  personalized: "/feed",
  explore: "/feed/explore",
  following: "/feed/following",
  trending: "/feed/trending",
};

type FeedResponse = {
  posts: FeedItem[];
  nextCursor: string | null;
};

export function useInfiniteFeed(feedType: FeedType, limit = 20) {
  const token = useAuthStore((state) => state.token);
  const { ref, inView } = useInView({ rootMargin: "300px" });
  const requiresAuth = feedType === "personalized" || feedType === "following";
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL);

  const query = useInfiniteQuery({
    queryKey: queryKeys.feed(feedType),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ApiResponse<FeedResponse>>(
        feedEndpoints[feedType],
        { params: { limit, cursor: pageParam } }
      );
      if (!data.data) {
        throw new Error("Feed unavailable");
      }
      return data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: hasApi && (!requiresAuth || Boolean(token)),
  });

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [inView, query]);

  return { ...query, loadMoreRef: ref, hasApi };
}
