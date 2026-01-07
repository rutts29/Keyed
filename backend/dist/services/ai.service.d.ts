import type { ModerationResult, AIAnalysis } from '../types/index.js';
export declare const aiService: {
    moderateContent(imageBase64: string, caption?: string): Promise<ModerationResult>;
    analyzeContent(contentUri: string, caption?: string, postId?: string): Promise<AIAnalysis>;
    semanticSearch(query: string, limit?: number, rerank?: boolean): Promise<unknown>;
    checkHash(imageHash: string): Promise<{
        knownBad: boolean;
        reason?: string;
    }>;
};
//# sourceMappingURL=ai.service.d.ts.map