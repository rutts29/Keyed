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

// Mock trending topics for fallback
const mockTrendingTopics: TrendingTopic[] = [
  { name: "Token-gated drops", postCount: 1294, trend: "up" },
  { name: "Live mint rooms", postCount: 842, trend: "up" },
  { name: "Weekly creator tips", postCount: 508, trend: "stable" },
  { name: "Solana builders", postCount: 1976, trend: "up" },
  { name: "NFT collections", postCount: 623, trend: "down" },
];

export function useTrendingTopics() {
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL);

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
    enabled: hasApi,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Return mock data if API is not available or on error
  const topics = hasApi && !query.isError ? query.data : mockTrendingTopics;

  return {
    topics: topics ?? mockTrendingTopics,
    isLoading: hasApi && query.isLoading,
    isError: query.isError,
  };
}
