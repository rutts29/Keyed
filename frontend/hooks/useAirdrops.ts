"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSafeDynamicContext } from "./useSafeDynamicContext";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { signAndSubmitTransaction } from "@/lib/solana";
import { useAuthStore } from "@/store/authStore";
import type {
  AirdropAudienceType,
  AirdropCampaign,
  AirdropRecipient,
  AirdropType,
  ApiResponse,
} from "@/types";

// --- Query hooks ---

export function useMyCampaigns() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.airdrops(),
    queryFn: async () => {
      const { data } = await api.get<
        ApiResponse<{ campaigns: AirdropCampaign[] }>
      >("/airdrops/mine");
      if (!data.data) throw new Error("Failed to load campaigns");
      return data.data.campaigns;
    },
    enabled: Boolean(token),
  });
}

export function useReceivedDrops() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.receivedDrops(),
    queryFn: async () => {
      const { data } = await api.get<
        ApiResponse<{
          drops: (AirdropRecipient & { airdrop_campaigns: AirdropCampaign })[];
        }>
      >("/airdrops/received");
      if (!data.data) throw new Error("Failed to load drops");
      return data.data.drops;
    },
    enabled: Boolean(token),
  });
}

type CampaignDetail = AirdropCampaign & {
  breakdown: { pending: number; sent: number; failed: number };
};

export function useCampaign(id: string) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.airdropCampaign(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CampaignDetail>>(
        `/airdrops/${id}`
      );
      if (!data.data) throw new Error("Campaign not found");
      return data.data;
    },
    enabled: Boolean(token) && Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "processing" ? 5000 : false;
    },
  });
}

// --- Mutation hooks ---

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      type: AirdropType;
      tokenMint?: string;
      amountPerRecipient?: number;
      metadataUri?: string;
      collectionMint?: string;
      audienceType: AirdropAudienceType;
      audienceFilter?: Record<string, unknown>;
    }) => {
      const { data } = await api.post<ApiResponse<AirdropCampaign>>(
        "/airdrops",
        input
      );
      if (!data.data) throw new Error("Failed to create campaign");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.airdrops() });
    },
  });
}

type PrepareResponse = {
  recipientCount: number;
  totalTokensNeeded: number;
  estimatedFeeSOL: number;
  fundTransaction: string;
};

export function usePrepareCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data } = await api.post<ApiResponse<PrepareResponse>>(
        `/airdrops/${campaignId}/prepare`
      );
      if (!data.data) throw new Error("Failed to prepare campaign");
      return data.data;
    },
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.airdropCampaign(campaignId),
      });
    },
  });
}

export function useFundCampaign() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useSafeDynamicContext();

  return useMutation({
    mutationFn: async ({ id, fundTransaction }: { id: string; fundTransaction: string }) => {
      if (!primaryWallet) throw new Error("Connect your wallet");

      // Sign and submit the fund transaction, get on-chain signature
      const txSignature = await signAndSubmitTransaction(fundTransaction, primaryWallet);

      // Notify backend with the actual on-chain signature
      const { data } = await api.post<ApiResponse<{ funded: true }>>(
        `/airdrops/${id}/fund`,
        { txSignature }
      );
      if (!data.data) throw new Error("Failed to confirm funding");
      return data.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.airdropCampaign(id),
      });
    },
  });
}

export function useStartCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data } = await api.post<
        ApiResponse<{ started: true; recipientCount: number }>
      >(`/airdrops/${campaignId}/start`);
      if (!data.data) throw new Error("Failed to start campaign");
      return data.data;
    },
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.airdropCampaign(campaignId),
      });
    },
  });
}

export function useCancelCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<{ cancelled: true }>>(
        `/airdrops/${id}/cancel`
      );
      if (!data.data) throw new Error("Failed to cancel campaign");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.airdropCampaign(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.airdrops() });
    },
  });
}
