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
router.put('/:id', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.updateCampaign));

// Campaign lifecycle - on-chain flow
// Step 1: Prepare campaign - returns createCampaignTx for user to sign
router.post('/:id/prepare', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.prepareCampaign));
// Step 2: Confirm create - verifies on-chain campaign exists after user signs
router.post('/:id/confirm-create', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.confirmCreate));
// Step 3: Get fund transaction - returns fundCampaignTx for user to sign
router.get('/:id/fund-tx', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(airdropController.buildFundTx));
// Step 4: Confirm fund - verifies on-chain funded status after user signs
router.post('/:id/confirm-fund', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.confirmFund));
// Step 5: Start distribution - queues crank job (after funded)
router.post('/:id/start', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.startCampaign));

// Cancellation flow
router.get('/:id/refund-tx', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(airdropController.buildRefundTx));
router.post('/:id/confirm-cancel', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.confirmCancel));
router.post('/:id/cancel', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.cancelCampaign));
router.delete('/:id', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(airdropController.deleteCampaign));

export default router;
