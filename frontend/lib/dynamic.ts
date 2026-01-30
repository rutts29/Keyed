import { SolanaWalletConnectors } from "@dynamic-labs/solana";

const DYNAMIC_ENVIRONMENT_ID = "c87c89cf-9eac-4994-98a8-4a3d7702c9bb";

export const dynamicConfig = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID || DYNAMIC_ENVIRONMENT_ID,
  walletConnectors: [SolanaWalletConnectors],
};
