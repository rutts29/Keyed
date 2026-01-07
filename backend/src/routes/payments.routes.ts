import { Router } from 'express';
import { paymentsController } from '../controllers/payments.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { rateLimitPost, rateLimitGet } from '../middleware/rateLimiter.js';

const router = Router();

// Creator vault management
router.post('/vault/initialize', authMiddleware, rateLimitPost, paymentsController.initializeVault);
router.get('/vault', authMiddleware, rateLimitGet, paymentsController.getVaultInfo);

// Tips
router.post('/tip', authMiddleware, rateLimitPost, validateBody(schemas.tip), paymentsController.tip);

// Subscriptions
router.post('/subscribe', authMiddleware, rateLimitPost, validateBody(schemas.subscribe), paymentsController.subscribe);
router.delete('/subscribe/:creator', authMiddleware, rateLimitPost, paymentsController.cancelSubscription);

// Earnings and withdrawals
router.get('/earnings', authMiddleware, rateLimitGet, paymentsController.getEarnings);
router.post('/withdraw', authMiddleware, rateLimitPost, validateBody(schemas.withdraw), paymentsController.withdraw);

export default router;
