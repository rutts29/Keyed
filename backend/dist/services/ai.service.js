import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
const AI_SERVICE_TIMEOUT = 30000; // 30 seconds
async function fetchWithTimeout(url, options, timeout = AI_SERVICE_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
export const aiService = {
    /**
     * Pre-upload content moderation check
     * Calls AI service synchronously before content is stored
     */
    async moderateContent(imageBase64, caption, wallet) {
        const startTime = Date.now();
        try {
            const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/moderate/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: imageBase64,
                    caption: caption || null,
                    wallet: wallet || null,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.warn({ status: response.status, error: errorText }, 'AI moderation service error');
                return createStubModerationResult(startTime);
            }
            const data = await response.json();
            return {
                verdict: data.verdict,
                scores: {
                    nsfw: data.scores.nsfw,
                    violence: data.scores.violence,
                    hate: data.scores.hate,
                    childSafety: data.scores.childSafety,
                    spam: data.scores.spam,
                    drugsWeapons: data.scores.drugsWeapons,
                },
                maxScore: data.maxScore,
                blockedCategory: data.blockedCategory,
                explanation: data.explanation,
                processingTimeMs: data.processingTimeMs,
                violationId: data.violationId,
            };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.warn('AI moderation request timed out');
            }
            else {
                logger.warn({ error }, 'AI moderation failed, defaulting to allow (stub)');
            }
            return createStubModerationResult(startTime);
        }
    },
    /**
     * Full content analysis - called asynchronously after post creation
     * Generates description, tags, embedding, etc.
     */
    async analyzeContent(contentUri, caption, postId, creatorWallet) {
        try {
            const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/analyze/content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content_uri: contentUri,
                    caption: caption || null,
                    post_id: postId || null,
                    creator_wallet: creatorWallet || null,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.warn({ status: response.status, error: errorText }, 'AI analysis service error');
                return createStubAnalysis(caption);
            }
            const data = await response.json();
            return {
                description: data.description,
                tags: data.tags,
                sceneType: data.sceneType,
                objects: data.objects,
                mood: data.mood,
                colors: data.colors,
                safetyScore: data.safetyScore,
                altText: data.altText,
                embedding: data.embedding,
            };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.warn('AI analysis request timed out');
            }
            else {
                logger.warn({ error }, 'AI analysis failed, returning stub');
            }
            return createStubAnalysis(caption);
        }
    },
    /**
     * Semantic search with query expansion and optional re-ranking
     */
    async semanticSearch(query, limit = 50, rerank = true) {
        try {
            const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/search/semantic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit, rerank }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.warn({ status: response.status, error: errorText }, 'AI search service error');
                return { results: [], expandedQuery: query };
            }
            const data = await response.json();
            return {
                results: data.results.map(r => ({
                    postId: r.postId,
                    score: r.score,
                    description: r.description,
                    creatorWallet: r.creatorWallet,
                })),
                expandedQuery: data.expandedQuery,
            };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.warn('AI search request timed out');
            }
            else {
                logger.warn({ error }, 'AI search failed');
            }
            return { results: [], expandedQuery: query };
        }
    },
    /**
     * Personalized feed recommendations based on user's liked content
     */
    async getRecommendations(userWallet, likedPostIds = [], limit = 50, excludeSeen = []) {
        try {
            const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/recommend/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_wallet: userWallet,
                    liked_post_ids: likedPostIds,
                    limit,
                    exclude_seen: excludeSeen,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.warn({ status: response.status, error: errorText }, 'AI recommendation service error');
                return { recommendations: [], tasteProfile: null };
            }
            const data = await response.json();
            return {
                recommendations: data.recommendations.map(r => ({
                    postId: r.postId,
                    score: r.score,
                    reason: r.reason,
                })),
                tasteProfile: data.tasteProfile || null,
            };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.warn('AI recommendation request timed out');
            }
            else {
                logger.warn({ error }, 'AI recommendations failed');
            }
            return { recommendations: [], tasteProfile: null };
        }
    },
    /**
     * Check perceptual hash against blocked content database
     */
    async checkHash(imageHash) {
        try {
            const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/moderate/check-hash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_hash: imageHash }),
            }, 5000); // Shorter timeout for hash check
            if (!response.ok) {
                return { knownBad: false };
            }
            const data = await response.json();
            return {
                knownBad: data.knownBad,
                reason: data.reason,
                blockedAt: data.blockedAt,
            };
        }
        catch {
            return { knownBad: false };
        }
    },
    /**
     * Health check for AI service
     */
    async healthCheck() {
        try {
            const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/health`, {
                method: 'GET',
            }, 5000);
            return response.ok;
        }
        catch {
            return false;
        }
    },
};
function createStubModerationResult(startTime) {
    return {
        verdict: 'allow',
        scores: {
            nsfw: 0,
            violence: 0,
            hate: 0,
            childSafety: 0,
            spam: 0,
            drugsWeapons: 0,
        },
        maxScore: 0,
        explanation: 'AI service unavailable - content allowed by default (stub)',
        processingTimeMs: Date.now() - startTime,
    };
}
function createStubAnalysis(caption) {
    return {
        description: caption || 'Content pending AI analysis',
        tags: [],
        sceneType: 'unknown',
        objects: [],
        mood: 'neutral',
        colors: [],
        safetyScore: 10,
        altText: caption || 'Image content',
    };
}
//# sourceMappingURL=ai.service.js.map