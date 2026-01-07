import type { TransactionResponse } from '../types/index.js';
export declare const solanaService: {
    buildCreateProfileTx(wallet: string, username: string, bio: string, profileImageUri: string): Promise<TransactionResponse>;
    buildUpdateProfileTx(wallet: string, bio?: string, profileImageUri?: string): Promise<TransactionResponse>;
    buildCreatePostTx(wallet: string, contentUri: string, contentType: string, caption: string, isTokenGated: boolean, requiredToken?: string): Promise<TransactionResponse>;
    buildLikeTx(wallet: string, postId: string): Promise<TransactionResponse>;
    buildUnlikeTx(wallet: string, postId: string): Promise<TransactionResponse>;
    buildFollowTx(wallet: string, targetWallet: string): Promise<TransactionResponse>;
    buildUnfollowTx(wallet: string, targetWallet: string): Promise<TransactionResponse>;
    buildCommentTx(wallet: string, postId: string, text: string): Promise<TransactionResponse>;
    buildInitializeVaultTx(wallet: string): Promise<TransactionResponse>;
    buildTipTx(wallet: string, creatorWallet: string, amount: number, postId?: string): Promise<TransactionResponse>;
    buildSubscribeTx(wallet: string, creatorWallet: string, amountPerMonth: number): Promise<TransactionResponse>;
    buildCancelSubscriptionTx(wallet: string, creatorWallet: string): Promise<TransactionResponse>;
    buildWithdrawTx(wallet: string, amount: number): Promise<TransactionResponse>;
    buildSetAccessRequirementsTx(wallet: string, postId: string, requiredToken?: string, minimumBalance?: number, requiredNftCollection?: string): Promise<TransactionResponse>;
    buildVerifyTokenAccessTx(wallet: string, postId: string, userTokenAccount: string): Promise<TransactionResponse>;
    buildVerifyNftAccessTx(wallet: string, postId: string, nftTokenAccount: string, nftMint: string): Promise<TransactionResponse>;
    submitTransaction(signedTx: string): Promise<string>;
    getBalance(wallet: string): Promise<number>;
    checkVaultExists(wallet: string): Promise<boolean>;
    getVaultBalance(wallet: string): Promise<number>;
};
//# sourceMappingURL=solana.service.d.ts.map