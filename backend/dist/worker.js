import { Worker } from 'bullmq';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { processAIAnalysis } from './jobs/ai-analysis.job.js';
import { processEmbedding } from './jobs/embedding.job.js';
import { processNotification } from './jobs/notification.job.js';
import { processFeedRefresh } from './jobs/feed-refresh.job.js';
import { processSyncChain } from './jobs/sync-chain.job.js';
const connection = { url: env.UPSTASH_REDIS_URL };
const workers = [];
function createWorker(name, processor) {
    const worker = new Worker(name, processor, {
        connection,
        concurrency: 5,
        limiter: {
            max: 10,
            duration: 1000,
        },
    });
    worker.on('completed', (job) => {
        logger.debug({ jobId: job.id, queue: name }, 'Job completed');
    });
    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, queue: name, error: err.message }, 'Job failed');
    });
    worker.on('error', (err) => {
        logger.error({ queue: name, error: err.message }, 'Worker error');
    });
    workers.push(worker);
    return worker;
}
createWorker('ai-analysis', processAIAnalysis);
createWorker('embedding', processEmbedding);
createWorker('notification', processNotification);
createWorker('feed-refresh', processFeedRefresh);
createWorker('sync-chain', processSyncChain);
logger.info({ workerCount: workers.length }, '🔧 SolShare workers started');
async function shutdown() {
    logger.info('Shutting down workers...');
    await Promise.all(workers.map(w => w.close()));
    logger.info('Workers closed');
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection in worker');
});
//# sourceMappingURL=worker.js.map