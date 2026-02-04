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
          drops: (AirdropRecipient & { airdropCampaigns: AirdropCampaign })[];
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

// Response type for prepare endpoint (new on-chain flow)
type PrepareResponse = {
  recipientCount: number;
  totalTokensNeeded: number;
  estimatedFeeSOL: number;
  createCampaignTx: string; // Transaction to create on-chain campaign
  campaignPda: string;
  escrowAta: string;
  creatorBalance: number;
  hasSufficientBalance: boolean;
};

/**
 * Prepare campaign - resolves audience and returns createCampaignTx
 * Step 1 of on-chain flow: Call this, then sign the transaction
 */
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

/**
 * Confirm on-chain campaign creation after user signs createCampaignTx
 * Step 2 of on-chain flow
 */
export function useConfirmCreate() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useSafeDynamicContext();

  return useMutation({
    mutationFn: async ({
      id,
      createCampaignTx,
    }: {
      id: string;
      createCampaignTx: string;
    }) => {
      if (!primaryWallet) throw new Error("Connect your wallet");

      // Sign and submit the create campaign transaction
      const txSignature = await signAndSubmitTransaction(
        createCampaignTx,
        primaryWallet
      );

      // Confirm with backend
      const { data } = await api.post<
        ApiResponse<{ created: true; campaignPda: string }>
      >(`/airdrops/${id}/confirm-create`, { txSignature });
      if (!data.data) throw new Error("Failed to confirm campaign creation");
      return data.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.airdropCampaign(id),
      });
    },
  });
}

// Response type for fund-tx endpoint
type FundTxResponse = {
  transaction: string;
  totalAmount: number;
  escrowAta: string;
};

/**
 * Get fund transaction for a campaign
 * Step 3 of on-chain flow
 */
export function useBuildFundTx() {
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data } = await api.get<ApiResponse<FundTxResponse>>(
        `/airdrops/${campaignId}/fund-tx`
      );
      if (!data.data) throw new Error("Failed to build fund transaction");
      return data.data;
    },
  });
}

/**
 * Confirm funding after user signs fund transaction
 * Step 4 of on-chain flow
 */
export function useConfirmFund() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useSafeDynamicContext();

  return useMutation({
    mutationFn: async ({
      id,
      fundTransaction,
    }: {
      id: string;
      fundTransaction: string;
    }) => {
      if (!primaryWallet) throw new Error("Connect your wallet");

      // Sign and submit the fund transaction
      const txSignature = await signAndSubmitTransaction(
        fundTransaction,
        primaryWallet
      );

      // Confirm with backend
      const { data } = await api.post<ApiResponse<{ funded: true }>>(
        `/airdrops/${id}/confirm-fund`,
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

/**
 * @deprecated Use useConfirmFund instead for new on-chain flow
 * Legacy fund campaign hook (for backward compatibility)
 */
export function useFundCampaign() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useSafeDynamicContext();

  return useMutation({
    mutationFn: async ({
      id,
      fundTransaction,
    }: {
      id: string;
      fundTransaction: string;
    }) => {
      if (!primaryWallet) throw new Error("Connect your wallet");

      // Sign and submit the fund transaction, get on-chain signature
      const txSignature = await signAndSubmitTransaction(
        fundTransaction,
        primaryWallet
      );

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

// Response type for refund-tx endpoint
type RefundTxResponse = {
  transaction: string;
  refundAmount: number;
};

/**
 * Get refund transaction for cancellation
 * Step 1 of cancel flow
 */
export function useBuildRefundTx() {
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data } = await api.get<ApiResponse<RefundTxResponse>>(
        `/airdrops/${campaignId}/refund-tx`
      );
      if (!data.data) throw new Error("Failed to build refund transaction");
      return data.data;
    },
  });
}

/**
 * Confirm cancellation after user signs refund transaction
 * Step 2 of cancel flow
 */
export function useConfirmCancel() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useSafeDynamicContext();

  return useMutation({
    mutationFn: async ({
      id,
      refundTransaction,
    }: {
      id: string;
      refundTransaction: string;
    }) => {
      if (!primaryWallet) throw new Error("Connect your wallet");

      // Sign and submit the refund transaction
      const txSignature = await signAndSubmitTransaction(
        refundTransaction,
        primaryWallet
      );

      // Confirm with backend
      const { data } = await api.post<ApiResponse<{ cancelled: true }>>(
        `/airdrops/${id}/confirm-cancel`,
        { txSignature }
      );
      if (!data.data) throw new Error("Failed to confirm cancellation");
      return data.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.airdropCampaign(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.airdrops() });
    },
  });
}

/**
 * Cancel campaign (for draft/created campaigns that don't need on-chain refund)
 */
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

export function useDeleteCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<ApiResponse<{ deleted: true }>>(
        `/airdrops/${id}`
      );
      if (!data.data) throw new Error("Failed to delete campaign");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.airdrops() });
    },
  });
}

export function useUpdateCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name?: string;
      description?: string;
      type?: AirdropType;
      tokenMint?: string;
      amountPerRecipient?: number;
      metadataUri?: string;
      collectionMint?: string;
      audienceType?: AirdropAudienceType;
      audienceFilter?: Record<string, unknown>;
    }) => {
      const { data } = await api.put<ApiResponse<AirdropCampaign>>(
        `/airdrops/${id}`,
        input
      );
      if (!data.data) throw new Error("Failed to update campaign");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.airdropCampaign(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.airdrops() });
    },
  });
}
