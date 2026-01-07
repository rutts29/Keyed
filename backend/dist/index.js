"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_js_1 = require("./config/env.js");
const logger_js_1 = require("./utils/logger.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const users_routes_js_1 = __importDefault(require("./routes/users.routes.js"));
const posts_routes_js_1 = __importDefault(require("./routes/posts.routes.js"));
const feed_routes_js_1 = __importDefault(require("./routes/feed.routes.js"));
const payments_routes_js_1 = __importDefault(require("./routes/payments.routes.js"));
const search_routes_js_1 = __importDefault(require("./routes/search.routes.js"));
const access_routes_js_1 = __importDefault(require("./routes/access.routes.js"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_js_1.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_routes_js_1.default);
app.use('/api/users', users_routes_js_1.default);
app.use('/api/posts', posts_routes_js_1.default);
app.use('/api/feed', feed_routes_js_1.default);
app.use('/api/payments', payments_routes_js_1.default);
app.use('/api/search', search_routes_js_1.default);
app.use('/api/access', access_routes_js_1.default);
app.use(errorHandler_js_1.notFoundHandler);
app.use(errorHandler_js_1.errorHandler);
const server = app.listen(env_js_1.env.PORT, () => {
    logger_js_1.logger.info({ port: env_js_1.env.PORT, env: env_js_1.env.NODE_ENV }, '🚀 SolShare API server started');
});
process.on('SIGTERM', () => {
    logger_js_1.logger.info('SIGTERM received, shutting down...');
    server.close(() => {
        logger_js_1.logger.info('Server closed');
        process.exit(0);
    });
});
process.on('unhandledRejection', (reason) => {
    logger_js_1.logger.error({ reason }, 'Unhandled rejection');
});
exports.default = app;
//# sourceMappingURL=index.js.map