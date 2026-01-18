"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { AccessVerification, ApiResponse } from "@/types";

export function useAccessVerification(postId: string) {
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL);

  return useQuery({
    queryKey: queryKeys.access(postId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AccessVerification>>(
        "/access/verify",
        { params: { postId } }
      );
      if (!data.data) {
        throw new Error("Access unavailable");
      }
      return data.data;
    },
    enabled: hasApi && Boolean(postId),
  });
}
