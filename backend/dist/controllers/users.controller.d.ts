import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
export declare const usersController: {
    getProfile(req: AuthenticatedRequest, res: Response): Promise<void>;
    createOrUpdateProfile(req: AuthenticatedRequest, res: Response): Promise<void>;
    getUserPosts(req: AuthenticatedRequest, res: Response): Promise<void>;
    getFollowers(req: AuthenticatedRequest, res: Response): Promise<void>;
    getFollowing(req: AuthenticatedRequest, res: Response): Promise<void>;
    follow(req: AuthenticatedRequest, res: Response): Promise<void>;
    unfollow(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=users.controller.d.ts.map