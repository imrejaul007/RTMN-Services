/**
 * Authentication Routes
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid').v4;

const router = express.Router();

// In-memory token store (use Redis in production)
const tokenStore = new Map();

/**
 * POST /api/auth/token
 * Generate access token
 */
router.post('/token', async (req, res) => {
    try {
        const { email, password, apiKey, product } = req.body;

        // Validate request
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password required'
            });
        }

        // In production, validate against database
        // For now, accept any valid format
        if (!email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Generate token
        const userId = uuidv4();
        const tenantId = `tenant_${Date.now()}`;

        const token = jwt.sign({
            userId,
            email,
            tenantId,
            permissions: ['read', 'write'],
            products: [product || 'all'],
            iat: Math.floor(Date.now() / 1000)
        }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY || '7d'
        });

        const refreshToken = jwt.sign({
            userId,
            type: 'refresh'
        }, process.env.JWT_SECRET, {
            expiresIn: '30d'
        });

        // Store token metadata
        tokenStore.set(token, {
            userId,
            email,
            tenantId,
            createdAt: new Date()
        });

        res.json({
            success: true,
            data: {
                access_token: token,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
                user: {
                    id: userId,
                    email
                }
            }
        });
    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate token'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required'
            });
        }

        // Verify refresh token
        try {
            const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            // Generate new tokens
            const newToken = jwt.sign({
                userId: decoded.userId,
                type: 'access'
            }, process.env.JWT_SECRET, {
                expiresIn: '7d'
            });

            res.json({
                success: true,
                data: {
                    access_token: newToken,
                    expires_in: 7 * 24 * 60 * 60
                }
            });
        } catch {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token'
        });
    }
});

/**
 * POST /api/auth/verify
 * Verify token validity
 */
router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token required'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            res.json({
                success: true,
                data: {
                    valid: true,
                    expires: decoded.exp ? new Date(decoded.exp * 1000) : null,
                    user: {
                        id: decoded.userId,
                        email: decoded.email
                    }
                }
            });
        } catch {
            res.json({
                success: true,
                data: {
                    valid: false
                }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Verification failed'
        });
    }
});

/**
 * POST /api/auth/logout
 * Invalidate token
 */
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            tokenStore.delete(token);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token required'
            });
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            res.json({
                success: true,
                data: {
                    user: {
                        id: decoded.userId,
                        email: decoded.email,
                        tenantId: decoded.tenantId
                    },
                    permissions: decoded.permissions,
                    products: decoded.products
                }
            });
        } catch {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
});

module.exports = router;
