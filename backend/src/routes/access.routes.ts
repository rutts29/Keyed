import { Router } from 'express';
import { accessController } from '../controllers/access.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitGet, rateLimitPost } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Check if user has access to a post
router.get('/verify', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(accessController.verifyAccess));

// Set access requirements for a post (creator only)
router.post('/requirements', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(accessController.setRequirements));

// Verify token access (build transaction for on-chain verification)
router.post('/verify-token', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(accessController.verifyTokenAccess));

// Verify NFT access (build transaction for on-chain verification)
router.post('/verify-nft', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(accessController.verifyNftAccess));

// Check access status on-chain (read-only view call)
router.get('/check', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(accessController.checkAccess));

export default router;
