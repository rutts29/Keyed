import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, } from '@solana/web3.js';
import pkg from '@coral-xyz/anchor';
const { BN } = pkg;
import { connection, getRecentBlockhash, programIds, programs, pdaDerivation, fetchUserProfile, fetchCreatorVault, fetchPlatformConfig, fetchPost, } from '../config/solana.js';
import { logger } from '../utils/logger.js';
const PLATFORM_FEE_BPS = 200; // 2% (used as fallback)
function serializeTransaction(tx) {
    return tx.serialize({ requireAllSignatures: false }).toString('base64');
}
// Content type enum matching the Solana program
const ContentType = {
    Image: { image: {} },
    Video: { video: {} },
    Text: { text: {} },
    Multi: { multi: {} },
};
function getContentType(type) {
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
    async buildCreateProfileTx(wallet, username, bio, profileImageUri) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const userPubkey = new PublicKey(wallet);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (programs.social) {
            const [profilePda] = pdaDerivation.userProfile(userPubkey);
            const ix = await programs.social.methods
                .createProfile(username, bio, profileImageUri)
                .accounts({
                profile: profilePda,
                authority: userPubkey,
                systemProgram: SystemProgram.programId,
            })
                .instruction();
            tx.add(ix);
            logger.debug({ wallet, profilePda: profilePda.toBase58() }, 'Built create profile tx');
        }
        else {
            logger.warn('Social program not available, returning empty transaction');
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildUpdateProfileTx(wallet, bio, profileImageUri) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const userPubkey = new PublicKey(wallet);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (programs.social) {
            const [profilePda] = pdaDerivation.userProfile(userPubkey);
            const ix = await programs.social.methods
                .updateProfile(bio ?? null, profileImageUri ?? null)
                .accounts({
                profile: profilePda,
                authority: userPubkey,
            })
                .instruction();
            tx.add(ix);
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildCreatePostTx(wallet, contentUri, contentType, caption, isTokenGated, requiredToken) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const userPubkey = new PublicKey(wallet);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (programs.social) {
            // Get user profile to determine post index
            const profile = await fetchUserProfile(userPubkey);
            const postCount = profile?.postCount ? BigInt(profile.postCount.toString()) : BigInt(0);
            const [profilePda] = pdaDerivation.userProfile(userPubkey);
            const [postPda] = pdaDerivation.post(userPubkey, postCount);
            const tokenPubkey = requiredToken ? new PublicKey(requiredToken) : null;
            const ix = await programs.social.methods
                .createPost(contentUri, getContentType(contentType), caption, isTokenGated, tokenPubkey)
                .accounts({
                post: postPda,
                profile: profilePda,
                authority: userPubkey,
                systemProgram: SystemProgram.programId,
            })
                .instruction();
            tx.add(ix);
            logger.debug({ wallet, postPda: postPda.toBase58(), postIndex: postCount.toString() }, 'Built create post tx');
        }
        else {
            logger.warn('Social program not available, returning empty transaction');
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildLikeTx(wallet, postId) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const userPubkey = new PublicKey(wallet);
        const postPubkey = new PublicKey(postId);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (programs.social) {
            const [likePda] = pdaDerivation.like(postPubkey, userPubkey);
            const ix = await programs.social.methods
                .likePost()
                .accounts({
                post: postPubkey,
                like: likePda,
                user: userPubkey,
                systemProgram: SystemProgram.programId,
            })
                .instruction();
            tx.add(ix);
            logger.debug({ wallet, postId, likePda: likePda.toBase58() }, 'Built like tx');
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildUnlikeTx(wallet, postId) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const userPubkey = new PublicKey(wallet);
        const postPubkey = new PublicKey(postId);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (programs.social) {
            const [likePda] = pdaDerivation.like(postPubkey, userPubkey);
            const ix = await programs.social.methods
                .unlikePost()
                .accounts({
                post: postPubkey,
                like: likePda,
                user: userPubkey,
            })
                .instruction();
            tx.add(ix);
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildFollowTx(wallet, targetWallet) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const followerPubkey = new PublicKey(wallet);
        const followingPubkey = new PublicKey(targetWallet);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = followerPubkey;
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
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildUnfollowTx(wallet, targetWallet) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const followerPubkey = new PublicKey(wallet);
        const followingPubkey = new PublicKey(targetWallet);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = followerPubkey;
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
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildCommentTx(wallet, postId, text) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const userPubkey = new PublicKey(wallet);
        const postPubkey = new PublicKey(postId);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (programs.social) {
            // Fetch current comment count from the post
            let commentCount = BigInt(0);
            try {
                const postAccount = await fetchPost(postPubkey);
                if (postAccount) {
                    commentCount = BigInt(postAccount.comments.toString());
                }
            }
            catch (e) {
                logger.warn({ postId }, 'Could not fetch post for comment count, using 0');
            }
            const [commentPda] = pdaDerivation.comment(postPubkey, commentCount);
            const ix = await programs.social.methods
                .commentPost(text)
                .accounts({
                post: postPubkey,
                comment: commentPda,
                commenter: userPubkey,
                systemProgram: SystemProgram.programId,
            })
                .instruction();
            tx.add(ix);
            logger.debug({ wallet, postId, commentPda: commentPda.toBase58() }, 'Built comment tx');
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildInitializeVaultTx(wallet) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const creatorPubkey = new PublicKey(wallet);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = creatorPubkey;
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
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildTipTx(wallet, creatorWallet, amount, postId) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const tipperPubkey = new PublicKey(wallet);
        const creatorPubkey = new PublicKey(creatorWallet);
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = tipperPubkey;
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
            }
            else {
                // Fallback: Direct transfer without payment program
                logger.warn('Platform config not found, using direct transfer');
                const fee = Math.floor(lamports * PLATFORM_FEE_BPS / 10000);
                const netAmount = lamports - fee;
                tx.add(SystemProgram.transfer({
                    fromPubkey: tipperPubkey,
                    toPubkey: creatorPubkey,
                    lamports: netAmount,
                }));
            }
        }
        else {
            // Fallback: Simple SOL transfer
            const fee = Math.floor(lamports * PLATFORM_FEE_BPS / 10000);
            const netAmount = lamports - fee;
            tx.add(SystemProgram.transfer({
                fromPubkey: tipperPubkey,
                toPubkey: creatorPubkey,
                lamports: netAmount,
            }));
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildSubscribeTx(wallet, creatorWallet, amountPerMonth) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const subscriberPubkey = new PublicKey(wallet);
        const creatorPubkey = new PublicKey(creatorWallet);
        const lamports = Math.floor(amountPerMonth * LAMPORTS_PER_SOL);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = subscriberPubkey;
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
            }
            else {
                // Fallback to simple transfer
                tx.add(SystemProgram.transfer({
                    fromPubkey: subscriberPubkey,
                    toPubkey: creatorPubkey,
                    lamports,
                }));
            }
        }
        else {
            tx.add(SystemProgram.transfer({
                fromPubkey: subscriberPubkey,
                toPubkey: creatorPubkey,
                lamports,
            }));
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildCancelSubscriptionTx(wallet, creatorWallet) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const subscriberPubkey = new PublicKey(wallet);
        const creatorPubkey = new PublicKey(creatorWallet);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = subscriberPubkey;
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
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildWithdrawTx(wallet, amount) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const creatorPubkey = new PublicKey(wallet);
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = creatorPubkey;
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
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    // Token gate program transactions
    async buildSetAccessRequirementsTx(wallet, postId, requiredToken, minimumBalance = 0, requiredNftCollection) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const creatorPubkey = new PublicKey(wallet);
        const postPubkey = new PublicKey(postId);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = creatorPubkey;
        if (programs.tokenGate && programIds.tokenGate) {
            const [accessControlPda] = pdaDerivation.accessControl(postPubkey);
            const tokenPubkey = requiredToken ? new PublicKey(requiredToken) : null;
            const nftCollectionPubkey = requiredNftCollection
                ? new PublicKey(requiredNftCollection)
                : null;
            const ix = await programs.tokenGate.methods
                .setAccessRequirements(postPubkey, tokenPubkey, new BN(minimumBalance), nftCollectionPubkey)
                .accounts({
                accessControl: accessControlPda,
                creator: creatorPubkey,
                systemProgram: SystemProgram.programId,
            })
                .instruction();
            tx.add(ix);
            logger.debug({ wallet, postId }, 'Built set access requirements tx');
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildVerifyTokenAccessTx(wallet, postId, userTokenAccount) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const userPubkey = new PublicKey(wallet);
        const postPubkey = new PublicKey(postId);
        const tokenAccountPubkey = new PublicKey(userTokenAccount);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (programs.tokenGate && programIds.tokenGate) {
            const [accessControlPda] = pdaDerivation.accessControl(postPubkey);
            const [verificationPda] = pdaDerivation.accessVerification(userPubkey, postPubkey);
            const ix = await programs.tokenGate.methods
                .verifyTokenAccess()
                .accounts({
                accessControl: accessControlPda,
                verification: verificationPda,
                userTokenAccount: tokenAccountPubkey,
                user: userPubkey,
                systemProgram: SystemProgram.programId,
            })
                .instruction();
            tx.add(ix);
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildVerifyNftAccessTx(wallet, postId, nftTokenAccount, nftMint) {
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
        const userPubkey = new PublicKey(wallet);
        const postPubkey = new PublicKey(postId);
        const nftTokenAccountPubkey = new PublicKey(nftTokenAccount);
        const nftMintPubkey = new PublicKey(nftMint);
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (programs.tokenGate && programIds.tokenGate) {
            const [accessControlPda] = pdaDerivation.accessControl(postPubkey);
            const [verificationPda] = pdaDerivation.accessVerification(userPubkey, postPubkey);
            const ix = await programs.tokenGate.methods
                .verifyNftAccess()
                .accounts({
                accessControl: accessControlPda,
                verification: verificationPda,
                nftTokenAccount: nftTokenAccountPubkey,
                nftMint: nftMintPubkey,
                user: userPubkey,
                systemProgram: SystemProgram.programId,
            })
                .instruction();
            tx.add(ix);
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async submitTransaction(signedTx) {
        const buffer = Buffer.from(signedTx, 'base64');
        const signature = await connection.sendRawTransaction(buffer, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });
        await connection.confirmTransaction(signature, 'confirmed');
        logger.info({ signature }, 'Transaction confirmed');
        return signature;
    },
    async getBalance(wallet) {
        const pubkey = new PublicKey(wallet);
        const balance = await connection.getBalance(pubkey);
        return balance / LAMPORTS_PER_SOL;
    },
    // Utility functions for checking on-chain state
    async checkVaultExists(wallet) {
        const vault = await fetchCreatorVault(new PublicKey(wallet));
        return vault !== null;
    },
    async getVaultBalance(wallet) {
        const vault = await fetchCreatorVault(new PublicKey(wallet));
        if (!vault)
            return 0;
        const earned = BigInt(vault.totalEarned.toString());
        const withdrawn = BigInt(vault.withdrawn.toString());
        return Number(earned - withdrawn) / LAMPORTS_PER_SOL;
    },
};
//# sourceMappingURL=solana.service.js.map