import { Connection, PublicKey } from '@solana/web3.js';
export declare const connection: Connection;
export declare const programIds: {
    social: PublicKey | null;
    payment: PublicKey | null;
    tokenGate: PublicKey | null;
};
export declare function getRecentBlockhash(): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
}>;
//# sourceMappingURL=solana.d.ts.map