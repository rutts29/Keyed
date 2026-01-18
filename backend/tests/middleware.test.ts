import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { errorHandler, AppError, notFoundHandler } from '../src/middleware/errorHandler.js';

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('AppError handling', () => {
    it('should handle AppError with correct status code and message', async () => {
      app.get('/test', () => {
        throw new AppError(400, 'BAD_REQUEST', 'Invalid input');
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toBe('Invalid input');
      expect(response.body.error.requestId).toBeDefined();
    });

    it('should handle 404 AppError', async () => {
      app.get('/test', () => {
        throw new AppError(404, 'NOT_FOUND', 'Resource not found');
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle 403 Forbidden AppError', async () => {
      app.get('/test', () => {
        throw new AppError(403, 'FORBIDDEN', 'Access denied');
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('ZodError handling', () => {
    it('should handle ZodError with validation details', async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      app.post('/test', (req: Request, res: Response, next: NextFunction) => {
        try {
          schema.parse(req.body);
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      });
      app.use(errorHandler);

      const response = await request(app)
        .post('/test')
        .send({ email: 'invalid', age: 10 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid request data');
      expect(response.body.error.details).toBeDefined();
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic errors with 500 status', async () => {
      app.get('/test', () => {
        throw new Error('Something went wrong');
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('An unexpected error occurred');
    });

    it('should not expose internal error details', async () => {
      app.get('/test', () => {
        throw new Error('Database connection failed: password incorrect');
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body.error.message).not.toContain('password');
      expect(response.body.error.message).toBe('An unexpected error occurred');
    });
  });

  describe('Request ID handling', () => {
    it('should use provided request ID from header', async () => {
      app.get('/test', () => {
        throw new AppError(400, 'TEST', 'Test error');
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .set('X-Request-ID', 'custom-request-id-123');

      expect(response.body.error.requestId).toBe('custom-request-id-123');
    });

    it('should generate request ID if not provided', async () => {
      app.get('/test', () => {
        throw new AppError(400, 'TEST', 'Test error');
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.body.error.requestId).toBeDefined();
      expect(response.body.error.requestId.length).toBeGreaterThan(0);
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 for unmatched routes', async () => {
      app.use(notFoundHandler);

      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Resource not found');
    });
  });
});

describe('AppError class', () => {
  it('should create error with correct properties', () => {
    const error = new AppError(400, 'BAD_REQUEST', 'Invalid data');

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Invalid data');
    expect(error.name).toBe('AppError');
    expect(error instanceof Error).toBe(true);
  });

  it('should be catchable as Error', () => {
    const error = new AppError(500, 'INTERNAL', 'Server error');
    let caught = false;

    try {
      throw error;
    } catch (e) {
      if (e instanceof Error) {
        caught = true;
      }
    }

    expect(caught).toBe(true);
  });
});
