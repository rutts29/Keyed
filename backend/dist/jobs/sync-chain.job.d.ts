import { Job } from 'bullmq';
interface SyncChainData {
    type: 'transaction' | 'profile' | 'post';
    signature?: string;
    wallet?: string;
    postId?: string;
}
export declare function processSyncChain(job: Job<SyncChainData>): Promise<{
    success: boolean;
    type: "post" | "profile" | "transaction";
}>;
export {};
//# sourceMappingURL=sync-chain.job.d.ts.map