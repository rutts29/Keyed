import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
export declare const searchController: {
    /**
     * AI-powered semantic search
     * Expands query and searches by meaning, not just keywords
     */
    semanticSearch(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Search autocomplete suggestions based on existing tags
     */
    suggest(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Search users by username
     */
    searchUsers(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Search posts by tags
     */
    searchByTag(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=search.controller.d.ts.map