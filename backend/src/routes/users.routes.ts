import { Router } from 'express';
import multer from 'multer';
import { usersController } from '../controllers/users.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { validateBody, validateQuery, schemas } from '../middleware/validation.js';
import { rateLimitGet, rateLimitPost, rateLimitUpload } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Use JPG, PNG, GIF, or WebP.'));
    }
  },
});

// Browse all creators (public, paginated)
router.get('/explore', rateLimitGet, validateQuery(schemas.pagination), asyncHandler(usersController.listCreators));

// Wallet SOL balance (must be before /:wallet)
router.get('/me/balance', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(usersController.getWalletBalance));

// Suggested users (must be before /:wallet to avoid matching 'suggested' as wallet param)
router.get('/suggested', authMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(usersController.getSuggestedUsers));

// Profile management
router.get('/:wallet', optionalAuthMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(usersController.getProfile));
router.post('/profile/avatar', authMiddleware, rateLimitUpload, avatarUpload.single('file'), asyncHandler<AuthenticatedRequest>(usersController.uploadAvatar));
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
