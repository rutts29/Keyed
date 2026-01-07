import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
export interface JWTPayload {
    wallet: string;
    iat: number;
    exp: number;
}
export declare function generateChallenge(wallet: string): Promise<{
    message: string;
    nonce: string;
}>;
export declare function verifySignature(wallet: string, signature: string, message: string): Promise<boolean>;
export declare function verifyChallenge(wallet: string, signature: string): Promise<{
    valid: boolean;
    token?: string;
}>;
export declare function verifyToken(token: string): JWTPayload | null;
export declare function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function optionalAuthMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map