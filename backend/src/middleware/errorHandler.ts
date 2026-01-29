import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../types/index.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const wallet = (req as AuthenticatedRequest).wallet || 'anonymous';

  logger.error({
    err,
    requestId,
    path: req.path,
    method: req.method,
    wallet,
  }, 'Error occurred');

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, requestId },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors,
        requestId,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Resource not found' },
  });
}
