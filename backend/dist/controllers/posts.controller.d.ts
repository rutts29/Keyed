import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
export declare const postsController: {
    upload(req: AuthenticatedRequest, res: Response): Promise<void>;
    create(req: AuthenticatedRequest, res: Response): Promise<void>;
    getPost(req: AuthenticatedRequest, res: Response): Promise<void>;
    like(req: AuthenticatedRequest, res: Response): Promise<void>;
    unlike(req: AuthenticatedRequest, res: Response): Promise<void>;
    getComments(req: AuthenticatedRequest, res: Response): Promise<void>;
    addComment(req: AuthenticatedRequest, res: Response): Promise<void>;
    report(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=posts.controller.d.ts.map