"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEmbedding = processEmbedding;
const logger_js_1 = require("../utils/logger.js");
async function processEmbedding(job) {
    const { postId, embedding, metadata } = job.data;
    logger_js_1.logger.info({ postId }, 'Processing embedding indexing');
    // TODO: Index in Qdrant when AI service is ready
    // For now, just log that we would index
    logger_js_1.logger.info({
        postId,
        embeddingDim: embedding.length,
        tags: metadata.tags,
    }, 'Would index embedding in Qdrant');
    return { success: true, postId };
}
//# sourceMappingURL=embedding.job.js.map