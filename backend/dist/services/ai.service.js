"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = void 0;
const env_js_1 = require("../config/env.js");
const logger_js_1 = require("../utils/logger.js");
exports.aiService = {
    async moderateContent(imageBase64, caption) {
        const startTime = Date.now();
        try {
            const response = await fetch(`${env_js_1.env.AI_SERVICE_URL}/api/moderate/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_base64: imageBase64, caption }),
            });
            if (!response.ok) {
                logger_js_1.logger.warn('AI moderation service unavailable, defaulting to allow');
                return createStubModerationResult(startTime);
            }
            return await response.json();
        }
        catch (error) {
            logger_js_1.logger.warn({ error }, 'AI moderation failed, defaulting to allow (stub)');
            return createStubModerationResult(startTime);
        }
    },
    async analyzeContent(contentUri, caption, postId) {
        try {
            const response = await fetch(`${env_js_1.env.AI_SERVICE_URL}/api/analyze/content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content_uri: contentUri, caption, post_id: postId }),
            });
            if (!response.ok) {
                logger_js_1.logger.warn('AI analysis service unavailable, returning stub');
                return createStubAnalysis(caption);
            }
            return await response.json();
        }
        catch (error) {
            logger_js_1.logger.warn({ error }, 'AI analysis failed, returning stub');
            return createStubAnalysis(caption);
        }
    },
    async semanticSearch(query, limit = 20, rerank = true) {
        try {
            const response = await fetch(`${env_js_1.env.AI_SERVICE_URL}/api/search/semantic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit, rerank }),
            });
            if (!response.ok) {
                logger_js_1.logger.warn('AI search service unavailable');
                return { results: [], expandedQuery: query };
            }
            return await response.json();
        }
        catch (error) {
            logger_js_1.logger.warn({ error }, 'AI search failed');
            return { results: [], expandedQuery: query };
        }
    },
    async checkHash(imageHash) {
        try {
            const response = await fetch(`${env_js_1.env.AI_SERVICE_URL}/api/moderate/check-hash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_hash: imageHash }),
            });
            if (!response.ok) {
                return { knownBad: false };
            }
            return await response.json();
        }
        catch {
            return { knownBad: false };
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