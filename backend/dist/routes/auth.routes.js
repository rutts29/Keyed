"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const validation_js_1 = require("../middleware/validation.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const router = (0, express_1.Router)();
router.post('/challenge', (0, validation_js_1.validateBody)(validation_js_1.schemas.authChallenge), auth_controller_js_1.authController.getChallenge);
router.post('/verify', (0, validation_js_1.validateBody)(validation_js_1.schemas.authVerify), auth_controller_js_1.authController.verify);
router.post('/refresh', rateLimiter_js_1.rateLimitPost, auth_controller_js_1.authController.refresh);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map