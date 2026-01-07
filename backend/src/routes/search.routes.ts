import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { rateLimitSearch } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/semantic', optionalAuthMiddleware, rateLimitSearch, validateBody(schemas.semanticSearch), searchController.semanticSearch);
router.get('/suggest', rateLimitSearch, searchController.suggest);
router.get('/users', rateLimitSearch, searchController.searchUsers);

export default router;
