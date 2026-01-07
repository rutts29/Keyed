"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_js_1 = require("../controllers/users.controller.js");
const auth_js_1 = require("../middleware/auth.js");
const validation_js_1 = require("../middleware/validation.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const router = (0, express_1.Router)();
router.get('/:wallet', auth_js_1.optionalAuthMiddleware, rateLimiter_js_1.rateLimitGet, users_controller_js_1.usersController.getProfile);
router.post('/profile', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, (0, validation_js_1.validateBody)(validation_js_1.schemas.createProfile), users_controller_js_1.usersController.createOrUpdateProfile);
router.get('/:wallet/posts', auth_js_1.optionalAuthMiddleware, rateLimiter_js_1.rateLimitGet, (0, validation_js_1.validateQuery)(validation_js_1.schemas.pagination), users_controller_js_1.usersController.getUserPosts);
router.get('/:wallet/followers', rateLimiter_js_1.rateLimitGet, (0, validation_js_1.validateQuery)(validation_js_1.schemas.pagination), users_controller_js_1.usersController.getFollowers);
router.get('/:wallet/following', rateLimiter_js_1.rateLimitGet, (0, validation_js_1.validateQuery)(validation_js_1.schemas.pagination), users_controller_js_1.usersController.getFollowing);
router.post('/:wallet/follow', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, users_controller_js_1.usersController.follow);
router.delete('/:wallet/follow', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, users_controller_js_1.usersController.unfollow);
exports.default = router;
//# sourceMappingURL=users.routes.js.map