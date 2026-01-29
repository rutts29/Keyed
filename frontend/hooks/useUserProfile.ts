"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { ApiResponse, UserWithRelation } from "@/types";

export function useUserProfile(wallet: string) {
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL);

  return useQuery({
    queryKey: queryKeys.user(wallet),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<UserWithRelation>>(
        `/users/${wallet}`
      );
      if (!data.data) {
        throw new Error("User not found");
      }
      return data.data;
    },
    enabled: hasApi && Boolean(wallet) && wallet !== "me",
  });
}
