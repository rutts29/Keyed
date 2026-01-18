import { Router } from 'express';
import { paymentsController } from '../controllers/payments.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { rateLimitPost, rateLimitGet } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Creator vault management
router.post('/vault/initialize', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(paymentsController.initializeVault));
router.get('/vault', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(paymentsController.getVaultInfo));

// Tips
router.post('/tip', authMiddleware, rateLimitPost, validateBody(schemas.tip), asyncHandler<AuthenticatedRequest>(paymentsController.tip));

// Subscriptions
router.post('/subscribe', authMiddleware, rateLimitPost, validateBody(schemas.subscribe), asyncHandler<AuthenticatedRequest>(paymentsController.subscribe));
router.delete('/subscribe/:creator', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(paymentsController.cancelSubscription));

// Earnings and withdrawals
router.get('/earnings', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(paymentsController.getEarnings));
router.post('/withdraw', authMiddleware, rateLimitPost, validateBody(schemas.withdraw), asyncHandler<AuthenticatedRequest>(paymentsController.withdraw));

export default router;
