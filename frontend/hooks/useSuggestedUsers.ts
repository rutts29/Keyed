"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ApiResponse, UserProfile } from "@/types";

type SuggestedUsersResponse = {
  users: UserProfile[];
};

export function useSuggestedUsers() {
  const query = useQuery({
    queryKey: ["users", "suggested"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SuggestedUsersResponse>>(
        "/users/suggested"
      );
      if (!data.data) {
        throw new Error("Suggested users unavailable");
      }
      return data.data.users;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
