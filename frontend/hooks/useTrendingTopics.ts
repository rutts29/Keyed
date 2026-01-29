"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

export interface TrendingTopic {
  name: string;
  postCount: number;
  trend: "up" | "down" | "stable";
}

type TrendingTopicsResponse = {
  topics: TrendingTopic[];
};

export function useTrendingTopics() {
  const query = useQuery({
    queryKey: ["trending", "topics"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TrendingTopicsResponse>>(
        "/feed/trending-topics"
      );
      if (!data.data) {
        throw new Error("Trending topics unavailable");
      }
      return data.data.topics;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    topics: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
