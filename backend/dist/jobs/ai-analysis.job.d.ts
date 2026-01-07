import { Job } from 'bullmq';
interface AIAnalysisData {
    postId: string;
    contentUri: string;
    caption?: string;
    creatorWallet?: string;
}
export declare function processAIAnalysis(job: Job<AIAnalysisData>): Promise<{
    success: boolean;
    postId: string;
    analysis: import("../types/index.js").AIAnalysis;
}>;
export {};
//# sourceMappingURL=ai-analysis.job.d.ts.map