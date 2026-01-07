import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { ModerationResult, AIAnalysis } from '../types/index.js';

export const aiService = {
  async moderateContent(imageBase64: string, caption?: string): Promise<ModerationResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/moderate/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64, caption }),
      });
      
      if (!response.ok) {
        logger.warn('AI moderation service unavailable, defaulting to allow');
        return createStubModerationResult(startTime);
      }
      
      return await response.json() as ModerationResult;
    } catch (error) {
      logger.warn({ error }, 'AI moderation failed, defaulting to allow (stub)');
      return createStubModerationResult(startTime);
    }
  },

  async analyzeContent(contentUri: string, caption?: string, postId?: string): Promise<AIAnalysis> {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/analyze/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_uri: contentUri, caption, post_id: postId }),
      });
      
      if (!response.ok) {
        logger.warn('AI analysis service unavailable, returning stub');
        return createStubAnalysis(caption);
      }
      
      return await response.json() as AIAnalysis;
    } catch (error) {
      logger.warn({ error }, 'AI analysis failed, returning stub');
      return createStubAnalysis(caption);
    }
  },

  async semanticSearch(query: string, limit = 20, rerank = true) {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/search/semantic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit, rerank }),
      });
      
      if (!response.ok) {
        logger.warn('AI search service unavailable');
        return { results: [], expandedQuery: query };
      }
      
      return await response.json();
    } catch (error) {
      logger.warn({ error }, 'AI search failed');
      return { results: [], expandedQuery: query };
    }
  },

  async checkHash(imageHash: string): Promise<{ knownBad: boolean; reason?: string }> {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/moderate/check-hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_hash: imageHash }),
      });
      
      if (!response.ok) {
        return { knownBad: false };
      }
      
      return await response.json() as { knownBad: boolean; reason?: string };
    } catch {
      return { knownBad: false };
    }
  },
};

function createStubModerationResult(startTime: number): ModerationResult {
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

function createStubAnalysis(caption?: string): AIAnalysis {
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
