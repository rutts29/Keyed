"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { ApiResponse, SemanticSearchResponse } from "@/types";

export function useSemanticSearch(query: string) {
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL);

  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: async () => {
      const { data } = await api.post<ApiResponse<SemanticSearchResponse>>(
        "/search/semantic",
        { query }
      );
      if (!data.data) {
        throw new Error("Search unavailable");
      }
      return data.data;
    },
    enabled: hasApi && Boolean(query.trim()),
  });
}
