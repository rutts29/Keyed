import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../types/index.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();
  const requestId = req.id || 'unknown';

  logger.debug({
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.headers['x-forwarded-for'],
  }, 'Request started');

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    const wallet = (req as AuthenticatedRequest).wallet;

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
  });

  next();
}
