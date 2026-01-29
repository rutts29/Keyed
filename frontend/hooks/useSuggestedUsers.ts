"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ApiResponse, UserProfile } from "@/types";

type SuggestedUsersResponse = {
  users: UserProfile[];
};

// Mock suggested users for fallback
const mockSuggestedUsers: UserProfile[] = [
  {
    wallet: "AriVegaWa11etAddressForMockData1111111111111",
    username: "ari.creates",
    bio: "Design systems + tokenized merch.",
    profileImageUri: null,
    followerCount: 2400,
    followingCount: 180,
    postCount: 67,
    createdAt: "2024-01-15T00:00:00.000Z",
    isVerified: true,
  },
  {
    wallet: "KaitoShinWa11etAddressForMockData111111111111",
    username: "kaito",
    bio: "Live sessions, gated Q&A, and drops.",
    profileImageUri: null,
    followerCount: 5200,
    followingCount: 320,
    postCount: 142,
    createdAt: "2024-02-01T00:00:00.000Z",
    isVerified: true,
  },
  {
    wallet: "NovaLaneWa11etAddressForMockData1111111111111",
    username: "novalane",
    bio: "Web3 educator + weekly sessions.",
    profileImageUri: null,
    followerCount: 3800,
    followingCount: 95,
    postCount: 89,
    createdAt: "2024-01-20T00:00:00.000Z",
    isVerified: false,
  },
];

export function useSuggestedUsers() {
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL);

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
    enabled: hasApi,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Return mock data if API is not available or on error
  const users = hasApi && !query.isError ? query.data : mockSuggestedUsers;

  return {
    users: users ?? mockSuggestedUsers,
    isLoading: hasApi && query.isLoading,
    isError: query.isError,
  };
}
