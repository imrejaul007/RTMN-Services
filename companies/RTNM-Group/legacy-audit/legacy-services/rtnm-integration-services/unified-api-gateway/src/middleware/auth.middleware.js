/**
 * Authentication Middleware
 * Validates JWT tokens and API keys
 */

const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'Authorization header required'
            });
        }

        // Check Bearer token
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authorization format. Use: Bearer <token>'
            });
        }

        const token = authHeader.substring(7);

        // Verify JWT
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user info to request
            req.user = {
                id: decoded.userId || decoded.id,
                email: decoded.email,
                tenantId: decoded.tenantId,
                permissions: decoded.permissions || [],
                products: decoded.products || []
            };

            // Add tenant ID header for downstream services
            req.headers['x-tenant-id'] = decoded.tenantId;

            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired',
                    expiredAt: jwtError.expiredAt
                });
            }

            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

// API Key authentication (for service-to-service)
const apiKeyMiddleware = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'API key required'
        });
    }

    // Validate API key (in production, check against database)
    const validApiKeys = {
        [process.env.HOJAi_API_KEY]: { service: 'hojai', products: ['hojai'] },
        [process.env.RABTUL_API_KEY]: { service: 'rabtul', products: ['rabtul'] },
        [process.env.CORPPERKS_API_KEY]: { service: 'corpperks', products: ['corpperks'] },
        [process.env.ADBAZAAR_API_KEY]: { service: 'adbazaar', products: ['adbazaar'] },
        [process.env.SAFEQR_API_KEY]: { service: 'safeqr', products: ['safeqr'] }
    };

    const keyInfo = validApiKeys[apiKey];

    if (!keyInfo) {
        return res.status(401).json({
            success: false,
            error: 'Invalid API key'
        });
    }

    req.service = keyInfo;
    next();
};

// Product access check
const requireProduct = (...products) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const userProducts = req.user.products || [];
        const hasAccess = products.some(p => userProducts.includes(p));

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required products: ${products.join(', ')}`
            });
        }

        next();
    };
};

module.exports = {
    authMiddleware,
    apiKeyMiddleware,
    requireProduct
};
