import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
interface RateLimitConfig {
    windowMs: number;
    max: number;
}
declare const RATE_LIMITS: Record<string, {
    auth: RateLimitConfig;
    unauth: RateLimitConfig;
}>;
export declare function createRateLimiter(category: keyof typeof RATE_LIMITS): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitGet: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitPost: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitUpload: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitSearch: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map