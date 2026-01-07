"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payments_controller_js_1 = require("../controllers/payments.controller.js");
const auth_js_1 = require("../middleware/auth.js");
const validation_js_1 = require("../middleware/validation.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const router = (0, express_1.Router)();
router.post('/tip', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, (0, validation_js_1.validateBody)(validation_js_1.schemas.tip), payments_controller_js_1.paymentsController.tip);
router.post('/subscribe', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, (0, validation_js_1.validateBody)(validation_js_1.schemas.subscribe), payments_controller_js_1.paymentsController.subscribe);
router.delete('/subscribe/:creator', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, payments_controller_js_1.paymentsController.cancelSubscription);
router.get('/earnings', auth_js_1.authMiddleware, payments_controller_js_1.paymentsController.getEarnings);
router.post('/withdraw', auth_js_1.authMiddleware, rateLimiter_js_1.rateLimitPost, (0, validation_js_1.validateBody)(validation_js_1.schemas.withdraw), payments_controller_js_1.paymentsController.withdraw);
exports.default = router;
//# sourceMappingURL=payments.routes.js.map