import { Job } from 'bullmq';
interface NotificationData {
    type: 'new_post' | 'like' | 'comment' | 'follow' | 'tip';
    postId?: string;
    creatorWallet?: string;
    targetWallet?: string;
    fromWallet?: string;
    amount?: number;
}
export declare function processNotification(job: Job<NotificationData>): Promise<{
    success: boolean;
    type: "tip" | "follow" | "like" | "new_post" | "comment";
}>;
export {};
//# sourceMappingURL=notification.job.d.ts.map