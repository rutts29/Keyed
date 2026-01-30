import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { env } from '../config/env.js';

/**
 * Format validation errors for response.
 * In production, hide internal schema details to prevent information leakage.
 * In development/test, include full details for debugging.
 */
function formatValidationError(error: ZodError, message: string) {
  const isProduction = env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, only return generic field names without schema details
    const fields = error.errors.map(e => e.path.join('.'));
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        fields: [...new Set(fields)], // Unique field names only
      },
    };
  }
  
  // In development, include full error details
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: error.errors,
    },
  };
}

export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json(formatValidationError(result.error, 'Invalid request body'));
      return;
    }
    
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    
    if (!result.success) {
      res.status(400).json(formatValidationError(result.error, 'Invalid query parameters'));
      return;
    }
    
    req.query = result.data;
    next();
  };
}

export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    
    if (!result.success) {
      res.status(400).json(formatValidationError(result.error, 'Invalid path parameters'));
      return;
    }
    
    req.params = result.data;
    next();
  };
}

export const schemas = {
  wallet: z.string().min(32).max(44),
  
  pagination: z.object({
    limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
    cursor: z.string().optional(),
  }),
  
  createProfile: z.object({
    username: z.string().min(1).max(32).nullable().optional(),
    bio: z.string().max(256).nullable().optional(),
    profileImageUri: z.string().url().nullable().optional(),
  }),

  updateProfile: z.object({
    bio: z.string().max(256).nullable().optional(),
    profileImageUri: z.string().url().nullable().optional(),
  }),
  
  createPost: z.object({
    contentUri: z.string().min(1),
    contentType: z.enum(['image', 'video', 'text', 'multi']).default('image'),
    caption: z.string().max(2000).optional(),
    isTokenGated: z.boolean().default(false),
    requiredToken: z.string().optional(),
  }),
  
  comment: z.object({
    text: z.string().min(1).max(500),
  }),
  
  tip: z.object({
    creatorWallet: z.string().min(32).max(44),
    amount: z.number().positive(),
    postId: z.string().optional(),
  }),
  
  subscribe: z.object({
    creatorWallet: z.string().min(32).max(44),
    amountPerMonth: z.number().positive(),
  }),
  
  withdraw: z.object({
    amount: z.number().positive(),
  }),
  
  semanticSearch: z.object({
    query: z.string().min(1).max(500),
    limit: z.number().min(1).max(50).default(20),
    rerank: z.boolean().default(true),
  }),
  
  notificationId: z.object({
    id: z.string().uuid(),
  }),

  notificationList: z.object({
    limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
    cursor: z.string().optional(),
    type: z.enum(['like', 'comment', 'follow', 'tip', 'new_post']).optional(),
    unread: z.string().transform(v => v === 'true').optional(),
  }),

  report: z.object({
    reason: z.enum(['nsfw', 'spam', 'harassment', 'other']),
    description: z.string().max(500).optional(),
  }),
  
  authChallenge: z.object({
    wallet: z.string().min(32).max(44),
  }),
  
  authVerify: z.object({
    wallet: z.string().min(32).max(44),
    signature: z.string().min(1),
  }),
};
