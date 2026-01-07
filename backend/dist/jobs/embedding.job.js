import { logger } from '../utils/logger.js';
export async function processEmbedding(job) {
    const { postId, embedding, metadata } = job.data;
    logger.info({ postId }, 'Processing embedding indexing');
    // TODO: Index in Qdrant when AI service is ready
    // For now, just log that we would index
    logger.info({
        postId,
        embeddingDim: embedding.length,
        tags: metadata.tags,
    }, 'Would index embedding in Qdrant');
    return { success: true, postId };
}
//# sourceMappingURL=embedding.job.js.map