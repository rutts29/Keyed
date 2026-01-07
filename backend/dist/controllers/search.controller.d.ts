import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
export declare const searchController: {
    semanticSearch(req: AuthenticatedRequest, res: Response): Promise<void>;
    suggest(req: AuthenticatedRequest, res: Response): Promise<void>;
    searchUsers(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=search.controller.d.ts.map