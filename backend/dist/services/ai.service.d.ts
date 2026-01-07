import type { ModerationResult, AIAnalysis, SemanticSearchResult, RecommendationResult } from '../types/index.js';
export declare const aiService: {
    /**
     * Pre-upload content moderation check
     * Calls AI service synchronously before content is stored
     */
    moderateContent(imageBase64: string, caption?: string, wallet?: string): Promise<ModerationResult>;
    /**
     * Full content analysis - called asynchronously after post creation
     * Generates description, tags, embedding, etc.
     */
    analyzeContent(contentUri: string, caption?: string, postId?: string, creatorWallet?: string): Promise<AIAnalysis>;
    /**
     * Semantic search with query expansion and optional re-ranking
     */
    semanticSearch(query: string, limit?: number, rerank?: boolean): Promise<SemanticSearchResult>;
    /**
     * Personalized feed recommendations based on user's liked content
     */
    getRecommendations(userWallet: string, likedPostIds?: string[], limit?: number, excludeSeen?: string[]): Promise<RecommendationResult>;
    /**
     * Check perceptual hash against blocked content database
     */
    checkHash(imageHash: string): Promise<{
        knownBad: boolean;
        reason?: string;
        blockedAt?: string;
    }>;
    /**
     * Health check for AI service
     */
    healthCheck(): Promise<boolean>;
};
//# sourceMappingURL=ai.service.d.ts.map