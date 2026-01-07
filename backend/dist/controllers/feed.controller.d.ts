import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
export declare const feedController: {
    /**
     * Personalized feed using AI recommendations
     * Falls back to following-based feed if AI service unavailable
     */
    getPersonalizedFeed(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Explore/trending feed - uses AI if available, falls back to likes-based sorting
     */
    getExploreFeed(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Following feed - chronological posts from followed users
     */
    getFollowingFeed(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Trending posts from the last 24 hours
     */
    getTrending(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=feed.controller.d.ts.map