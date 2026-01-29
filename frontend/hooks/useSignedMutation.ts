"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosResponse } from "axios"

import { useSafeDynamicContext } from "./useSafeDynamicContext"

import { signAndSubmitTransaction } from "@/lib/solana"
import type { ApiResponse, TransactionResponse } from "@/types"

interface SignedMutationOptions<TInput> {
  mutationFn: (
    input: TInput,
    walletAddress: string
  ) => Promise<AxiosResponse<ApiResponse<TransactionResponse>>>
  invalidateKeys?: readonly (readonly string[] | string[])[]
  onError?: (error: Error) => void
}

export function useSignedMutation<TInput = void>(
  options: SignedMutationOptions<TInput>
) {
  const queryClient = useQueryClient()
  const { primaryWallet } = useSafeDynamicContext()

  return useMutation({
    mutationFn: async (input: TInput) => {
      if (!primaryWallet) {
        throw new Error("Connect your wallet")
      }
      const { data } = await options.mutationFn(input, primaryWallet.address)
      if (!data.data) {
        throw new Error("Transaction failed")
      }
      await signAndSubmitTransaction(data.data.transaction, primaryWallet)
      return data.data
    },
    onSuccess: () => {
      if (options.invalidateKeys) {
        for (const key of options.invalidateKeys) {
          queryClient.invalidateQueries({
            queryKey: Array.isArray(key) ? key : [key],
          })
        }
      }
    },
    onError: options.onError,
  })
}
