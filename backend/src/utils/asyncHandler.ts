import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler to ensure unhandled promise rejections
 * are properly passed to the Express error handling middleware.
 *
 * This prevents unhandled promise rejections from crashing the server
 * and ensures all errors are caught and handled consistently.
 *
 * @param fn - The async route handler function to wrap
 * @returns A wrapped request handler that catches and forwards errors
 */
export const asyncHandler = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void> | void
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
};
