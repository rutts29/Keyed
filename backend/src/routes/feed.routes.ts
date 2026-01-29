import { Router } from 'express';
import { feedController } from '../controllers/feed.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { validateQuery, schemas } from '../middleware/validation.js';
import { rateLimitGet } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

router.get('/', authMiddleware, rateLimitGet, validateQuery(schemas.pagination), asyncHandler<AuthenticatedRequest>(feedController.getPersonalizedFeed));
router.get('/explore', optionalAuthMiddleware, rateLimitGet, validateQuery(schemas.pagination), asyncHandler<AuthenticatedRequest>(feedController.getExploreFeed));
router.get('/following', authMiddleware, rateLimitGet, validateQuery(schemas.pagination), asyncHandler<AuthenticatedRequest>(feedController.getFollowingFeed));
router.get('/trending', optionalAuthMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(feedController.getTrending));
router.get('/trending-topics', optionalAuthMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(feedController.getTrendingTopics));

export default router;
