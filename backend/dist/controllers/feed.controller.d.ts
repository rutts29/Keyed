import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
export declare const feedController: {
    getPersonalizedFeed(req: AuthenticatedRequest, res: Response): Promise<void>;
    getExploreFeed(req: AuthenticatedRequest, res: Response): Promise<void>;
    getFollowingFeed(req: AuthenticatedRequest, res: Response): Promise<void>;
    getTrending(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=feed.controller.d.ts.map