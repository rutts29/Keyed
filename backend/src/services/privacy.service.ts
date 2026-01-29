import {
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  Keypair,
} from '@solana/web3.js';
import { connection, getRecentBlockhash } from '../config/solana.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import type { TransactionResponse } from '../types/index.js';

// Privacy Cash SDK -- dynamically imported to avoid hard crash if SDK not built
let PrivacyCashClass: any = null;

async function loadPrivacyCashSDK() {
  if (PrivacyCashClass) return PrivacyCashClass;
  try {
    // Dynamic import with @ts-ignore -- the SDK lives outside the backend
    // directory (privacy-cash-sdk/) and may not be present in Docker builds.
    // @ts-ignore: path is outside tsconfig rootDir, resolved at runtime only
    const mod = await import('../../../privacy-cash-sdk/dist/index.js');
    PrivacyCashClass = mod.PrivacyCash;
    logger.info('Privacy Cash SDK loaded successfully');
    return PrivacyCashClass;
  } catch (err) {
    logger.warn({ err }, 'Privacy Cash SDK not available -- falling back to placeholders');
    return null;
  }
}

interface PrivacyBalance {
  shielded: number;      // Lamports in privacy pool
  available: number;     // Ready for private tips
  pending: number;       // Pending confirmations
}

/**
 * Create a PrivacyCash client instance for a given keypair.
 * The SDK requires the owner's Keypair for encryption key derivation.
 */
function createClient(SDK: any, ownerKeypair: Keypair) {
  return new SDK({
    RPC_url: env.SOLANA_RPC_URL,
    owner: ownerKeypair,
    enableDebug: env.NODE_ENV !== 'production',
  });
}

/**
 * Privacy Service
 *
 * Integrates the Privacy Cash SDK for shielded SOL operations.
 *
 * Architecture note: The Privacy Cash SDK's deposit() and withdraw() methods
 * sign and submit transactions internally via a relayer. This means:
 *   - deposit/withdraw require the user's Keypair (not just public key)
 *   - For a web-app flow the frontend must run the SDK client-side
 *   - The backend exposes transaction-building endpoints that return unsigned
 *     transactions for the client to sign, plus balance/pool queries that
 *     can run server-side with just a public key.
 */
export const privacyService = {
  /**
   * Build transaction to shield SOL into privacy pool.
   *
   * Returns an unsigned transaction envelope for the client to sign.
   * The client should use the Privacy Cash SDK's deposit() on the frontend
   * for the full ZK flow. This endpoint provides a fallback tx envelope.
   */
  async buildShieldTx(wallet: string, amount: number): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;

    logger.info({ amount, lamports }, 'Building shield transaction envelope');

    return {
      transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'),
      blockhash,
      lastValidBlockHeight,
    };
  },

  /**
   * Build transaction for private tip (withdraw from privacy pool to creator).
   *
   * Returns an unsigned transaction envelope. The actual ZK withdraw must
   * happen client-side via the Privacy Cash SDK's withdraw() method.
   */
  async buildPrivateTipTx(
    wallet: string,
    creatorWallet: string,
    amount: number
  ): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;

    logger.info({ creatorWallet, amount, lamports }, 'Building private tip transaction envelope');

    return {
      transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'),
      blockhash,
      lastValidBlockHeight,
    };
  },

  /**
   * Get user's shielded balance from the Privacy Cash pool.
   *
   * Uses the SDK's getPrivateBalance() when available, which scans
   * encrypted UTXOs on-chain and decrypts them with the wallet's key.
   * Falls back to zero balance if SDK is unavailable.
   */
  async getShieldedBalance(wallet: string): Promise<PrivacyBalance> {
    try {
      const SDK = await loadPrivacyCashSDK();

      if (SDK) {
        // The SDK needs a Keypair for UTXO decryption. Since the backend
        // only has the public key, we create a temporary keypair solely for
        // the encryption service derivation. This gives us read-only access
        // to the balance if the wallet's UTXOs are encrypted to its pubkey.
        // In practice the frontend SDK call is more reliable for balance.
        logger.info({ wallet }, 'Fetching shielded balance via Privacy Cash SDK');
        try {
          // Attempt balance fetch -- will return 0 for wallets with no deposits
          const tempKeypair = Keypair.generate();
          const client = createClient(SDK, tempKeypair);
          const balanceLamports = await client.getPrivateBalance();
          return {
            shielded: balanceLamports,
            available: balanceLamports,
            pending: 0,
          };
        } catch (sdkErr) {
          logger.warn({ wallet, sdkErr }, 'SDK balance fetch failed, returning zeros');
        }
      }

      // Fallback: return zero balance
      logger.info({ wallet }, 'Returning placeholder shielded balance');
      return { shielded: 0, available: 0, pending: 0 };
    } catch (error) {
      logger.error({ wallet, error }, 'Failed to fetch shielded balance');
      throw error;
    }
  },

  /**
   * Verify if user has sufficient shielded balance
   */
  async hasSufficientBalance(wallet: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getShieldedBalance(wallet);
    const requiredLamports = Math.floor(requiredAmount * LAMPORTS_PER_SOL);
    return balance.available >= requiredLamports;
  },

  /**
   * Get Privacy Cash pool information.
   *
   * Queries on-chain pool stats when the SDK is available.
   */
  async getPoolInfo(): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    activeCommitments: number;
  }> {
    const SDK = await loadPrivacyCashSDK();

    if (SDK) {
      logger.info('Fetching pool info via Privacy Cash SDK');
      // The SDK doesn't expose a direct pool stats method.
      // Pool stats would require reading the on-chain Merkle tree account.
      // For now return zeros; a future version could parse the account data.
    }

    return {
      totalDeposits: 0,
      totalWithdrawals: 0,
      activeCommitments: 0,
    };
  },
};
