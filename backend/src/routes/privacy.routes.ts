import { Router } from 'express';
import { privacyController } from '../controllers/privacy.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitPost, rateLimitGet } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Privacy Cash Operations

/**
 * POST /privacy/shield
 * Shield SOL into privacy pool
 * Body: { amount: number }
 */
router.post('/shield', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(privacyController.shield));

/**
 * POST /privacy/tip
 * Send private tip from shielded balance
 * Body: { creatorWallet: string, amount: number, postId?: string }
 */
router.post('/tip', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(privacyController.privateTip));

/**
 * GET /privacy/balance
 * Get user's shielded balance
 */
router.get('/balance', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(privacyController.getBalance));

// Privacy Tips History

/**
 * GET /privacy/tips/received
 * Get private tips received (creator view - amounts only, no tipper info)
 */
router.get('/tips/received', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(privacyController.getPrivateTipsReceived));

/**
 * GET /privacy/tips/sent
 * Get user's private tip history
 */
router.get('/tips/sent', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(privacyController.getPrivateTipsSent));

// Privacy Settings

/**
 * GET /privacy/settings
 * Get user's privacy preferences
 */
router.get('/settings', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(privacyController.getSettings));

/**
 * PUT /privacy/settings
 * Update user's privacy preferences
 * Body: { defaultPrivateTips: boolean }
 */
router.put('/settings', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(privacyController.updateSettings));

// Pool Information

/**
 * GET /privacy/pool/info
 * Get Privacy Cash pool statistics
 */
router.get('/pool/info', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(privacyController.getPoolInfo));

export default router;
