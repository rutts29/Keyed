import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
export declare const paymentsController: {
    initializeVault(req: AuthenticatedRequest, res: Response): Promise<void>;
    tip(req: AuthenticatedRequest, res: Response): Promise<void>;
    subscribe(req: AuthenticatedRequest, res: Response): Promise<void>;
    cancelSubscription(req: AuthenticatedRequest, res: Response): Promise<void>;
    getEarnings(req: AuthenticatedRequest, res: Response): Promise<void>;
    withdraw(req: AuthenticatedRequest, res: Response): Promise<void>;
    getVaultInfo(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=payments.controller.d.ts.map