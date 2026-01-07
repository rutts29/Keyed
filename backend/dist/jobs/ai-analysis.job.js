import { supabase } from '../config/supabase.js';
import { aiService } from '../services/ai.service.js';
import { logger } from '../utils/logger.js';
import { addJob } from './queues.js';
export async function processAIAnalysis(job) {
    const { postId, contentUri, caption } = job.data;
    logger.info({ postId }, 'Processing AI analysis');
    const analysis = await aiService.analyzeContent(contentUri, caption, postId);
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
    if (analysis.embedding) {
        await addJob('embedding', {
            postId,
            embedding: analysis.embedding,
            metadata: {
                description: analysis.description,
                caption,
                tags: analysis.tags,
                sceneType: analysis.sceneType,
            },
        });
    }
    logger.info({ postId }, 'AI analysis complete');
    return { success: true, postId };
}
//# sourceMappingURL=ai-analysis.job.js.map