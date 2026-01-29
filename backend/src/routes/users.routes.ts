import { Router } from 'express';
import { usersController } from '../controllers/users.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { validateBody, validateQuery, schemas } from '../middleware/validation.js';
import { rateLimitGet, rateLimitPost } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Suggested users (must be before /:wallet to avoid matching 'suggested' as wallet param)
router.get('/suggested', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(usersController.getSuggestedUsers));

// Profile management
router.get('/:wallet', optionalAuthMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(usersController.getProfile));
router.post('/profile', authMiddleware, rateLimitPost, validateBody(schemas.createProfile), asyncHandler<AuthenticatedRequest>(usersController.createOrUpdateProfile));
router.get('/:wallet/exists', rateLimitGet, asyncHandler<AuthenticatedRequest>(usersController.checkProfileExists));

// User posts
router.get('/:wallet/posts', optionalAuthMiddleware, rateLimitGet, validateQuery(schemas.pagination), asyncHandler<AuthenticatedRequest>(usersController.getUserPosts));

// Social graph
router.get('/:wallet/followers', rateLimitGet, validateQuery(schemas.pagination), asyncHandler<AuthenticatedRequest>(usersController.getFollowers));
router.get('/:wallet/following', rateLimitGet, validateQuery(schemas.pagination), asyncHandler<AuthenticatedRequest>(usersController.getFollowing));

// Follow/unfollow actions
router.post('/:wallet/follow', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(usersController.follow));
router.delete('/:wallet/follow', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(usersController.unfollow));

export default router;
