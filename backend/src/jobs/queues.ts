import { Queue } from 'bullmq';
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

interface JobData {
  [key: string]: unknown;
}

type QueueName = 'ai-analysis' | 'embedding' | 'notification' | 'feed-refresh' | 'sync-chain';

export async function addJob(
  queueName: QueueName,
  data: JobData,
  opts?: { delay?: number; priority?: number }
) {
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
  await Promise.all(Object.values(queues).map(q => q.close()));
}
