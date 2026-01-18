import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { rateLimitSearch } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// AI-powered semantic search
router.post('/semantic', optionalAuthMiddleware, rateLimitSearch, validateBody(schemas.semanticSearch), asyncHandler<AuthenticatedRequest>(searchController.semanticSearch));

// Autocomplete suggestions
router.get('/suggest', rateLimitSearch, asyncHandler<AuthenticatedRequest>(searchController.suggest));

// User search
router.get('/users', rateLimitSearch, asyncHandler<AuthenticatedRequest>(searchController.searchUsers));

// Tag-based search
router.get('/tag', optionalAuthMiddleware, rateLimitSearch, asyncHandler<AuthenticatedRequest>(searchController.searchByTag));

export default router;
