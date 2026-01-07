type EventType = 'post:new' | 'post:liked' | 'tip:received' | 'follow:new' | 'comment:new';
interface RealtimePayload {
    type: EventType;
    data: unknown;
    targetWallet?: string;
}
export declare const realtimeService: {
    broadcast(channel: string, payload: RealtimePayload): Promise<void>;
    notifyNewPost(post: unknown, creatorWallet: string): Promise<void>;
    notifyLike(postId: string, likerWallet: string, postCreatorWallet: string): Promise<void>;
    notifyTip(fromWallet: string, toWallet: string, amount: number, postId?: string): Promise<void>;
    notifyFollow(followerWallet: string, followedWallet: string): Promise<void>;
    notifyComment(postId: string, comment: unknown, postCreatorWallet: string): Promise<void>;
};
export {};
//# sourceMappingURL=realtime.service.d.ts.map