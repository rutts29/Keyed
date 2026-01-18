import { Router } from 'express';
import multer from 'multer';
import { postsController } from '../controllers/posts.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { validateBody, validateQuery, schemas } from '../middleware/validation.js';
import { rateLimitGet, rateLimitPost, rateLimitUpload } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

router.post('/upload', authMiddleware, rateLimitUpload, upload.single('file'), asyncHandler<AuthenticatedRequest>(postsController.upload));
router.post('/create', authMiddleware, rateLimitPost, validateBody(schemas.createPost), asyncHandler<AuthenticatedRequest>(postsController.create));
router.get('/:postId', optionalAuthMiddleware, rateLimitGet, asyncHandler<AuthenticatedRequest>(postsController.getPost));
router.post('/:postId/like', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(postsController.like));
router.delete('/:postId/like', authMiddleware, rateLimitPost, asyncHandler<AuthenticatedRequest>(postsController.unlike));
router.get('/:postId/comments', rateLimitGet, validateQuery(schemas.pagination), asyncHandler<AuthenticatedRequest>(postsController.getComments));
router.post('/:postId/comments', authMiddleware, rateLimitPost, validateBody(schemas.comment), asyncHandler<AuthenticatedRequest>(postsController.addComment));
router.post('/:postId/report', authMiddleware, rateLimitPost, validateBody(schemas.report), asyncHandler<AuthenticatedRequest>(postsController.report));

export default router;
