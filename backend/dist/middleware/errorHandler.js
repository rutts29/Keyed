import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
export class AppError extends Error {
    statusCode;
    code;
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
export function errorHandler(err, _req, res, _next) {
    logger.error({ err }, 'Error occurred');
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: { code: err.code, message: err.message },
        });
        return;
    }
    if (err instanceof ZodError) {
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
export function notFoundHandler(_req, res) {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
}
//# sourceMappingURL=errorHandler.js.map