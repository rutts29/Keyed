import { Router } from 'express';
import { accessController } from '../controllers/access.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitGet, rateLimitPost } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/verify', authMiddleware, rateLimitGet, accessController.verifyAccess);
router.post('/requirements', authMiddleware, rateLimitPost, accessController.setRequirements);

export default router;
