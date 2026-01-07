import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { rateLimitSearch } from '../middleware/rateLimiter.js';
const router = Router();
// AI-powered semantic search
router.post('/semantic', optionalAuthMiddleware, rateLimitSearch, validateBody(schemas.semanticSearch), searchController.semanticSearch);
// Autocomplete suggestions
router.get('/suggest', rateLimitSearch, searchController.suggest);
// User search
router.get('/users', rateLimitSearch, searchController.searchUsers);
// Tag-based search
router.get('/tag', optionalAuthMiddleware, rateLimitSearch, searchController.searchByTag);
export default router;
//# sourceMappingURL=search.routes.js.map