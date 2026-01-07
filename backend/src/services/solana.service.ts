import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { connection, getRecentBlockhash, programIds } from '../config/solana.js';
import { logger } from '../utils/logger.js';
import type { TransactionResponse } from '../types/index.js';

const PLATFORM_FEE_BPS = 200; // 2%

function serializeTransaction(tx: Transaction): string {
  return tx.serialize({ requireAllSignatures: false }).toString('base64');
}

export const solanaService = {
  async buildCreateProfileTx(
    wallet: string,
    _username: string,
    _bio: string,
    _profileImageUri: string
  ): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    if (programIds.social) {
      // TODO: Add actual Anchor instruction when IDL available
      const ix = new TransactionInstruction({
        keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
        programId: programIds.social,
        data: Buffer.from([]),
      });
      tx.add(ix);
    }
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async buildCreatePostTx(
    wallet: string,
    _contentUri: string,
    _contentType: string,
    _caption: string,
    _isTokenGated: boolean,
    _requiredToken?: string
  ): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    if (programIds.social) {
      const ix = new TransactionInstruction({
        keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
        programId: programIds.social,
        data: Buffer.from([]),
      });
      tx.add(ix);
    }
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async buildLikeTx(wallet: string, _postId: string): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    if (programIds.social) {
      const ix = new TransactionInstruction({
        keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
        programId: programIds.social,
        data: Buffer.from([]),
      });
      tx.add(ix);
    }
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async buildUnlikeTx(wallet: string, _postId: string): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async buildFollowTx(wallet: string, _targetWallet: string): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    if (programIds.social) {
      const ix = new TransactionInstruction({
        keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
        programId: programIds.social,
        data: Buffer.from([]),
      });
      tx.add(ix);
    }
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async buildUnfollowTx(wallet: string, _targetWallet: string): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async buildCommentTx(wallet: string, _postId: string, _text: string): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    if (programIds.social) {
      const ix = new TransactionInstruction({
        keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
        programId: programIds.social,
        data: Buffer.from([]),
      });
      tx.add(ix);
    }
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async buildTipTx(
    wallet: string,
    creatorWallet: string,
    amount: number,
    _postId?: string
  ): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    const creatorPubkey = new PublicKey(creatorWallet);
    
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    const fee = Math.floor(lamports * PLATFORM_FEE_BPS / 10000);
    const netAmount = lamports - fee;
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    tx.add(
      SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: creatorPubkey,
        lamports: netAmount,
      })
    );
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async buildSubscribeTx(
    wallet: string,
    creatorWallet: string,
    amountPerMonth: number
  ): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    const creatorPubkey = new PublicKey(creatorWallet);
    
    const lamports = Math.floor(amountPerMonth * LAMPORTS_PER_SOL);
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    tx.add(
      SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: creatorPubkey,
        lamports,
      })
    );
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async buildWithdrawTx(wallet: string, _amount: number): Promise<TransactionResponse> {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
    const userPubkey = new PublicKey(wallet);
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;
    
    return {
      transaction: serializeTransaction(tx),
      blockhash,
      lastValidBlockHeight,
    };
  },

  async submitTransaction(signedTx: string): Promise<string> {
    const buffer = Buffer.from(signedTx, 'base64');
    const signature = await connection.sendRawTransaction(buffer);
    
    await connection.confirmTransaction(signature, 'confirmed');
    logger.info({ signature }, 'Transaction confirmed');
    
    return signature;
  },

  async getBalance(wallet: string): Promise<number> {
    const pubkey = new PublicKey(wallet);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  },
};
