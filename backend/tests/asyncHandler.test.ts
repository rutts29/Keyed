/**
 * asyncHandler Tests (Criticality: 9/10)
 *
 * Tests for the async handler wrapper in src/utils/asyncHandler.ts.
 * This utility wraps ALL route handlers across the application,
 * so bugs here would affect the entire error handling system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asyncHandler } from '../src/utils/asyncHandler.js';
import type { Request, Response, NextFunction } from 'express';

// Helper to wait for promise chain to complete
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('asyncHandler', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {} as Request;
    mockRes = {} as Response;
    mockNext = vi.fn();
  });

  describe('error handling', () => {
    it('forwards async errors to next()', async () => {
      const error = new Error('Async database error');
      const handler = async () => {
        throw error;
      };

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('handles async functions that return rejected promises', async () => {
      const error = new Error('Promise rejection');
      const handler = async () => {
        await Promise.reject(error);
      };

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('handles async functions with awaited rejections', async () => {
      const error = new Error('Awaited rejection');
      const handler = async () => {
        const promise = Promise.reject(error);
        await promise;
      };

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('handles non-Error objects thrown', async () => {
      const errorObj = { message: 'Non-error object', code: 'CUSTOM' };
      const handler = async () => {
        throw errorObj;
      };

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(errorObj);
    });

    it('handles string thrown as error', async () => {
      const handler = async () => {
        throw 'String error message';
      };

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith('String error message');
    });
  });

  describe('successful execution', () => {
    it('completes successfully without calling next(error)', async () => {
      const handler = async () => {
        // Successful handler - no error
      };

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('allows handler to call next() for middleware chaining', async () => {
      const handler = async (_req: Request, _res: Response, next: NextFunction) => {
        next();
      };

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('handles void return from handler', async () => {
      const handler = async () => {
        // Handler with no explicit return
      };

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('type preservation', () => {
    it('preserves custom request type', async () => {
      interface AuthenticatedRequest extends Request {
        wallet?: string;
        userId?: number;
      }

      const handler = async (req: AuthenticatedRequest) => {
        // TypeScript should allow accessing wallet
        expect(req.wallet).toBeUndefined();
      };

      const customReq = { wallet: undefined } as AuthenticatedRequest;
      const wrapped = asyncHandler<AuthenticatedRequest>(handler);
      wrapped(customReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('passes request, response, and next to handler', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });
  });

  describe('edge cases', () => {
    it('handles handler that returns a value', async () => {
      const handler = async () => {
        return { data: 'some result' };
      };

      const wrapped = asyncHandler(handler);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      // Return value is ignored, no error should occur
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('handles multiple rapid calls', async () => {
      let callCount = 0;
      const handler = async () => {
        callCount++;
      };

      const wrapped = asyncHandler(handler);

      // Simulate rapid requests
      wrapped(mockReq, mockRes, mockNext);
      wrapped(mockReq, mockRes, mockNext);
      wrapped(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(callCount).toBe(3);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('isolates errors between calls', async () => {
      let shouldError = true;
      const handler = async () => {
        if (shouldError) {
          shouldError = false;
          throw new Error('First call error');
        }
        // Second call succeeds
      };

      const wrapped = asyncHandler(handler);
      const next1 = vi.fn();
      const next2 = vi.fn();

      wrapped(mockReq, mockRes, next1);
      await flushPromises();
      wrapped(mockReq, mockRes, next2);
      await flushPromises();

      expect(next1).toHaveBeenCalledWith(expect.any(Error));
      expect(next2).not.toHaveBeenCalled();
    });
  });
});
