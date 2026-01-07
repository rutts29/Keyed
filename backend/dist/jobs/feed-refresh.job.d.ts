import { Job } from 'bullmq';
interface FeedRefreshData {
    wallet: string;
    reason: 'new_follow' | 'new_post' | 'scheduled';
}
export declare function processFeedRefresh(job: Job<FeedRefreshData>): Promise<{
    success: boolean;
    wallet: string;
}>;
export {};
//# sourceMappingURL=feed-refresh.job.d.ts.map