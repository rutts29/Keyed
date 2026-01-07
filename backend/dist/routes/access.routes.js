"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const access_controller_js_1 = require("../controllers/access.controller.js");
const auth_js_1 = require("../middleware/auth.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const router = (0, express_1.Router)();
router.get('/verify', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitGet, access_controller_js_1.accessController.verifyAccess);
router.post('/requirements', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, access_controller_js_1.accessController.setRequirements);
exports.default = router;
//# sourceMappingURL=access.routes.js.map