import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import pkg from '@coral-xyz/anchor';
const { BN } = pkg;
import {
  connection,
  getRecentBlockhash,
  programIds,
  programs,
  pdaDerivation,
  fetchUserProfile,
  fetchCreatorVault,
  fetchPlatformConfig,
  fetchPost,
} from '../config/solana.js';
import { logger } from '../utils/logger.js';
import { toValidatedPublicKey, toOptionalPublicKey } from '../utils/validation.js';
import type { TransactionResponse } from '../types/index.js';

const PLATFORM_FEE_BPS = 200; // 2% (used as fallback)

function serializeTransaction(tx: Transaction): string {
  return tx.serialize({ requireAllSignatures: false }).toString('base64');
}

async function createTxShell(feePayer: string) {
  const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
  const payerPubkey = new PublicKey(feePayer);
  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payerPubkey;
  return { tx, payerPubkey, blockhash, lastValidBlockHeight };
}

function finalizeTx(tx: Transaction, blockhash: string, lastValidBlockHeight: number): TransactionResponse {
  return {
    transaction: serializeTransaction(tx),
    blockhash,
    lastValidBlockHeight,
  };
}

// Content type enum matching the Solana program
const ContentType = {
  Image: { image: {} },
  Video: { video: {} },
  Text: { text: {} },
  Multi: { multi: {} },
} as const;

function getContentType(type: string) {
  switch (type.toLowerCase()) {
    case 'video':
      return ContentType.Video;
    case 'text':
      return ContentType.Text;
    case 'multi':
      return ContentType.Multi;
    default:
      return ContentType.Image;
  }
}

export const solanaService = {
  async buildCreateProfileTx(
    wallet: string,
    username: string,
    bio: string,
    profileImageUri: string
  ): Promise<TransactionResponse> {
    const { tx, payerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);

    if (programs.social) {
      const [profilePda] = pdaDerivation.userProfile(payerPubkey);

      const ix = await programs.social.methods
        .createProfile(username, bio, profileImageUri)
        .accounts({
          profile: profilePda,
          authority: payerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
      logger.debug({ wallet, profilePda: profilePda.toBase58() }, 'Built create profile tx');
    } else {
      logger.warn('Social program not available, returning empty transaction');
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildUpdateProfileTx(
    wallet: string,
    bio?: string,
    profileImageUri?: string
  ): Promise<TransactionResponse> {
    const { tx, payerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);

    if (programs.social) {
      const [profilePda] = pdaDerivation.userProfile(payerPubkey);

      const ix = await programs.social.methods
        .updateProfile(bio ?? null, profileImageUri ?? null)
        .accounts({
          profile: profilePda,
          authority: payerPubkey,
        })
        .instruction();

      tx.add(ix);
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildCreatePostTx(
    wallet: string,
    contentUri: string,
    contentType: string,
    caption: string,
    isTokenGated: boolean,
    requiredToken?: string
  ): Promise<TransactionResponse> {
    const { tx, payerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);

    if (programs.social) {
      // Get user profile to determine post index
      const profile = await fetchUserProfile(payerPubkey);
      const postCount = profile?.postCount ? BigInt(profile.postCount.toString()) : BigInt(0);

      const [profilePda] = pdaDerivation.userProfile(payerPubkey);
      const [postPda] = pdaDerivation.post(payerPubkey, postCount);

      const tokenPubkey = requiredToken ? new PublicKey(requiredToken) : null;

      const ix = await programs.social.methods
        .createPost(
          contentUri,
          getContentType(contentType),
          caption,
          isTokenGated,
          tokenPubkey
        )
        .accounts({
          post: postPda,
          profile: profilePda,
          authority: payerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
      logger.debug({ wallet, postPda: postPda.toBase58(), postIndex: postCount.toString() }, 'Built create post tx');
    } else {
      logger.warn('Social program not available, returning empty transaction');
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildLikeTx(wallet: string, postId: string): Promise<TransactionResponse> {
    const { tx, payerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const postPubkey = new PublicKey(postId);

    if (programs.social) {
      const [likePda] = pdaDerivation.like(postPubkey, payerPubkey);

      const ix = await programs.social.methods
        .likePost()
        .accounts({
          post: postPubkey,
          like: likePda,
          user: payerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
      logger.debug({ wallet, postId, likePda: likePda.toBase58() }, 'Built like tx');
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildUnlikeTx(wallet: string, postId: string): Promise<TransactionResponse> {
    const { tx, payerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const postPubkey = new PublicKey(postId);

    if (programs.social) {
      const [likePda] = pdaDerivation.like(postPubkey, payerPubkey);

      const ix = await programs.social.methods
        .unlikePost()
        .accounts({
          post: postPubkey,
          like: likePda,
          user: payerPubkey,
        })
        .instruction();

      tx.add(ix);
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildFollowTx(wallet: string, targetWallet: string): Promise<TransactionResponse> {
    const { tx, payerPubkey: followerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const followingPubkey = new PublicKey(targetWallet);

    if (programs.social) {
      const [followPda] = pdaDerivation.follow(followerPubkey, followingPubkey);
      const [followerProfilePda] = pdaDerivation.userProfile(followerPubkey);
      const [followingProfilePda] = pdaDerivation.userProfile(followingPubkey);

      const ix = await programs.social.methods
        .followUser()
        .accounts({
          follow: followPda,
          followerProfile: followerProfilePda,
          followingProfile: followingProfilePda,
          follower: followerPubkey,
          authority: followerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
      logger.debug({ wallet, targetWallet, followPda: followPda.toBase58() }, 'Built follow tx');
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildUnfollowTx(wallet: string, targetWallet: string): Promise<TransactionResponse> {
    const { tx, payerPubkey: followerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const followingPubkey = new PublicKey(targetWallet);

    if (programs.social) {
      const [followPda] = pdaDerivation.follow(followerPubkey, followingPubkey);
      const [followerProfilePda] = pdaDerivation.userProfile(followerPubkey);
      const [followingProfilePda] = pdaDerivation.userProfile(followingPubkey);

      const ix = await programs.social.methods
        .unfollowUser()
        .accounts({
          follow: followPda,
          followerProfile: followerProfilePda,
          followingProfile: followingProfilePda,
          follower: followerPubkey,
          authority: followerPubkey,
        })
        .instruction();

      tx.add(ix);
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildCommentTx(wallet: string, postId: string, text: string): Promise<TransactionResponse> {
    const { tx, payerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const postPubkey = new PublicKey(postId);

    if (programs.social) {
      // Fetch current comment count from the post
      let commentCount = BigInt(0);
      try {
        const postAccount = await fetchPost(postPubkey);
        if (postAccount) {
          commentCount = BigInt(postAccount.comments.toString());
        }
      } catch (e) {
        logger.warn({ postId }, 'Could not fetch post for comment count, using 0');
      }

      const [commentPda] = pdaDerivation.comment(postPubkey, commentCount);

      const ix = await programs.social.methods
        .commentPost(text)
        .accounts({
          post: postPubkey,
          comment: commentPda,
          commenter: payerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
      logger.debug({ wallet, postId, commentPda: commentPda.toBase58() }, 'Built comment tx');
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildInitializeVaultTx(wallet: string): Promise<TransactionResponse> {
    const { tx, payerPubkey: creatorPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);

    if (programs.payment) {
      const [vaultPda] = pdaDerivation.creatorVault(creatorPubkey);

      const ix = await programs.payment.methods
        .initializeVault()
        .accounts({
          vault: vaultPda,
          creator: creatorPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
      logger.debug({ wallet, vaultPda: vaultPda.toBase58() }, 'Built initialize vault tx');
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildTipTx(
    wallet: string,
    creatorWallet: string,
    amount: number,
    postId?: string
  ): Promise<TransactionResponse> {
    const { tx, payerPubkey: tipperPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const creatorPubkey = new PublicKey(creatorWallet);

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    if (programs.payment && programIds.payment) {
      // Get platform config for fee recipient
      const platformConfig = await fetchPlatformConfig();

      if (platformConfig) {
        const [configPda] = pdaDerivation.platformConfig();
        const [vaultPda] = pdaDerivation.creatorVault(creatorPubkey);

        // Get next tip index for this tipper (using timestamp as index for uniqueness)
        const tipIndex = BigInt(Date.now());
        const [tipRecordPda] = pdaDerivation.tipRecord(tipperPubkey, tipIndex);

        const postPubkey = postId ? new PublicKey(postId) : null;

        const ix = await programs.payment.methods
          .tipCreator(new BN(lamports), postPubkey, new BN(tipIndex.toString()))
          .accounts({
            config: configPda,
            creatorVault: vaultPda,
            tipRecord: tipRecordPda,
            tipper: tipperPubkey,
            creator: creatorPubkey,
            feeRecipient: platformConfig.feeRecipient,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        tx.add(ix);
        logger.debug({ wallet, creatorWallet, amount, lamports }, 'Built tip tx with payment program');
      } else {
        // Fallback: Direct transfer without payment program
        logger.warn('Platform config not found, using direct transfer');
        const fee = Math.floor(lamports * PLATFORM_FEE_BPS / 10000);
        const netAmount = lamports - fee;

        tx.add(
          SystemProgram.transfer({
            fromPubkey: tipperPubkey,
            toPubkey: creatorPubkey,
            lamports: netAmount,
          })
        );
      }
    } else {
      // Fallback: Simple SOL transfer
      const fee = Math.floor(lamports * PLATFORM_FEE_BPS / 10000);
      const netAmount = lamports - fee;

      tx.add(
        SystemProgram.transfer({
          fromPubkey: tipperPubkey,
          toPubkey: creatorPubkey,
          lamports: netAmount,
        })
      );
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildSubscribeTx(
    wallet: string,
    creatorWallet: string,
    amountPerMonth: number
  ): Promise<TransactionResponse> {
    const { tx, payerPubkey: subscriberPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const creatorPubkey = new PublicKey(creatorWallet);

    const lamports = Math.floor(amountPerMonth * LAMPORTS_PER_SOL);

    if (programs.payment && programIds.payment) {
      const platformConfig = await fetchPlatformConfig();

      if (platformConfig) {
        const [configPda] = pdaDerivation.platformConfig();
        const [vaultPda] = pdaDerivation.creatorVault(creatorPubkey);
        const [subscriptionPda] = pdaDerivation.subscription(subscriberPubkey, creatorPubkey);

        const ix = await programs.payment.methods
          .subscribe(new BN(lamports))
          .accounts({
            config: configPda,
            creatorVault: vaultPda,
            subscription: subscriptionPda,
            subscriber: subscriberPubkey,
            creator: creatorPubkey,
            feeRecipient: platformConfig.feeRecipient,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        tx.add(ix);
        logger.debug({ wallet, creatorWallet, amountPerMonth }, 'Built subscribe tx');
      } else {
        // Fallback to simple transfer
        tx.add(
          SystemProgram.transfer({
            fromPubkey: subscriberPubkey,
            toPubkey: creatorPubkey,
            lamports,
          })
        );
      }
    } else {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: subscriberPubkey,
          toPubkey: creatorPubkey,
          lamports,
        })
      );
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildCancelSubscriptionTx(
    wallet: string,
    creatorWallet: string
  ): Promise<TransactionResponse> {
    const { tx, payerPubkey: subscriberPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const creatorPubkey = new PublicKey(creatorWallet);

    if (programs.payment && programIds.payment) {
      const [vaultPda] = pdaDerivation.creatorVault(creatorPubkey);
      const [subscriptionPda] = pdaDerivation.subscription(subscriberPubkey, creatorPubkey);

      const ix = await programs.payment.methods
        .cancelSubscription()
        .accounts({
          creatorVault: vaultPda,
          subscription: subscriptionPda,
          subscriber: subscriberPubkey,
        })
        .instruction();

      tx.add(ix);
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildWithdrawTx(wallet: string, amount: number): Promise<TransactionResponse> {
    const { tx, payerPubkey: creatorPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    if (programs.payment && programIds.payment) {
      const [vaultPda] = pdaDerivation.creatorVault(creatorPubkey);

      const ix = await programs.payment.methods
        .withdraw(new BN(lamports))
        .accounts({
          vault: vaultPda,
          creator: creatorPubkey,
        })
        .instruction();

      tx.add(ix);
      logger.debug({ wallet, amount, lamports }, 'Built withdraw tx');
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  // Token gate program transactions
  async buildSetAccessRequirementsTx(
    wallet: string,
    postId: string,
    requiredToken?: string,
    minimumBalance: number = 0,
    requiredNftCollection?: string
  ): Promise<TransactionResponse> {
    const { tx, payerPubkey: creatorPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const postPubkey = new PublicKey(postId);

    if (programs.tokenGate && programIds.tokenGate) {
      const [accessControlPda] = pdaDerivation.accessControl(postPubkey);

      const tokenPubkey = requiredToken ? new PublicKey(requiredToken) : null;
      const nftCollectionPubkey = requiredNftCollection
        ? new PublicKey(requiredNftCollection)
        : null;

      const ix = await programs.tokenGate.methods
        .setAccessRequirements(
          postPubkey,
          tokenPubkey,
          new BN(minimumBalance),
          nftCollectionPubkey
        )
        .accounts({
          accessControl: accessControlPda,
          creator: creatorPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
      logger.debug({ wallet, postId }, 'Built set access requirements tx');
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildVerifyTokenAccessTx(
    wallet: string,
    postId: string,
    userTokenAccount: string
  ): Promise<TransactionResponse> {
    const { tx, payerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const postPubkey = new PublicKey(postId);
    const tokenAccountPubkey = new PublicKey(userTokenAccount);

    if (programs.tokenGate && programIds.tokenGate) {
      const [accessControlPda] = pdaDerivation.accessControl(postPubkey);
      const [verificationPda] = pdaDerivation.accessVerification(payerPubkey, postPubkey);

      const ix = await programs.tokenGate.methods
        .verifyTokenAccess()
        .accounts({
          accessControl: accessControlPda,
          verification: verificationPda,
          userTokenAccount: tokenAccountPubkey,
          user: payerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async buildVerifyNftAccessTx(
    wallet: string,
    postId: string,
    nftTokenAccount: string,
    nftMint: string
  ): Promise<TransactionResponse> {
    const { tx, payerPubkey, blockhash, lastValidBlockHeight } = await createTxShell(wallet);
    const postPubkey = new PublicKey(postId);
    const nftTokenAccountPubkey = new PublicKey(nftTokenAccount);
    const nftMintPubkey = new PublicKey(nftMint);

    if (programs.tokenGate && programIds.tokenGate) {
      const [accessControlPda] = pdaDerivation.accessControl(postPubkey);
      const [verificationPda] = pdaDerivation.accessVerification(payerPubkey, postPubkey);

      const ix = await programs.tokenGate.methods
        .verifyNftAccess()
        .accounts({
          accessControl: accessControlPda,
          verification: verificationPda,
          nftTokenAccount: nftTokenAccountPubkey,
          nftMint: nftMintPubkey,
          user: payerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
    }

    return finalizeTx(tx, blockhash, lastValidBlockHeight);
  },

  async submitTransaction(signedTx: string): Promise<string> {
    const buffer = Buffer.from(signedTx, 'base64');
    const signature = await connection.sendRawTransaction(buffer, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    await connection.confirmTransaction(signature, 'confirmed');
    logger.info({ signature }, 'Transaction confirmed');

    return signature;
  },

  async getBalance(wallet: string): Promise<number> {
    const pubkey = new PublicKey(wallet);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  },

  // Utility functions for checking on-chain state
  async checkVaultExists(wallet: string): Promise<boolean> {
    const vault = await fetchCreatorVault(new PublicKey(wallet));
    return vault !== null;
  },

  async getVaultBalance(wallet: string): Promise<number> {
    const vault = await fetchCreatorVault(new PublicKey(wallet));
    if (!vault) return 0;
    const earned = BigInt(vault.totalEarned.toString());
    const withdrawn = BigInt(vault.withdrawn.toString());
    return Number(earned - withdrawn) / LAMPORTS_PER_SOL;
  },
};
