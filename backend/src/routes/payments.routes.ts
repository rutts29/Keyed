import { Router } from 'express';
import { paymentsController } from '../controllers/payments.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { rateLimitPost } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/tip', authMiddleware, rateLimitPost, validateBody(schemas.tip), paymentsController.tip);
router.post('/subscribe', authMiddleware, rateLimitPost, validateBody(schemas.subscribe), paymentsController.subscribe);
router.delete('/subscribe/:creator', authMiddleware, rateLimitPost, paymentsController.cancelSubscription);
router.get('/earnings', authMiddleware, paymentsController.getEarnings);
router.post('/withdraw', authMiddleware, rateLimitPost, validateBody(schemas.withdraw), paymentsController.withdraw);

export default router;
