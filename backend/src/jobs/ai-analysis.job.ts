import { Job } from 'bullmq';
import { supabase } from '../config/supabase.js';
import { aiService } from '../services/ai.service.js';
import { logger } from '../utils/logger.js';
import { addJob } from './queues.js';

interface AIAnalysisData {
  postId: string;
  contentUri: string;
  caption?: string;
  creatorWallet?: string;
}

export async function processAIAnalysis(job: Job<AIAnalysisData>) {
  const { postId, contentUri, caption, creatorWallet } = job.data;
  
  logger.info({ postId, contentUri }, 'Processing AI analysis');
  
  // Get creator wallet if not provided
  let wallet = creatorWallet;
  if (!wallet) {
    const { data: post } = await supabase
      .from('posts')
      .select('creator_wallet')
      .eq('id', postId)
      .single();
    wallet = post?.creator_wallet;
  }
  
  try {
    const analysis = await aiService.analyzeContent(contentUri, caption, postId, wallet);
    
    // Update post with AI analysis results
    await supabase
      .from('posts')
      .update({
        llm_description: analysis.description,
        auto_tags: analysis.tags,
        scene_type: analysis.sceneType,
        mood: analysis.mood,
        safety_score: analysis.safetyScore,
        alt_text: analysis.altText,
      })
      .eq('id', postId);
    
    // Queue embedding job if we got an embedding
    if (analysis.embedding && analysis.embedding.length > 0) {
      await addJob('embedding', {
        postId,
        embedding: analysis.embedding,
        metadata: {
          description: analysis.description,
          caption,
          tags: analysis.tags,
          sceneType: analysis.sceneType,
          mood: analysis.mood,
          creatorWallet: wallet,
        },
      });
      logger.debug({ postId }, 'Queued embedding job');
    }
    
    logger.info({ postId, tagsCount: analysis.tags.length }, 'AI analysis complete');
    return { success: true, postId, analysis };
  } catch (error) {
    logger.error({ error, postId }, 'AI analysis failed');
    throw error;
  }
}
