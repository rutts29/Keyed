import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
export declare const accessController: {
    verifyAccess(req: AuthenticatedRequest, res: Response): Promise<void>;
    setRequirements(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=access.controller.d.ts.map