"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_controller_js_1 = require("../controllers/search.controller.js");
const auth_js_1 = require("../middleware/auth.js");
const validation_js_1 = require("../middleware/validation.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const router = (0, express_1.Router)();
router.post('/semantic', auth_js_1.optionalAuthMiddleware, rateLimiter_js_1.rateLimitSearch, (0, validation_js_1.validateBody)(validation_js_1.schemas.semanticSearch), search_controller_js_1.searchController.semanticSearch);
router.get('/suggest', rateLimiter_js_1.rateLimitSearch, search_controller_js_1.searchController.suggest);
router.get('/users', rateLimiter_js_1.rateLimitSearch, search_controller_js_1.searchController.searchUsers);
exports.default = router;
//# sourceMappingURL=search.routes.js.map