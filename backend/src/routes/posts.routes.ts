import { Router } from 'express';
import multer from 'multer';
import { postsController } from '../controllers/posts.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { validateBody, validateQuery, schemas } from '../middleware/validation.js';
import { rateLimitGet, rateLimitPost, rateLimitUpload } from '../middleware/rateLimiter.js';

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

router.post('/upload', authMiddleware, rateLimitUpload, upload.single('file'), postsController.upload);
router.post('/create', authMiddleware, rateLimitPost, validateBody(schemas.createPost), postsController.create);
router.get('/:postId', optionalAuthMiddleware, rateLimitGet, postsController.getPost);
router.post('/:postId/like', authMiddleware, rateLimitPost, postsController.like);
router.delete('/:postId/like', authMiddleware, rateLimitPost, postsController.unlike);
router.get('/:postId/comments', rateLimitGet, validateQuery(schemas.pagination), postsController.getComments);
router.post('/:postId/comments', authMiddleware, rateLimitPost, validateBody(schemas.comment), postsController.addComment);
router.post('/:postId/report', authMiddleware, rateLimitPost, validateBody(schemas.report), postsController.report);

export default router;
