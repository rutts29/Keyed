"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const feed_controller_js_1 = require("../controllers/feed.controller.js");
const auth_js_1 = require("../middleware/auth.js");
const validation_js_1 = require("../middleware/validation.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitGet, (0, validation_js_1.validateQuery)(validation_js_1.schemas.pagination), feed_controller_js_1.feedController.getPersonalizedFeed);
router.get('/explore', auth_js_1.optionalAuthMiddleware, rateLimiter_js_1.rateLimitGet, (0, validation_js_1.validateQuery)(validation_js_1.schemas.pagination), feed_controller_js_1.feedController.getExploreFeed);
router.get('/following', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitGet, (0, validation_js_1.validateQuery)(validation_js_1.schemas.pagination), feed_controller_js_1.feedController.getFollowingFeed);
router.get('/trending', rateLimiter_js_1.rateLimitGet, feed_controller_js_1.feedController.getTrending);
exports.default = router;
//# sourceMappingURL=feed.routes.js.map