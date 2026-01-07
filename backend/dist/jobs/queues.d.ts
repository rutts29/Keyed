import { Queue } from 'bullmq';
export declare const queues: {
    'ai-analysis': Queue<any, any, string, any, any, string>;
    embedding: Queue<any, any, string, any, any, string>;
    notification: Queue<any, any, string, any, any, string>;
    'feed-refresh': Queue<any, any, string, any, any, string>;
    'sync-chain': Queue<any, any, string, any, any, string>;
};
interface JobData {
    [key: string]: unknown;
}
type QueueName = 'ai-analysis' | 'embedding' | 'notification' | 'feed-refresh' | 'sync-chain';
export declare function addJob(queueName: QueueName, data: JobData, opts?: {
    delay?: number;
    priority?: number;
}): Promise<import("bullmq").Job<any, any, string>>;
export declare function closeQueues(): Promise<void>;
export {};
//# sourceMappingURL=queues.d.ts.map