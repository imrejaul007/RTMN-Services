/**
 * RTMN SSO Service - Real Authentication
 * With PostgreSQL database and real auth
 *
 * @version 2.0.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid').v4;
const { Pool } = require('pg');

const app = express();

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/sso.log' })
    ]
});

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'rtmn-sso-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000;

// PostgreSQL connection
let pool;
const connectDB = async () => {
    try {
        pool = new Pool({
            host: process.env.SSO_DB_HOST || 'localhost',
            port: parseInt(process.env.SSO_DB_PORT) || 5432,
            user: process.env.SSO_DB_USER || 'rtmn',
            password: process.env.SSO_DB_PASSWORD || 'rtmn123',
            database: 'rtmn_sso',
            max: 20,
            idleTimeoutMillis: 30000,
        });

        await pool.query('SELECT 1');
        logger.info('PostgreSQL connected');

        // Initialize tables
        await initializeTables();
    } catch (error) {
        logger.error('PostgreSQL connection failed:', error.message);
        logger.info('Using in-memory fallback mode');
        pool = null;
    }
};

// Initialize database tables
const initializeTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tenants (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            domain VARCHAR(255),
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW(),
            status VARCHAR(50) DEFAULT 'active'
        );

        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL,
            password VARCHAR(255),
            name VARCHAR(255),
            tenant_id VARCHAR(100),
            providers TEXT[] DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW(),
            last_login TIMESTAMP,
            UNIQUE(email, tenant_id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS magic_links (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            token VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) NOT NULL,
            tenant_id VARCHAR(100),
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_magic_token ON magic_links(token);
    `);

    // Insert demo data
    await insertDemoData();
};

// Insert demo data
const insertDemoData = async () => {
    try {
        // Demo tenant
        await pool.query(`
            INSERT INTO tenants (id, name, domain)
            VALUES ('default', 'Default Tenant', 'rtmn.com')
            ON CONFLICT (id) DO NOTHING
        `);

        // Demo user (password: demo123)
        const hashedPassword = await bcrypt.hash('demo123', 10);
        await pool.query(`
            INSERT INTO users (id, email, password, name, tenant_id, providers)
            VALUES (
                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                'demo@rtmn.com',
                $1,
                'Demo User',
                'default',
                ARRAY['local']
            )
            ON CONFLICT (email, tenant_id) DO NOTHING
        `, [hashedPassword]);

        logger.info('Demo data inserted');
    } catch (error) {
        logger.warn('Demo data may already exist:', error.message);
    }
};

// In-memory fallback
const inMemoryUsers = new Map();
const inMemoryTenants = new Map();
let useInMemory = false;

// Initialize demo in-memory data
const initInMemory = () => {
    inMemoryTenants.set('default', {
        id: 'default',
        name: 'Default Tenant',
        domain: 'rtmn.com'
    });

    bcrypt.hash('demo123', 10).then(hash => {
        inMemoryUsers.set('demo@rtmn.com', {
            id: 'user-demo-001',
            email: 'demo@rtmn.com',
            password: hash,
            name: 'Demo User',
            tenantId: 'default',
            providers: ['local']
        });
    });
};
initInMemory();

app.use(helmet());
app.use(cors());
app.use(express.json());

// ========================
// AUTHENTICATION
// ========================

/**
 * POST /api/auth/register
 * Register new user with real database
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, tenantId } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required'
            });
        }

        // Validate email format
        if (!email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        const tenant = tenantId || 'default';
        const hashedPassword = await bcrypt.hash(password, 10);

        if (pool) {
            // Real database
            const result = await pool.query(
                `INSERT INTO users (email, password, name, tenant_id, providers)
                 VALUES ($1, $2, $3, $4, ARRAY['local'])
                 RETURNING id, email, name, tenant_id, providers`,
                [email, hashedPassword, name, tenant]
            );

            const user = result.rows[0];

            logger.info({ type: 'user_registered', email, tenantId: tenant });

            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        tenantId: user.tenant_id
                    },
                    accessToken: generateAccessToken(user),
                    refreshToken: generateRefreshToken(user.id)
                }
            });
        } else {
            // In-memory fallback
            if (inMemoryUsers.has(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'User already exists'
                });
            }

            const userId = uuidv4();
            const user = {
                id: userId,
                email,
                password: hashedPassword,
                name,
                tenantId: tenant,
                providers: ['local']
            };

            inMemoryUsers.set(email, user);

            logger.info({ type: 'user_registered', email, tenantId: tenant });

            res.status(201).json({
                success: true,
                data: {
                    user: { id: userId, email, name, tenantId: tenant },
                    accessToken: generateAccessToken({ id: userId, email, name, tenant_id: tenant }),
                    refreshToken: generateRefreshToken(userId)
                }
            });
        }
    } catch (error) {
        logger.error({ type: 'register_error', error: error.message });
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Login with real authentication
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, tenantId } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        let user;
        let userId;

        if (pool) {
            // Real database query
            const result = await pool.query(
                `SELECT * FROM users WHERE email = $1 AND (tenant_id = $2 OR tenant_id IS NULL) LIMIT 1`,
                [email, tenantId || 'default']
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            user = result.rows[0];

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            // Update last login
            await pool.query(
                `UPDATE users SET last_login = NOW() WHERE id = $1`,
                [user.id]
            );

            userId = user.id;
        } else {
            // In-memory fallback
            user = inMemoryUsers.get(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            userId = user.id;
        }

        const accessToken = generateAccessToken({
            id: userId,
            email: user.email,
            name: user.name,
            tenant_id: user.tenant_id || user.tenantId
        });

        const refreshToken = generateRefreshToken(userId);

        logger.info({ type: 'user_login', email, tenantId: user.tenant_id || user.tenantId });

        res.json({
            success: true,
            data: {
                user: {
                    id: userId,
                    email: user.email,
                    name: user.name,
                    tenantId: user.tenant_id || user.tenantId
                },
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        logger.error({ type: 'login_error', error: error.message });
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

/**
 * POST /api/auth/magic-link
 * Send magic link to email
 */
app.post('/api/auth/magic-link', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Generate magic link token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY);

        if (pool) {
            // Store in database
            await pool.query(
                `INSERT INTO magic_links (token, email, tenant_id, expires_at)
                 VALUES ($1, $2, $3, $4)`,
                [token, email, 'default', expiresAt]
            );
        }

        // For demo, return the link directly
        const magicLinkUrl = `${process.env.SSO_URL || 'http://localhost:3015'}/api/auth/verify-magic?token=${token}`;

        logger.info({ type: 'magic_link_sent', email });

        res.json({
            success: true,
            message: 'Magic link sent to email',
            debug_url: magicLinkUrl // Remove in production
        });
    } catch (error) {
        logger.error({ type: 'magic_link_error', error: error.message });
        res.status(500).json({ success: false, error: 'Failed to send magic link' });
    }
});

/**
 * GET /api/auth/verify-magic
 * Verify magic link token
 */
app.get('/api/auth/verify-magic', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        let email;
        let used = false;

        if (pool) {
            const result = await pool.query(
                `SELECT * FROM magic_links WHERE token = $1 AND expires_at > NOW() AND used = FALSE`,
                [token]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or expired token'
                });
            }

            const magicLink = result.rows[0];
            email = magicLink.email;

            // Mark as used
            await pool.query(
                `UPDATE magic_links SET used = TRUE WHERE id = $1`,
                [magicLink.id]
            );
        }

        // Find user
        let user;
        if (pool) {
            const result = await pool.query(
                `SELECT * FROM users WHERE email = $1 LIMIT 1`,
                [email]
            );
            user = result.rows[0];
        } else {
            user = inMemoryUsers.get(email);
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        logger.info({ type: 'magic_link_used', email });

        res.json({
            success: true,
            data: {
                user: { id: user.id, email: user.email, name: user.name },
                accessToken: generateAccessToken(user),
                refreshToken: generateRefreshToken(user.id)
            }
        });
    } catch (error) {
        logger.error({ type: 'verify_magic_error', error: error.message });
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// ========================
// TOKEN MANAGEMENT
// ========================

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
app.post('/api/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, JWT_SECRET);
        } catch {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        const newAccessToken = jwt.sign({
            userId: decoded.userId,
            type: 'access'
        }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        const newRefreshToken = jwt.sign({
            userId: decoded.userId,
            type: 'refresh'
        }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Token refresh failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user
 */
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        let user;

        if (pool) {
            const result = await pool.query(
                `SELECT id, email, name, tenant_id, providers FROM users WHERE id = $1`,
                [req.user.userId]
            );
            user = result.rows[0];
        } else {
            const allUsers = Array.from(inMemoryUsers.values());
            user = allUsers.find(u => u.id === req.user.userId);
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    tenantId: user.tenant_id || user.tenantId,
                    providers: user.providers
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get user' });
    }
});

// ========================
// HELPERS
// ========================

function generateAccessToken(user) {
    return jwt.sign({
        userId: user.id || user.userId,
        email: user.email,
        tenantId: user.tenant_id || user.tenantId,
        type: 'access'
    }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function generateRefreshToken(userId) {
    return jwt.sign({
        userId,
        type: 'refresh'
    }, JWT_SECRET, { expiresIn: '30d' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Token required'
        });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'RTMN SSO Service',
        version: '2.0.0',
        database: pool ? 'connected' : 'in-memory',
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3015;

const start = async () => {
    await connectDB();

    app.listen(PORT, () => {
        logger.info(`🔐 RTMN SSO Service v2.0 running on port ${PORT}`);
        logger.info(`📖 API: http://localhost:${PORT}/api`);
        logger.info(`✅ Demo: demo@rtmn.com / demo123`);
    });
};

start();

module.exports = app;