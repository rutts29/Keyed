import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateQuery, validateParams, schemas } from '../middleware/validation.js';
import { rateLimitGet, rateLimitPost } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

router.get('/', authMiddleware, rateLimitGet, validateQuery(schemas.notificationList), asyncHandler<AuthenticatedRequest>(notificationController.list));
router.get('/unread-count', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(notificationController.unreadCount));
router.put('/:id/read', authMiddleware, rateLimitPost, validateParams(schemas.notificationId), asyncHandler<AuthenticatedRequest>(notificationController.markRead));
router.put('/read-all', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(notificationController.markAllRead));

export default router;
