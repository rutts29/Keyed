import { Router } from 'express';
import { airdropController } from '../controllers/airdrop.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitGet, rateLimitPost } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Campaign management
router.post('/', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.createCampaign));
router.get('/mine', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(airdropController.getMyCampaigns));
router.get('/received', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(airdropController.getReceivedDrops));
router.get('/:id', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(airdropController.getCampaign));

// Campaign lifecycle
router.post('/:id/prepare', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.prepareCampaign));
router.post('/:id/fund', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.fundCampaign));
router.post('/:id/start', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.startCampaign));
router.post('/:id/cancel', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.cancelCampaign));
router.delete('/:id', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.deleteCampaign));

export default router;
