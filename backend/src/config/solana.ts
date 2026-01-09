import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import anchor from '@coral-xyz/anchor';
const { AnchorProvider, Program } = anchor;
type Idl = anchor.Idl;
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { env } from './env.js';

export const connection = new Connection(
  env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
  'confirmed'
);

// Read-only provider for building unsigned transactions
const readOnlyProvider = new AnchorProvider(
  connection,
  {
    publicKey: PublicKey.default,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  },
  { commitment: 'confirmed' }
);

// Load IDL files
function loadIdl(filename: string): Idl | null {
  const paths = [
    join(process.cwd(), 'idl', filename),
    join(process.cwd(), 'dist', 'idl', filename),
    join(process.cwd(), '..', 'idl', filename),
  ];
  
  for (const path of paths) {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      return JSON.parse(content) as Idl;
    }
  }
  
  console.warn(`IDL file not found: ${filename}`);
  return null;
}

// Program IDs from environment or IDL files
export const programIds = {
  social: env.SOCIAL_PROGRAM_ID ? new PublicKey(env.SOCIAL_PROGRAM_ID) : null,
  payment: env.PAYMENT_PROGRAM_ID ? new PublicKey(env.PAYMENT_PROGRAM_ID) : null,
  tokenGate: env.TOKEN_GATE_PROGRAM_ID ? new PublicKey(env.TOKEN_GATE_PROGRAM_ID) : null,
};

// Load IDLs
const socialIdl = loadIdl('solshare_social.json');
const paymentIdl = loadIdl('solshare_payment.json');
const tokenGateIdl = loadIdl('solshare_token_gate.json');

// Initialize program IDs from IDLs if not set in env
if (!programIds.social && socialIdl?.address) {
  programIds.social = new PublicKey(socialIdl.address);
}
if (!programIds.payment && paymentIdl?.address) {
  programIds.payment = new PublicKey(paymentIdl.address);
}
if (!programIds.tokenGate && tokenGateIdl?.address) {
  programIds.tokenGate = new PublicKey(tokenGateIdl.address);
}

// Create program instances (generic Program type)
export const programs = {
  social: programIds.social && socialIdl 
    ? new Program(socialIdl, readOnlyProvider)
    : null,
  payment: programIds.payment && paymentIdl
    ? new Program(paymentIdl, readOnlyProvider)
    : null,
  tokenGate: programIds.tokenGate && tokenGateIdl
    ? new Program(tokenGateIdl, readOnlyProvider)
    : null,
};

// PDA derivation utilities
export const pdaDerivation = {
  // Social program PDAs
  userProfile(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('profile'), authority.toBuffer()],
      programIds.social!
    );
  },

  post(creator: PublicKey, postIndex: bigint): [PublicKey, number] {
    const indexBuffer = Buffer.alloc(8);
    indexBuffer.writeBigUInt64LE(postIndex);
    return PublicKey.findProgramAddressSync(
      [Buffer.from('post'), creator.toBuffer(), indexBuffer],
      programIds.social!
    );
  },

  follow(follower: PublicKey, following: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('follow'), follower.toBuffer(), following.toBuffer()],
      programIds.social!
    );
  },

  like(post: PublicKey, user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('like'), post.toBuffer(), user.toBuffer()],
      programIds.social!
    );
  },

  comment(post: PublicKey, commentIndex: bigint): [PublicKey, number] {
    const indexBuffer = Buffer.alloc(8);
    indexBuffer.writeBigUInt64LE(commentIndex);
    return PublicKey.findProgramAddressSync(
      [Buffer.from('comment'), post.toBuffer(), indexBuffer],
      programIds.social!
    );
  },

  // Payment program PDAs
  platformConfig(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('platform_config')],
      programIds.payment!
    );
  },

  creatorVault(creator: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), creator.toBuffer()],
      programIds.payment!
    );
  },

  tipRecord(tipper: PublicKey, tipIndex: bigint): [PublicKey, number] {
    const indexBuffer = Buffer.alloc(8);
    indexBuffer.writeBigUInt64LE(tipIndex);
    return PublicKey.findProgramAddressSync(
      [Buffer.from('tip'), tipper.toBuffer(), indexBuffer],
      programIds.payment!
    );
  },

  subscription(subscriber: PublicKey, creator: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('subscription'), subscriber.toBuffer(), creator.toBuffer()],
      programIds.payment!
    );
  },

  // Token gate program PDAs
  accessControl(post: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('access'), post.toBuffer()],
      programIds.tokenGate!
    );
  },

  accessVerification(user: PublicKey, post: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('verification'), user.toBuffer(), post.toBuffer()],
      programIds.tokenGate!
    );
  },
};

export async function getRecentBlockhash() {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  return { blockhash, lastValidBlockHeight };
}

// Type definitions for on-chain account data
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
  contentType: { image: {} } | { video: {} } | { text: {} } | { multi: {} };
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
  gateType: { token: {} } | { nft: {} } | { both: {} };
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

// Fetch on-chain account data with proper typing
export async function fetchUserProfile(wallet: PublicKey): Promise<UserProfileData | null> {
  if (!programs.social) return null;
  try {
    const [profilePda] = pdaDerivation.userProfile(wallet);
    // Use type assertion for the dynamic account fetch
    const account = await (programs.social.account as Record<string, { fetch: (key: PublicKey) => Promise<unknown> }>)
      .userProfile.fetch(profilePda);
    return account as UserProfileData;
  } catch {
    return null;
  }
}

export async function fetchPost(postPda: PublicKey): Promise<PostData | null> {
  if (!programs.social) return null;
  try {
    const account = await (programs.social.account as Record<string, { fetch: (key: PublicKey) => Promise<unknown> }>)
      .post.fetch(postPda);
    return account as PostData;
  } catch {
    return null;
  }
}

export async function fetchCreatorVault(creator: PublicKey): Promise<CreatorVaultData | null> {
  if (!programs.payment) return null;
  try {
    const [vaultPda] = pdaDerivation.creatorVault(creator);
    const account = await (programs.payment.account as Record<string, { fetch: (key: PublicKey) => Promise<unknown> }>)
      .creatorVault.fetch(vaultPda);
    return account as CreatorVaultData;
  } catch {
    return null;
  }
}

export async function fetchPlatformConfig(): Promise<PlatformConfigData | null> {
  if (!programs.payment) return null;
  try {
    const [configPda] = pdaDerivation.platformConfig();
    const account = await (programs.payment.account as Record<string, { fetch: (key: PublicKey) => Promise<unknown> }>)
      .platformConfig.fetch(configPda);
    return account as PlatformConfigData;
  } catch {
    return null;
  }
}

export async function fetchAccessControl(postPda: PublicKey): Promise<AccessControlData | null> {
  if (!programs.tokenGate) return null;
  try {
    const [accessControlPda] = pdaDerivation.accessControl(postPda);
    const account = await (programs.tokenGate.account as Record<string, { fetch: (key: PublicKey) => Promise<unknown> }>)
      .accessControl.fetch(accessControlPda);
    return account as AccessControlData;
  } catch {
    return null;
  }
}

export async function fetchAccessVerification(user: PublicKey, post: PublicKey): Promise<AccessVerificationData | null> {
  if (!programs.tokenGate) return null;
  try {
    const [verificationPda] = pdaDerivation.accessVerification(user, post);
    const account = await (programs.tokenGate.account as Record<string, { fetch: (key: PublicKey) => Promise<unknown> }>)
      .accessVerification.fetch(verificationPda);
    return account as AccessVerificationData;
  } catch {
    return null;
  }
}
