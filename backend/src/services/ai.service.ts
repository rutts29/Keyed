import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { 
  ModerationResult, 
  AIAnalysis, 
  SemanticSearchResult, 
  RecommendationResult 
} from '../types/index.js';

const AI_SERVICE_TIMEOUT = 30000; // 30 seconds

/**
 * Build headers for AI service requests.
 * Includes internal API key for service-to-service authentication if configured.
 */
function getAIServiceHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json' 
  };
  
  if (env.AI_SERVICE_API_KEY) {
    headers['X-Internal-API-Key'] = env.AI_SERVICE_API_KEY;
  }
  
  return headers;
}

// Response types from AI service (camelCase due to response_model_by_alias=True)
interface AIModerationResponse {
  verdict: 'allow' | 'warn' | 'block';
  scores: {
    nsfw: number;
    violence: number;
    hate: number;
    childSafety: number;
    spam: number;
    drugsWeapons: number;
  };
  maxScore: number;
  blockedCategory?: string;
  explanation: string;
  processingTimeMs: number;
  violationId?: string;
}

interface AIAnalysisResponse {
  description: string;
  tags: string[];
  sceneType: string;
  objects: string[];
  mood: string;
  colors: string[];
  safetyScore: number;
  altText: string;
  embedding?: number[];
}

interface AISearchResponse {
  results: Array<{
    postId: string;
    score: number;
    description?: string;
    creatorWallet?: string;
  }>;
  expandedQuery: string;
}

interface AIRecommendResponse {
  recommendations: Array<{
    postId: string;
    score: number;
    reason?: string;
  }>;
  tasteProfile?: string;
}

interface AIHashCheckResponse {
  knownBad: boolean;
  reason?: string;
  blockedAt?: string;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = AI_SERVICE_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const aiService = {
  /**
   * Pre-upload content moderation check
   * Calls AI service synchronously before content is stored
   * 
   * Includes retry logic for transient failures before failing closed.
   */
  async moderateContent(imageBase64: string, caption?: string, wallet?: string): Promise<ModerationResult> {
    const startTime = Date.now();
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/moderate/check`, {
          method: 'POST',
          headers: getAIServiceHeaders(),
          body: JSON.stringify({ 
            image_base64: imageBase64, 
            caption: caption || null,
            wallet: wallet || null,
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          
          // Retry on 5xx server errors, but not on 4xx client errors
          if (response.status >= 500 && attempt < maxRetries) {
            logger.warn({ status: response.status, attempt }, 'AI moderation service error, retrying...');
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            continue;
          }
          
          logger.error({ status: response.status, error: errorText }, 'AI moderation service error - blocking content');
          return createFailedModerationResult(startTime);
        }
        
        const data = await response.json() as AIModerationResponse;

        return data;
      } catch (error) {
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        
        // Retry on network errors and timeouts
        if (attempt < maxRetries) {
          logger.warn({ error, attempt, isTimeout }, 'AI moderation failed, retrying...');
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        
        if (isTimeout) {
          logger.error('AI moderation request timed out after retries - blocking content');
        } else {
          logger.error({ error }, 'AI moderation failed after retries - blocking content for safety');
        }
        return createFailedModerationResult(startTime);
      }
    }
    
    // This should never be reached, but TypeScript needs it
    return createFailedModerationResult(startTime);
  },

  /**
   * Full content analysis - called asynchronously after post creation
   * Generates description, tags, embedding, etc.
   */
  async analyzeContent(
    contentUri: string, 
    caption?: string, 
    postId?: string, 
    creatorWallet?: string
  ): Promise<AIAnalysis> {
    try {
      const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/analyze/content`, {
        method: 'POST',
        headers: getAIServiceHeaders(),
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
      
      const data = await response.json() as AIAnalysisResponse;

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('AI analysis request timed out');
      } else {
        logger.warn({ error }, 'AI analysis failed, returning stub');
      }
      return createStubAnalysis(caption);
    }
  },

  /**
   * Semantic search with query expansion and optional re-ranking
   */
  async semanticSearch(
    query: string, 
    limit = 50, 
    rerank = true
  ): Promise<SemanticSearchResult> {
    try {
      const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/search/semantic`, {
        method: 'POST',
        headers: getAIServiceHeaders(),
        body: JSON.stringify({ query, limit, rerank }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.warn({ status: response.status, error: errorText }, 'AI search service error');
        return { results: [], expandedQuery: query };
      }
      
      const data = await response.json() as AISearchResponse;

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('AI search request timed out');
      } else {
        logger.warn({ error }, 'AI search failed');
      }
      return { results: [], expandedQuery: query };
    }
  },

  /**
   * Personalized feed recommendations based on user's liked content
   */
  async getRecommendations(
    userWallet: string,
    likedPostIds: string[] = [],
    limit = 50,
    excludeSeen: string[] = []
  ): Promise<RecommendationResult> {
    try {
      const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/recommend/feed`, {
        method: 'POST',
        headers: getAIServiceHeaders(),
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
      
      const data = await response.json() as AIRecommendResponse;

      return {
        recommendations: data.recommendations,
        tasteProfile: data.tasteProfile || null,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('AI recommendation request timed out');
      } else {
        logger.warn({ error }, 'AI recommendations failed');
      }
      return { recommendations: [], tasteProfile: null };
    }
  },

  /**
   * Check perceptual hash against blocked content database
   */
  async checkHash(imageHash: string): Promise<{ knownBad: boolean; reason?: string; blockedAt?: string }> {
    try {
      const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/api/moderate/check-hash`, {
        method: 'POST',
        headers: getAIServiceHeaders(),
        body: JSON.stringify({ image_hash: imageHash }),
      }, 5000); // Shorter timeout for hash check
      
      if (!response.ok) {
        return { knownBad: false };
      }
      
      const data = await response.json() as AIHashCheckResponse;

      return data;
    } catch (error) {
      logger.warn({ error, imageHash: imageHash.substring(0, 8) }, 'Hash check failed');
      return { knownBad: false };
    }
  },

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`${env.AI_SERVICE_URL}/health`, {
        method: 'GET',
      }, 5000);
      return response.ok;
    } catch {
      return false;
    }
  },
};

/**
 * SECURITY: When AI moderation service is unavailable, we fail CLOSED (block content)
 * rather than fail OPEN (allow content). This prevents attackers from bypassing
 * moderation by DoS'ing the AI service or exploiting maintenance windows.
 */
function createFailedModerationResult(startTime: number): ModerationResult {
  return {
    verdict: 'block',
    scores: {
      nsfw: 0,
      violence: 0,
      hate: 0,
      childSafety: 0,
      spam: 0,
      drugsWeapons: 0,
    },
    maxScore: 0,
    blockedCategory: 'service_unavailable',
    explanation: 'Content moderation service temporarily unavailable. Please try again later.',
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
