import { Router } from 'express';
import { usersController } from '../controllers/users.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { validateBody, validateQuery, schemas } from '../middleware/validation.js';
import { rateLimitGet, rateLimitPost } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/:wallet', optionalAuthMiddleware, rateLimitGet, usersController.getProfile);
router.post('/profile', authMiddleware, rateLimitPost, validateBody(schemas.createProfile), usersController.createOrUpdateProfile);
router.get('/:wallet/posts', optionalAuthMiddleware, rateLimitGet, validateQuery(schemas.pagination), usersController.getUserPosts);
router.get('/:wallet/followers', rateLimitGet, validateQuery(schemas.pagination), usersController.getFollowers);
router.get('/:wallet/following', rateLimitGet, validateQuery(schemas.pagination), usersController.getFollowing);
router.post('/:wallet/follow', authMiddleware, rateLimitPost, usersController.follow);
router.delete('/:wallet/follow', authMiddleware, rateLimitPost, usersController.unfollow);

export default router;
