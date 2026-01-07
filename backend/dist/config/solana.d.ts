import { Connection, PublicKey } from '@solana/web3.js';
import { Program, Idl } from '@coral-xyz/anchor';
export declare const connection: Connection;
export declare const programIds: {
    social: PublicKey | null;
    payment: PublicKey | null;
    tokenGate: PublicKey | null;
};
export declare const programs: {
    social: Program<Idl> | null;
    payment: Program<Idl> | null;
    tokenGate: Program<Idl> | null;
};
export declare const pdaDerivation: {
    userProfile(authority: PublicKey): [PublicKey, number];
    post(creator: PublicKey, postIndex: bigint): [PublicKey, number];
    follow(follower: PublicKey, following: PublicKey): [PublicKey, number];
    like(post: PublicKey, user: PublicKey): [PublicKey, number];
    comment(post: PublicKey, commentIndex: bigint): [PublicKey, number];
    platformConfig(): [PublicKey, number];
    creatorVault(creator: PublicKey): [PublicKey, number];
    tipRecord(tipper: PublicKey, tipIndex: bigint): [PublicKey, number];
    subscription(subscriber: PublicKey, creator: PublicKey): [PublicKey, number];
    accessControl(post: PublicKey): [PublicKey, number];
    accessVerification(user: PublicKey, post: PublicKey): [PublicKey, number];
};
export declare function getRecentBlockhash(): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
}>;
export interface UserProfileData {
    authority: PublicKey;
    username: string;
    bio: string;
    profileImageUri: string;
    followerCount: bigint;
    followingCount: bigint;
    postCount: bigint;
    createdAt: bigint;
    isVerified: boolean;
    bump: number;
}
export interface PostData {
    creator: PublicKey;
    contentUri: string;
    contentType: {
        image: {};
    } | {
        video: {};
    } | {
        text: {};
    } | {
        multi: {};
    };
    caption: string;
    timestamp: bigint;
    likes: bigint;
    comments: bigint;
    tipsReceived: bigint;
    isTokenGated: boolean;
    requiredToken: PublicKey | null;
    postIndex: bigint;
    bump: number;
}
export interface CreatorVaultData {
    creator: PublicKey;
    totalEarned: bigint;
    withdrawn: bigint;
    subscribers: bigint;
    bump: number;
}
export interface PlatformConfigData {
    authority: PublicKey;
    feeBasisPoints: number;
    feeRecipient: PublicKey;
    bump: number;
}
export interface AccessControlData {
    post: PublicKey;
    creator: PublicKey;
    requiredToken: PublicKey | null;
    minimumBalance: bigint;
    requiredNftCollection: PublicKey | null;
    gateType: {
        token: {};
    } | {
        nft: {};
    } | {
        both: {};
    };
    createdAt: bigint;
    bump: number;
}
export interface AccessVerificationData {
    user: PublicKey;
    post: PublicKey;
    verified: boolean;
    verifiedAt: bigint;
    expiresAt: bigint | null;
    bump: number;
}
export declare function fetchUserProfile(wallet: PublicKey): Promise<UserProfileData | null>;
export declare function fetchPost(postPda: PublicKey): Promise<PostData | null>;
export declare function fetchCreatorVault(creator: PublicKey): Promise<CreatorVaultData | null>;
export declare function fetchPlatformConfig(): Promise<PlatformConfigData | null>;
export declare function fetchAccessControl(postPda: PublicKey): Promise<AccessControlData | null>;
export declare function fetchAccessVerification(user: PublicKey, post: PublicKey): Promise<AccessVerificationData | null>;
//# sourceMappingURL=solana.d.ts.map