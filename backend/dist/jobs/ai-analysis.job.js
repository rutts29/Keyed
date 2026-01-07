"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAIAnalysis = processAIAnalysis;
const supabase_js_1 = require("../config/supabase.js");
const ai_service_js_1 = require("../services/ai.service.js");
const logger_js_1 = require("../utils/logger.js");
const queues_js_1 = require("./queues.js");
async function processAIAnalysis(job) {
    const { postId, contentUri, caption } = job.data;
    logger_js_1.logger.info({ postId }, 'Processing AI analysis');
    const analysis = await ai_service_js_1.aiService.analyzeContent(contentUri, caption, postId);
    await supabase_js_1.supabase
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
        await (0, queues_js_1.addJob)('embedding', {
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
    logger_js_1.logger.info({ postId }, 'AI analysis complete');
    return { success: true, postId };
}
//# sourceMappingURL=ai-analysis.job.js.map