"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queues = void 0;
exports.addJob = addJob;
exports.closeQueues = closeQueues;
const bullmq_1 = require("bullmq");
const env_js_1 = require("../config/env.js");
const logger_js_1 = require("../utils/logger.js");
const connection = { url: env_js_1.env.UPSTASH_REDIS_URL };
exports.queues = {
    'ai-analysis': new bullmq_1.Queue('ai-analysis', { connection }),
    embedding: new bullmq_1.Queue('embedding', { connection }),
    notification: new bullmq_1.Queue('notification', { connection }),
    'feed-refresh': new bullmq_1.Queue('feed-refresh', { connection }),
    'sync-chain': new bullmq_1.Queue('sync-chain', { connection }),
};
const queueEvents = {};
Object.entries(exports.queues).forEach(([name, queue]) => {
    queueEvents[name] = new bullmq_1.QueueEvents(queue.name, { connection });
    queueEvents[name].on('completed', ({ jobId }) => {
        logger_js_1.logger.debug({ jobId, queue: name }, 'Job completed');
    });
    queueEvents[name].on('failed', ({ jobId, failedReason }) => {
        logger_js_1.logger.error({ jobId, queue: name, failedReason }, 'Job failed');
    });
});
async function addJob(queueName, data, opts) {
    const queue = exports.queues[queueName];
    const job = await queue.add(queueName, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 1000,
        ...opts,
    });
    logger_js_1.logger.debug({ jobId: job.id, queue: queueName }, 'Job added');
    return job;
}
async function closeQueues() {
    await Promise.all([
        ...Object.values(exports.queues).map(q => q.close()),
        ...Object.values(queueEvents).map(e => e.close()),
    ]);
}
//# sourceMappingURL=queues.js.map