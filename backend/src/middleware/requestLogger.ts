import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../types/index.js';

/**
 * Request Logger Middleware
 *
 * Logs incoming requests and their response times for observability.
 * Includes structured logging with:
 * - Request ID for distributed tracing
 * - HTTP method and path
 * - Response status code
 * - Response time in milliseconds
 * - User wallet (if authenticated)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();
  const requestId = req.id || 'unknown';

  // Log request start (debug level)
  logger.debug({
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.headers['x-forwarded-for'],
  }, 'Request started');

  // Override res.end to capture response details
  const originalEnd = res.end.bind(res);
  res.end = function (
    this: Response,
    chunk?: unknown,
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ): Response {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    const wallet = (req as AuthenticatedRequest).wallet;

    // Determine log level based on status code
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]({
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      wallet: wallet || undefined,
      contentLength: res.getHeader('content-length'),
    }, `${req.method} ${req.path} ${statusCode} ${Math.round(durationMs)}ms`);

    // Handle the different overload signatures of res.end
    if (typeof encoding === 'function') {
      return originalEnd(chunk, encoding);
    }
    if (encoding) {
      return originalEnd(chunk, encoding, callback);
    }
    return originalEnd(chunk, callback as (() => void) | undefined);
  } as typeof res.end;

  next();
}

/**
 * Skip logging for health checks and static assets
 */
export function shouldSkipLogging(req: Request): boolean {
  return req.path === '/health' || req.path.startsWith('/static/');
}
