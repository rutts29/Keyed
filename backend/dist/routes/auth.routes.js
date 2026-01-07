import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { rateLimitPost } from '../middleware/rateLimiter.js';
const router = Router();
router.post('/challenge', validateBody(schemas.authChallenge), authController.getChallenge);
router.post('/verify', validateBody(schemas.authVerify), authController.verify);
router.post('/refresh', rateLimitPost, authController.refresh);
export default router;
//# sourceMappingURL=auth.routes.js.map