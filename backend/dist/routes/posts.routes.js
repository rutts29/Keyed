"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const posts_controller_js_1 = require("../controllers/posts.controller.js");
const auth_js_1 = require("../middleware/auth.js");
const validation_js_1 = require("../middleware/validation.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type'));
        }
    },
});
router.post('/upload', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitUpload, upload.single('file'), posts_controller_js_1.postsController.upload);
router.post('/create', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, (0, validation_js_1.validateBody)(validation_js_1.schemas.createPost), posts_controller_js_1.postsController.create);
router.get('/:postId', auth_js_1.optionalAuthMiddleware, rateLimiter_js_1.rateLimitGet, posts_controller_js_1.postsController.getPost);
router.post('/:postId/like', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, posts_controller_js_1.postsController.like);
router.delete('/:postId/like', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, posts_controller_js_1.postsController.unlike);
router.get('/:postId/comments', rateLimiter_js_1.rateLimitGet, (0, validation_js_1.validateQuery)(validation_js_1.schemas.pagination), posts_controller_js_1.postsController.getComments);
router.post('/:postId/comments', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, (0, validation_js_1.validateBody)(validation_js_1.schemas.comment), posts_controller_js_1.postsController.addComment);
router.post('/:postId/report', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, (0, validation_js_1.validateBody)(validation_js_1.schemas.report), posts_controller_js_1.postsController.report);
exports.default = router;
//# sourceMappingURL=posts.routes.js.map