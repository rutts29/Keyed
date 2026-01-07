"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const env_js_1 = require("./config/env.js");
const logger_js_1 = require("./utils/logger.js");
const ai_analysis_job_js_1 = require("./jobs/ai-analysis.job.js");
const embedding_job_js_1 = require("./jobs/embedding.job.js");
const notification_job_js_1 = require("./jobs/notification.job.js");
const feed_refresh_job_js_1 = require("./jobs/feed-refresh.job.js");
const sync_chain_job_js_1 = require("./jobs/sync-chain.job.js");
const connection = { url: env_js_1.env.UPSTASH_REDIS_URL };
const workers = [];
function createWorker(name, processor) {
    const worker = new bullmq_1.Worker(name, processor, {
        connection,
        concurrency: 5,
        limiter: {
            max: 10,
            duration: 1000,
        },
    });
    worker.on('completed', (job) => {
        logger_js_1.logger.debug({ jobId: job.id, queue: name }, 'Job completed');
    });
    worker.on('failed', (job, err) => {
        logger_js_1.logger.error({ jobId: job?.id, queue: name, error: err.message }, 'Job failed');
    });
    worker.on('error', (err) => {
        logger_js_1.logger.error({ queue: name, error: err.message }, 'Worker error');
    });
    workers.push(worker);
    return worker;
}
createWorker('ai-analysis', ai_analysis_job_js_1.processAIAnalysis);
createWorker('embedding', embedding_job_js_1.processEmbedding);
createWorker('notification', notification_job_js_1.processNotification);
createWorker('feed-refresh', feed_refresh_job_js_1.processFeedRefresh);
createWorker('sync-chain', sync_chain_job_js_1.processSyncChain);
logger_js_1.logger.info({ workerCount: workers.length }, '🔧 SolShare workers started');
async function shutdown() {
    logger_js_1.logger.info('Shutting down workers...');
    await Promise.all(workers.map(w => w.close()));
    logger_js_1.logger.info('Workers closed');
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
    logger_js_1.logger.error({ reason }, 'Unhandled rejection in worker');
});
//# sourceMappingURL=worker.js.map