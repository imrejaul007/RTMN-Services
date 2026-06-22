/**
 * Request Logger Middleware
 */

const { v4: uuidv4 } = require('uuid').v4;

const requestLogger = (logger) => {
    return (req, res, next) => {
        // Generate request ID
        const requestId = req.headers['x-request-id'] || uuidv4();
        req.requestId = requestId;
        res.setHeader('X-Request-ID', requestId);

        // Track timing
        const startTime = Date.now();

        // Log request
        logger.info({
            type: 'request',
            requestId,
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Log response on finish
        res.on('finish', () => {
            const duration = Date.now() - startTime;

            logger.info({
                type: 'response',
                requestId,
                method: req.method,
                path: req.path,
                status: res.statusCode,
                duration: `${duration}ms`,
                contentLength: res.get('Content-Length') || 0
            });
        });

        next();
    };
};

module.exports = { requestLogger };
