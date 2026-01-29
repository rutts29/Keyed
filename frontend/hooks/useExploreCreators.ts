"use client";

import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";

import { api } from "@/lib/api";
import type { ApiResponse, UserProfile } from "@/types";

type ExploreCreatorsResponse = {
  users: UserProfile[];
  nextCursor: string | null;
};

export function useExploreCreators(limit = 20) {
  const { ref, inView } = useInView({ rootMargin: "300px" });

  const query = useInfiniteQuery({
    queryKey: ["users", "explore"],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ApiResponse<ExploreCreatorsResponse>>(
        "/users/explore",
        { params: { limit, cursor: pageParam } }
      );
      if (!data.data) {
        throw new Error("Creators unavailable");
      }
      return data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [inView, query]);

  return { ...query, loadMoreRef: ref };
}
