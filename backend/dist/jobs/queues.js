import { Queue, QueueEvents } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
const connection = { url: env.UPSTASH_REDIS_URL };
export const queues = {
    'ai-analysis': new Queue('ai-analysis', { connection }),
    embedding: new Queue('embedding', { connection }),
    notification: new Queue('notification', { connection }),
    'feed-refresh': new Queue('feed-refresh', { connection }),
    'sync-chain': new Queue('sync-chain', { connection }),
};
const queueEvents = {};
Object.entries(queues).forEach(([name, queue]) => {
    queueEvents[name] = new QueueEvents(queue.name, { connection });
    queueEvents[name].on('completed', ({ jobId }) => {
        logger.debug({ jobId, queue: name }, 'Job completed');
    });
    queueEvents[name].on('failed', ({ jobId, failedReason }) => {
        logger.error({ jobId, queue: name, failedReason }, 'Job failed');
    });
});
export async function addJob(queueName, data, opts) {
    const queue = queues[queueName];
    const job = await queue.add(queueName, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 1000,
        ...opts,
    });
    logger.debug({ jobId: job.id, queue: queueName }, 'Job added');
    return job;
}
export async function closeQueues() {
    await Promise.all([
        ...Object.values(queues).map(q => q.close()),
        ...Object.values(queueEvents).map(e => e.close()),
    ]);
}
//# sourceMappingURL=queues.js.map