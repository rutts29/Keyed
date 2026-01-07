import { Job } from 'bullmq';
interface AIAnalysisData {
    postId: string;
    contentUri: string;
    caption?: string;
}
export declare function processAIAnalysis(job: Job<AIAnalysisData>): Promise<{
    success: boolean;
    postId: string;
}>;
export {};
//# sourceMappingURL=ai-analysis.job.d.ts.map