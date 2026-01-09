import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import anchor from '@coral-xyz/anchor';
const { AnchorProvider, Program } = anchor;
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { env } from './env.js';
export const connection = new Connection(env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');
// Read-only provider for building unsigned transactions
const readOnlyProvider = new AnchorProvider(connection, {
    publicKey: PublicKey.default,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
}, { commitment: 'confirmed' });
// Load IDL files
function loadIdl(filename) {
    const paths = [
        join(process.cwd(), 'idl', filename),
        join(process.cwd(), 'dist', 'idl', filename),
        join(process.cwd(), '..', 'idl', filename),
    ];
    for (const path of paths) {
        if (existsSync(path)) {
            const content = readFileSync(path, 'utf-8');
            return JSON.parse(content);
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
    userProfile(authority) {
        return PublicKey.findProgramAddressSync([Buffer.from('profile'), authority.toBuffer()], programIds.social);
    },
    post(creator, postIndex) {
        const indexBuffer = Buffer.alloc(8);
        indexBuffer.writeBigUInt64LE(postIndex);
        return PublicKey.findProgramAddressSync([Buffer.from('post'), creator.toBuffer(), indexBuffer], programIds.social);
    },
    follow(follower, following) {
        return PublicKey.findProgramAddressSync([Buffer.from('follow'), follower.toBuffer(), following.toBuffer()], programIds.social);
    },
    like(post, user) {
        return PublicKey.findProgramAddressSync([Buffer.from('like'), post.toBuffer(), user.toBuffer()], programIds.social);
    },
    comment(post, commentIndex) {
        const indexBuffer = Buffer.alloc(8);
        indexBuffer.writeBigUInt64LE(commentIndex);
        return PublicKey.findProgramAddressSync([Buffer.from('comment'), post.toBuffer(), indexBuffer], programIds.social);
    },
    // Payment program PDAs
    platformConfig() {
        return PublicKey.findProgramAddressSync([Buffer.from('platform_config')], programIds.payment);
    },
    creatorVault(creator) {
        return PublicKey.findProgramAddressSync([Buffer.from('vault'), creator.toBuffer()], programIds.payment);
    },
    tipRecord(tipper, tipIndex) {
        const indexBuffer = Buffer.alloc(8);
        indexBuffer.writeBigUInt64LE(tipIndex);
        return PublicKey.findProgramAddressSync([Buffer.from('tip'), tipper.toBuffer(), indexBuffer], programIds.payment);
    },
    subscription(subscriber, creator) {
        return PublicKey.findProgramAddressSync([Buffer.from('subscription'), subscriber.toBuffer(), creator.toBuffer()], programIds.payment);
    },
    // Token gate program PDAs
    accessControl(post) {
        return PublicKey.findProgramAddressSync([Buffer.from('access'), post.toBuffer()], programIds.tokenGate);
    },
    accessVerification(user, post) {
        return PublicKey.findProgramAddressSync([Buffer.from('verification'), user.toBuffer(), post.toBuffer()], programIds.tokenGate);
    },
};
export async function getRecentBlockhash() {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    return { blockhash, lastValidBlockHeight };
}
// Fetch on-chain account data with proper typing
export async function fetchUserProfile(wallet) {
    if (!programs.social)
        return null;
    try {
        const [profilePda] = pdaDerivation.userProfile(wallet);
        // Use type assertion for the dynamic account fetch
        const account = await programs.social.account
            .userProfile.fetch(profilePda);
        return account;
    }
    catch {
        return null;
    }
}
export async function fetchPost(postPda) {
    if (!programs.social)
        return null;
    try {
        const account = await programs.social.account
            .post.fetch(postPda);
        return account;
    }
    catch {
        return null;
    }
}
export async function fetchCreatorVault(creator) {
    if (!programs.payment)
        return null;
    try {
        const [vaultPda] = pdaDerivation.creatorVault(creator);
        const account = await programs.payment.account
            .creatorVault.fetch(vaultPda);
        return account;
    }
    catch {
        return null;
    }
}
export async function fetchPlatformConfig() {
    if (!programs.payment)
        return null;
    try {
        const [configPda] = pdaDerivation.platformConfig();
        const account = await programs.payment.account
            .platformConfig.fetch(configPda);
        return account;
    }
    catch {
        return null;
    }
}
export async function fetchAccessControl(postPda) {
    if (!programs.tokenGate)
        return null;
    try {
        const [accessControlPda] = pdaDerivation.accessControl(postPda);
        const account = await programs.tokenGate.account
            .accessControl.fetch(accessControlPda);
        return account;
    }
    catch {
        return null;
    }
}
export async function fetchAccessVerification(user, post) {
    if (!programs.tokenGate)
        return null;
    try {
        const [verificationPda] = pdaDerivation.accessVerification(user, post);
        const account = await programs.tokenGate.account
            .accessVerification.fetch(verificationPda);
        return account;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=solana.js.map