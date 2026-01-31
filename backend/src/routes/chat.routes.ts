import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitGet, rateLimitPost } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Room management
router.post('/rooms', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(chatController.createRoom));
router.get('/rooms/mine', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(chatController.getMyRooms));
router.get('/rooms', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(chatController.getRooms));
router.get('/rooms/:id', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(chatController.getRoom));

// Membership
router.post('/rooms/:id/join', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(chatController.joinRoom));
router.post('/rooms/:id/leave', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(chatController.leaveRoom));

// Messages
router.get('/rooms/:id/messages', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(chatController.getMessages));
router.post('/rooms/:id/messages', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(chatController.sendMessage));

export default router;
