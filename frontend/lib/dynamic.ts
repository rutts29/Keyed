import { SolanaWalletConnectors } from "@dynamic-labs/solana";

export const dynamicConfig = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "",
  walletConnectors: [SolanaWalletConnectors],
};
