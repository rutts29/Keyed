"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { ApiResponse, UserWithRelation } from "@/types";

export function useUserProfile(wallet: string) {
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
    enabled: Boolean(wallet) && wallet !== "me",
  });
}
