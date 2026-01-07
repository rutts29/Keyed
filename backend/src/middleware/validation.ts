import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: result.error.errors,
        },
      });
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
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: result.error.errors,
        },
      });
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
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid path parameters',
          details: result.error.errors,
        },
      });
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
    username: z.string().min(1).max(32),
    bio: z.string().max(256).optional(),
    profileImageUri: z.string().url().optional(),
  }),
  
  updateProfile: z.object({
    bio: z.string().max(256).optional(),
    profileImageUri: z.string().url().optional(),
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
