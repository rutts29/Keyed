import { Router } from 'express';
import { privacyController } from '../controllers/privacy.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitPost, rateLimitGet } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Private tip logging (frontend SDK handles the ZK withdraw, backend logs to DB)
router.post('/tip/log', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(privacyController.logPrivateTip));

// Privacy Tips History
router.get('/tips/received', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(privacyController.getPrivateTipsReceived));
router.get('/tips/sent', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(privacyController.getPrivateTipsSent));

// Privacy Settings
router.get('/settings', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(privacyController.getSettings));
router.put('/settings', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(privacyController.updateSettings));

// Pool Information
router.get('/pool/info', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(privacyController.getPoolInfo));

export default router;
