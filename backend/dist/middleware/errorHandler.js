"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const zod_1 = require("zod");
const logger_js_1 = require("../utils/logger.js");
class AppError extends Error {
    statusCode;
    code;
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    logger_js_1.logger.error({ err }, 'Error occurred');
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: { code: err.code, message: err.message },
        });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: err.errors,
            },
        });
        return;
    }
    res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
}
function notFoundHandler(_req, res) {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
}
//# sourceMappingURL=errorHandler.js.map