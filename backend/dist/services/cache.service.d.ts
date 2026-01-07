export declare const cacheService: {
    getUser(wallet: string): Promise<any>;
    setUser(wallet: string, user: unknown): Promise<void>;
    invalidateUser(wallet: string): Promise<void>;
    getPost(postId: string): Promise<any>;
    setPost(postId: string, post: unknown): Promise<void>;
    invalidatePost(postId: string): Promise<void>;
    getFeed(wallet: string): Promise<any>;
    setFeed(wallet: string, feed: unknown): Promise<void>;
    invalidateFeed(wallet: string): Promise<void>;
    getFollowing(wallet: string): Promise<string[] | null>;
    setFollowing(wallet: string, following: string[]): Promise<void>;
    invalidateFollowing(wallet: string): Promise<void>;
    invalidateAll(wallet: string): Promise<void>;
};
//# sourceMappingURL=cache.service.d.ts.map