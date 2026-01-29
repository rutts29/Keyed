"use client";

import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { ApiResponse, FeedItem } from "@/types";

type UserPostsResponse = {
  posts: FeedItem[];
  nextCursor: string | null;
};

export function useUserPosts(wallet: string, limit = 20) {
  const { ref, inView } = useInView({ rootMargin: "300px" });
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL);

  const query = useInfiniteQuery({
    queryKey: queryKeys.userPosts(wallet),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ApiResponse<UserPostsResponse>>(
        `/users/${wallet}/posts`,
        { params: { limit, cursor: pageParam } }
      );
      if (!data.data) {
        throw new Error("Posts unavailable");
      }
      return data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: hasApi && Boolean(wallet) && wallet !== "me",
  });

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [inView, query]);

  return { ...query, loadMoreRef: ref, hasApi };
}
