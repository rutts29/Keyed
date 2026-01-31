import { PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { supabase } from '../config/supabase.js';
import { connection, getRecentBlockhash } from '../config/solana.js';
import { logger } from '../utils/logger.js';
import { addJob } from '../jobs/queues.js';

const BATCH_SIZE = 8;
const LAMPORTS_PER_SOL = 1_000_000_000;

// Estimated SOL fee per transfer (rent + tx fee)
const ESTIMATED_FEE_PER_TRANSFER = 0.005;

export const airdropService = {
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

  async buildFundEscrowTx(
    creatorWallet: string,
    tokenMint: string,
    totalAmount: number,
    escrowWallet: string
  ): Promise<{ transaction: string; blockhash: string; lastValidBlockHeight: number }> {
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

  async executeDistributionBatch(
    campaignId: string,
    recipientWallets: string[],
    tokenMint: string,
    amountPerRecipient: number,
    escrowKeypair: Keypair
  ): Promise<{ successful: string[]; failed: Array<{ wallet: string; error: string }> }> {
    const mint = new PublicKey(tokenMint);
    const escrowAta = getAssociatedTokenAddressSync(mint, escrowKeypair.publicKey, true);

    const successful: string[] = [];
    const failed: Array<{ wallet: string; error: string }> = [];

    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

    const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: escrowKeypair.publicKey });

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
              escrowKeypair.publicKey,
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
            escrowKeypair.publicKey,
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
        tx.sign(escrowKeypair);
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

  getBatchSize(): number {
    return BATCH_SIZE;
  },

  estimateFees(recipientCount: number): number {
    return recipientCount * ESTIMATED_FEE_PER_TRANSFER;
  },
};
