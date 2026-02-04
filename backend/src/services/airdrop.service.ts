import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import pkg from '@coral-xyz/anchor';
const { BN } = pkg;
import { supabase } from '../config/supabase.js';
import {
  connection,
  getRecentBlockhash,
  programs,
  programIds,
  pdaDerivation,
  fetchCampaignState,
} from '../config/solana.js';
import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';

const BATCH_SIZE = 8;

// Estimated SOL fee per transfer (rent + tx fee)
const ESTIMATED_FEE_PER_TRANSFER = 0.005;

export const airdropService = {
  /**
   * Check if airdrop program is available
   */
  isProgramAvailable(): boolean {
    return Boolean(programs.airdrop && programIds.airdrop);
  },

  /**
   * Generate a unique campaign ID (16 bytes)
   */
  generateCampaignId(): Buffer {
    return crypto.randomBytes(16);
  },

  /**
   * Derive campaign PDA from creator and campaign ID
   */
  deriveCampaignPda(creator: PublicKey, campaignId: Buffer): [PublicKey, number] {
    return pdaDerivation.airdropCampaign(creator, campaignId);
  },

  /**
   * Resolve audience wallets based on audience type
   */
  async resolveAudience(
    creatorWallet: string,
    audienceType: string,
    audienceFilter?: Record<string, unknown> | null
  ): Promise<string[]> {
    let wallets: string[] = [];

    switch (audienceType) {
      case 'followers': {
        const { data } = await supabase
          .from('follows')
          .select('follower_wallet')
          .eq('following_wallet', creatorWallet);
        wallets = (data || []).map((f: { follower_wallet: string }) => f.follower_wallet);
        break;
      }
      case 'tippers': {
        const minAmount = (audienceFilter?.minAmount as number) || 0;
        let query = supabase
          .from('transactions')
          .select('from_wallet')
          .eq('to_wallet', creatorWallet)
          .eq('type', 'tip')
          .eq('status', 'confirmed');

        if (minAmount > 0) {
          query = query.gte('amount', minAmount);
        }

        const { data } = await query;
        wallets = (data || []).map((t: { from_wallet: string }) => t.from_wallet);
        break;
      }
      case 'subscribers': {
        const { data } = await supabase
          .from('transactions')
          .select('from_wallet')
          .eq('to_wallet', creatorWallet)
          .eq('type', 'subscribe')
          .eq('status', 'confirmed');
        wallets = (data || []).map((t: { from_wallet: string }) => t.from_wallet);
        break;
      }
      case 'token_holders': {
        const tokenMint = audienceFilter?.tokenMint as string;
        if (!tokenMint) return [];

        // Query on-chain: get ALL token accounts for this mint using getProgramAccounts
        const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: tokenMint } },
          ],
        });
        for (const { account } of accounts) {
          try {
            // Owner is at bytes 32-64 of the token account data
            const ownerBytes = account.data.slice(32, 64);
            wallets.push(new PublicKey(ownerBytes).toBase58());
          } catch { }
        }
        break;
      }
      case 'custom': {
        wallets = (audienceFilter?.wallets as string[]) || [];
        break;
      }
    }

    // Deduplicate and remove the creator themselves
    const unique = [...new Set(wallets)].filter(w => w !== creatorWallet);
    return unique;
  },

  /**
   * Build transaction to create a campaign on-chain
   */
  async buildCreateCampaignTx(
    creatorWallet: string,
    campaignId: Buffer,
    tokenMint: string,
    amountPerRecipient: number,
    totalRecipients: number,
    crankAuthority: string
  ): Promise<{ transaction: string; campaignPda: string; escrowAta: string }> {
    if (!programs.airdrop || !programIds.airdrop) {
      throw new Error('Airdrop program not available');
    }

    const creator = new PublicKey(creatorWallet);
    const mint = new PublicKey(tokenMint);
    const crank = new PublicKey(crankAuthority);

    const [campaignPda] = this.deriveCampaignPda(creator, campaignId);
    const escrowAta = getAssociatedTokenAddressSync(mint, campaignPda, true);

    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

    const ix = await programs.airdrop.methods
      .createCampaign(
        Array.from(campaignId),
        new BN(amountPerRecipient),
        totalRecipients,
        crank
      )
      .accounts({
        creator,
        campaign: campaignPda,
        tokenMint: mint,
        escrowAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: creator });
    tx.add(ix);

    const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64');

    return {
      transaction: serialized,
      campaignPda: campaignPda.toBase58(),
      escrowAta: escrowAta.toBase58(),
    };
  },

  /**
   * Build transaction to fund a campaign
   */
  async buildFundCampaignTx(
    creatorWallet: string,
    campaignPda: string,
    tokenMint: string,
    amount: number
  ): Promise<{ transaction: string }> {
    if (!programs.airdrop || !programIds.airdrop) {
      throw new Error('Airdrop program not available');
    }

    const creator = new PublicKey(creatorWallet);
    const campaign = new PublicKey(campaignPda);
    const mint = new PublicKey(tokenMint);

    const creatorAta = getAssociatedTokenAddressSync(mint, creator);
    const escrowAta = getAssociatedTokenAddressSync(mint, campaign, true);

    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

    const ix = await programs.airdrop.methods
      .fundCampaign(new BN(amount))
      .accounts({
        creator,
        campaign,
        creatorAta,
        escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: creator });
    tx.add(ix);

    const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64');

    return { transaction: serialized };
  },

  /**
   * Build transaction to distribute tokens to a batch of recipients
   * This is called by the crank (backend service)
   */
  async buildDistributeBatchTx(
    crankAuthorityWallet: string,
    campaignPda: string,
    tokenMint: string,
    recipientWallets: string[]
  ): Promise<{ transaction: string }> {
    if (!programs.airdrop || !programIds.airdrop) {
      throw new Error('Airdrop program not available');
    }

    const crankAuthority = new PublicKey(crankAuthorityWallet);
    const campaign = new PublicKey(campaignPda);
    const mint = new PublicKey(tokenMint);

    const escrowAta = getAssociatedTokenAddressSync(mint, campaign, true);

    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: crankAuthority });

    // Create ATAs for recipients who don't have them
    // Using idempotent instruction which succeeds even if account exists
    const remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = [];
    for (const wallet of recipientWallets) {
      const owner = new PublicKey(wallet);
      const recipientAta = getAssociatedTokenAddressSync(mint, owner);

      // Add idempotent create ATA instruction (succeeds if already exists)
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          crankAuthority, // payer
          recipientAta,   // associatedToken
          owner,          // owner
          mint            // mint
        )
      );

      remainingAccounts.push({
        pubkey: recipientAta,
        isWritable: true,
        isSigner: false,
      });
    }

    // Add the distribute batch instruction
    const ix = await programs.airdrop.methods
      .distributeBatch(recipientWallets.length)
      .accounts({
        crankAuthority,
        campaign,
        escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    tx.add(ix);

    const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64');

    return { transaction: serialized };
  },

  /**
   * Build transaction to refund remaining tokens to creator
   */
  async buildRefundTx(
    creatorWallet: string,
    campaignPda: string,
    tokenMint: string
  ): Promise<{ transaction: string }> {
    if (!programs.airdrop || !programIds.airdrop) {
      throw new Error('Airdrop program not available');
    }

    const creator = new PublicKey(creatorWallet);
    const campaign = new PublicKey(campaignPda);
    const mint = new PublicKey(tokenMint);

    const creatorAta = getAssociatedTokenAddressSync(mint, creator);
    const escrowAta = getAssociatedTokenAddressSync(mint, campaign, true);

    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

    const ix = await programs.airdrop.methods
      .refund()
      .accounts({
        creator,
        campaign,
        creatorAta,
        escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: creator });
    tx.add(ix);

    const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64');

    return { transaction: serialized };
  },

  /**
   * Get token balance for a wallet
   */
  async getTokenBalance(walletAddress: string, tokenMint: string): Promise<number> {
    try {
      const wallet = new PublicKey(walletAddress);
      const mint = new PublicKey(tokenMint);
      const ata = getAssociatedTokenAddressSync(mint, wallet);
      const account = await getAccount(connection, ata);
      return Number(account.amount);
    } catch {
      return 0;
    }
  },

  /**
   * Fetch campaign state from on-chain
   */
  async getCampaignState(campaignPda: string) {
    return fetchCampaignState(new PublicKey(campaignPda));
  },

  /**
   * Check if recipient ATAs exist, create if needed
   * Returns list of wallets that need ATAs created
   */
  async checkRecipientATAs(
    tokenMint: string,
    recipientWallets: string[]
  ): Promise<{ existing: string[]; needsCreation: string[] }> {
    const mint = new PublicKey(tokenMint);
    const existing: string[] = [];
    const needsCreation: string[] = [];

    for (const wallet of recipientWallets) {
      try {
        const ata = getAssociatedTokenAddressSync(mint, new PublicKey(wallet));
        await getAccount(connection, ata);
        existing.push(wallet);
      } catch {
        needsCreation.push(wallet);
      }
    }

    return { existing, needsCreation };
  },

  getBatchSize(): number {
    return BATCH_SIZE;
  },

  estimateFees(recipientCount: number): number {
    return recipientCount * ESTIMATED_FEE_PER_TRANSFER;
  },

  // ============================================================
  // DEPRECATED: Legacy methods for backward compatibility
  // These will be removed once controller is updated to use program
  // ============================================================

  /**
   * @deprecated Use buildFundCampaignTx instead - this bypasses the program
   */
  async buildFundEscrowTx(
    creatorWallet: string,
    tokenMint: string,
    totalAmount: number,
    escrowWallet: string
  ): Promise<{ transaction: string; blockhash: string; lastValidBlockHeight: number }> {
    logger.warn('Using deprecated buildFundEscrowTx - should migrate to program-based flow');

    const { Transaction } = await import('@solana/web3.js');
    const { createTransferInstruction, createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');

    const creator = new PublicKey(creatorWallet);
    const mint = new PublicKey(tokenMint);
    const escrow = new PublicKey(escrowWallet);

    const creatorAta = getAssociatedTokenAddressSync(mint, creator);
    const escrowAta = getAssociatedTokenAddressSync(mint, escrow, true);

    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

    const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: creator });

    // Create escrow ATA if needed
    try {
      await getAccount(connection, escrowAta);
    } catch {
      tx.add(
        createAssociatedTokenAccountInstruction(
          creator,
          escrowAta,
          escrow,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Transfer tokens to escrow
    tx.add(
      createTransferInstruction(
        creatorAta,
        escrowAta,
        creator,
        BigInt(totalAmount)
      )
    );

    const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64');

    return { transaction: serialized, blockhash, lastValidBlockHeight };
  },

  /**
   * @deprecated Use program-based distribution - this uses raw keypair
   */
  async executeDistributionBatch(
    campaignId: string,
    recipientWallets: string[],
    tokenMint: string,
    amountPerRecipient: number,
    escrowKeypair: { publicKey: PublicKey; secretKey: Uint8Array }
  ): Promise<{ successful: string[]; failed: Array<{ wallet: string; error: string }> }> {
    logger.warn('Using deprecated executeDistributionBatch - should migrate to program-based flow');

    const { Transaction, Keypair } = await import('@solana/web3.js');
    const { createTransferInstruction, createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');

    const mint = new PublicKey(tokenMint);
    const keypair = Keypair.fromSecretKey(escrowKeypair.secretKey);
    const escrowAta = getAssociatedTokenAddressSync(mint, keypair.publicKey, true);

    const successful: string[] = [];
    const failed: Array<{ wallet: string; error: string }> = [];

    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

    const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: keypair.publicKey });

    const validRecipients: PublicKey[] = [];

    for (const wallet of recipientWallets) {
      try {
        const recipient = new PublicKey(wallet);
        const recipientAta = getAssociatedTokenAddressSync(mint, recipient);

        // Create recipient ATA if needed
        try {
          await getAccount(connection, recipientAta);
        } catch {
          tx.add(
            createAssociatedTokenAccountInstruction(
              keypair.publicKey,
              recipientAta,
              recipient,
              mint,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        tx.add(
          createTransferInstruction(
            escrowAta,
            recipientAta,
            keypair.publicKey,
            BigInt(amountPerRecipient)
          )
        );

        validRecipients.push(recipient);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ wallet, error: errMsg });
      }
    }

    if (validRecipients.length > 0) {
      try {
        tx.sign(keypair);
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

        // Update recipient statuses
        for (const recipient of validRecipients) {
          const wallet = recipient.toBase58();
          await supabase
            .from('airdrop_recipients')
            .update({ status: 'sent', tx_signature: signature })
            .eq('campaign_id', campaignId)
            .eq('wallet', wallet);
          successful.push(wallet);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Transaction failed';
        logger.error({ error, campaignId }, 'Distribution batch failed');

        for (const recipient of validRecipients) {
          const wallet = recipient.toBase58();
          await supabase
            .from('airdrop_recipients')
            .update({ status: 'failed', error_message: errMsg })
            .eq('campaign_id', campaignId)
            .eq('wallet', wallet);
          failed.push({ wallet, error: errMsg });
        }
      }
    }

    return { successful, failed };
  },
};
