import { Job } from 'bullmq';
interface EmbeddingData {
    postId: string;
    embedding: number[];
    metadata: {
        description: string;
        caption?: string;
        tags: string[];
        sceneType: string;
    };
}
export declare function processEmbedding(job: Job<EmbeddingData>): Promise<{
    success: boolean;
    postId: string;
}>;
export {};
//# sourceMappingURL=embedding.job.d.ts.map