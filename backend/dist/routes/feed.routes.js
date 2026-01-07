import { Router } from 'express';
import { feedController } from '../controllers/feed.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { validateQuery, schemas } from '../middleware/validation.js';
import { rateLimitGet } from '../middleware/rateLimiter.js';
const router = Router();
router.get('/', authMiddleware, rateLimitGet, validateQuery(schemas.pagination), feedController.getPersonalizedFeed);
router.get('/explore', optionalAuthMiddleware, rateLimitGet, validateQuery(schemas.pagination), feedController.getExploreFeed);
router.get('/following', authMiddleware, rateLimitGet, validateQuery(schemas.pagination), feedController.getFollowingFeed);
router.get('/trending', rateLimitGet, feedController.getTrending);
export default router;
//# sourceMappingURL=feed.routes.js.map