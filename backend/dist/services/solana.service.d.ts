import type { TransactionResponse } from '../types/index.js';
export declare const solanaService: {
    buildCreateProfileTx(wallet: string, _username: string, _bio: string, _profileImageUri: string): Promise<TransactionResponse>;
    buildCreatePostTx(wallet: string, _contentUri: string, _contentType: string, _caption: string, _isTokenGated: boolean, _requiredToken?: string): Promise<TransactionResponse>;
    buildLikeTx(wallet: string, _postId: string): Promise<TransactionResponse>;
    buildUnlikeTx(wallet: string, _postId: string): Promise<TransactionResponse>;
    buildFollowTx(wallet: string, _targetWallet: string): Promise<TransactionResponse>;
    buildUnfollowTx(wallet: string, _targetWallet: string): Promise<TransactionResponse>;
    buildCommentTx(wallet: string, _postId: string, _text: string): Promise<TransactionResponse>;
    buildTipTx(wallet: string, creatorWallet: string, amount: number, _postId?: string): Promise<TransactionResponse>;
    buildSubscribeTx(wallet: string, creatorWallet: string, amountPerMonth: number): Promise<TransactionResponse>;
    buildWithdrawTx(wallet: string, _amount: number): Promise<TransactionResponse>;
    submitTransaction(signedTx: string): Promise<string>;
    getBalance(wallet: string): Promise<number>;
};
//# sourceMappingURL=solana.service.d.ts.map