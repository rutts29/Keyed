import { SolanaWalletConnectors } from "@dynamic-labs/solana";

if (!process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID) {
  throw new Error("NEXT_PUBLIC_DYNAMIC_ENV_ID environment variable is required");
}

export const dynamicConfig = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
  walletConnectors: [SolanaWalletConnectors],
};
