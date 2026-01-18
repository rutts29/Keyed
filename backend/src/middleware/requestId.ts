import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID Middleware
 * 
 * Adds a unique request ID to each incoming request for distributed tracing.
 * The ID is:
 * - Generated if not provided in X-Request-ID header
 * - Attached to the request object for logging
 * - Returned in the response X-Request-ID header
 * 
 * This enables tracing requests across services and correlating logs.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from upstream service or generate new one
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Attach to request for logging
  (req as Request & { id: string }).id = requestId;
  
  // Include in response header for client correlation
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
