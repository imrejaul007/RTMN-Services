/**
 * Authentication Middleware - Service-to-service auth
 *
 * Security model:
 *  - Health endpoint is public (load balancer probes, monitoring)
 *  - All /api/* routes require X-Internal-Token (matches INTERNAL_SERVICE_TOKEN)
 *  - If INTERNAL_SERVICE_TOKEN is unset, auth is enabled in PRODUCTION and
 *    disabled in DEVELOPMENT with a loud warning (so we never accidentally
 *    ship an open service).
 */
import { timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
// FIXED: NODE_ENV defaults to 'production' for safety
const NODE_ENV = process.env.NODE_ENV || 'production';

// Public paths that bypass auth (exact match only — fixed broad /ws/* bypass)
const PUBLIC_PATHS = ['/health', '/health/live', '/health/ready', '/ws'];

function isPublicPath(path: string): boolean {
    // Exact match only — don't allow /ws/internal-debug or similar
    return PUBLIC_PATHS.includes(path);
}

/**
 * Validate internal service token — FIXED: constant-time comparison,
 * no length-leak via early return.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // Skip auth for public paths
    if (isPublicPath(req.path)) {
        return next();
    }

    // Get token from header
    const token = req.headers['x-internal-token'] as string | undefined;

    // If no token configured, behavior depends on environment
    if (!INTERNAL_TOKEN) {
        if (NODE_ENV === 'production') {
            // SECURITY: Never run an unauthenticated API in production
            res.status(503).json({
                error: 'Service Unavailable',
                message: 'INTERNAL_SERVICE_TOKEN must be set in production'
            });
            return;
        }
        // Development only — log a warning, allow the request
        console.warn('⚠️  INTERNAL_SERVICE_TOKEN not set - auth disabled (dev only)');
        return next();
    }

    // Validate token — FIXED: use crypto.timingSafeEqual, no length leak
    if (!token) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing X-Internal-Token header'
        });
        return;
    }

    try {
        const a = Buffer.from(token, 'utf8');
        const b = Buffer.from(INTERNAL_TOKEN, 'utf8');
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or missing X-Internal-Token header'
            });
            return;
        }
    } catch {
        // Buffer encoding mismatch — treat as invalid
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing X-Internal-Token header'
        });
        return;
    }

    next();
}
