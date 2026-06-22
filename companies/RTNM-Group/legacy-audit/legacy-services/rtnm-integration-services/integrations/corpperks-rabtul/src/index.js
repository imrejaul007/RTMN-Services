/**
 * CorpPerks → RABTUL Integration Service - Real Implementation
 * Connects to actual RTNM ecosystem services
 *
 * @version 2.0.0
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const winston = require('winston');
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
        new winston.transports.File({ filename: 'logs/integration.log' })
    ]
});

// Configuration - RTNM Service URLs
const RTNM_SERVICES = {
    corpperks: process.env.CORPPERKS_URL || 'http://localhost:4700',
    rabtul: process.env.RABTUL_URL || 'http://localhost:4005',
    safeqr: process.env.SAFEQR_URL || 'http://localhost:4001',
    nexha: process.env.NEXHA_URL || 'http://localhost:4100',
    hojai: process.env.HOJAi_URL || 'http://localhost:4800'
};

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'rtmn-internal-token';

// PostgreSQL for integration logs
let pool;

// Connect to database
const connectDB = async () => {
    try {
        pool = new Pool({
            host: process.env.INTEGRATION_DB_HOST || 'localhost',
            port: parseInt(process.env.INTEGRATION_DB_PORT) || 5432,
            user: process.env.INTEGRATION_DB_USER || 'rtmn',
            password: process.env.INTEGRATION_DB_PASSWORD || 'rtmn123',
            database: 'rtmn_integration',
            max: 20,
            idleTimeoutMillis: 30000,
        });

        await pool.query('SELECT 1');
        logger.info('PostgreSQL connected');

        // Initialize tables
        await initializeTables();
    } catch (error) {
        logger.error('PostgreSQL connection failed:', error.message);
        logger.info('Using in-memory logging mode');
        pool = null;
    }
};

// Initialize tables
const initializeTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS integrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            request_id UUID,
            tenant_id VARCHAR(100),
            source VARCHAR(100),
            target VARCHAR(100),
            status VARCHAR(50),
            request_data JSONB,
            response_data JSONB,
            error TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS integration_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            integration_id UUID REFERENCES integrations(id),
            action VARCHAR(100),
            details JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
        CREATE INDEX IF NOT EXISTS idx_integration_logs ON integration_logs(integration_id);
    `);
};

// In-memory fallback
const integrationLog = [];

app.use(express.json());

// ========================
// REAL SERVICE CALLS
// ========================

/**
 * Call RTNM service with retries
 */
async function callService(serviceName, method, path, data = null, retries = 3) {
    const baseUrl = RTNM_SERVICES[serviceName];
    if (!baseUrl) {
        return { success: false, error: `Unknown service: ${serviceName}` };
    }

    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios({
                method,
                url: `${baseUrl}${path}`,
                data,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Token': INTERNAL_TOKEN
                },
                timeout: 15000
            });

            return { success: true, data: response.data };
        } catch (error) {
            lastError = error;
            logger.warn(`Service call attempt ${attempt} failed: ${serviceName}${path}`, { error: error.message });

            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    return { success: false, error: lastError?.message || 'Service unavailable' };
}

// ========================
// CORE INTEGRATION
// ========================

/**
 * POST /api/integrate/employee
 * Create employee with all integrations
 */
app.post('/api/integrate/employee', async (req, res) => {
    const requestId = uuidv4();
    const { name, email, phone, department, role, tenantId, metadata } = req.body;

    if (!name || !email || !tenantId) {
        return res.status(400).json({
            success: false,
            error: 'Name, email, and tenantId are required'
        });
    }

    logger.info({
        type: 'employee_integration_start',
        requestId,
        name,
        email,
        tenantId
    });

    const results = {
        requestId,
        employee: null,
        integrations: [],
        errors: [],
        startedAt: new Date().toISOString()
    };

    // Log to database
    const logIntegration = async (source, target, status, requestData, responseData, error) => {
        const logData = {
            request_id: requestId,
            tenant_id: tenantId,
            source,
            target,
            status,
            request_data: requestData,
            response_data: responseData,
            error
        };

        if (pool) {
            await pool.query(
                `INSERT INTO integrations (request_id, tenant_id, source, target, status, request_data, response_data, error)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [requestId, tenantId, source, target, status, JSON.stringify(requestData), JSON.stringify(responseData), error]
            );
        } else {
            integrationLog.push({ ...logData, created_at: new Date() });
            if (integrationLog.length > 1000) integrationLog.shift();
        }
    };

    try {
        // Step 1: Create in CorpPerks
        logger.info('Creating employee in CorpPerks...');
        const corpperksResult = await callService('corpperks', 'post', '/api/employees', {
            name,
            email,
            phone,
            department,
            role,
            metadata: { tenantId, source: 'rtmn-integration', ...metadata }
        });

        if (corpperksResult.success) {
            results.employee = corpperksResult.data;
            results.integrations.push({
                service: 'corpperks',
                action: 'employee_created',
                status: 'success',
                data: corpperksResult.data
            });
            await logIntegration('rtmn', 'corpperks', 'success', { name, email }, corpperksResult.data, null);
            logger.info('Employee created in CorpPerks', { employeeId: corpperksResult.data?.id });
        } else {
            results.errors.push({ service: 'corpperks', error: corpperksResult.error });
            await logIntegration('rtmn', 'corpperks', 'failed', { name, email }, null, corpperksResult.error);
            logger.error('CorpPerks failed', { error: corpperksResult.error });
        }

        // Step 2: Create RABTUL Wallet
        logger.info('Creating RABTUL wallet...');
        const walletResult = await callService('rabtul', 'post', '/api/wallet/create', {
            userId: corpperksResult.data?.id || email,
            name,
            email,
            phone,
            type: 'employee',
            metadata: { tenantId, department, source: 'corpperks-integration' }
        });

        if (walletResult.success) {
            results.integrations.push({
                service: 'rabtul',
                action: 'wallet_created',
                status: 'success',
                walletId: walletResult.data?.id || walletResult.data?.walletId
            });
            await logIntegration('corpperks', 'rabtul', 'success', { userId: email }, walletResult.data, null);
            logger.info('Wallet created in RABTUL', { walletId: walletResult.data?.id });
        } else {
            results.errors.push({ service: 'rabtul', error: walletResult.error });
            await logIntegration('corpperks', 'rabtul', 'failed', { userId: email }, null, walletResult.error);
            logger.error('RABTUL wallet failed', { error: walletResult.error });
        }

        // Step 3: Create SafeQR Safety Badge
        logger.info('Creating SafeQR badge...');
        const safeqrResult = await callService('safeqr', 'post', '/api/safety/badge/create', {
            userId: corpperksResult.data?.id || email,
            name,
            email,
            phone,
            type: 'employee',
            tenantId,
            metadata: { tenantId, department, source: 'corpperks-integration' }
        });

        if (safeqrResult.success) {
            results.integrations.push({
                service: 'safeqr',
                action: 'badge_created',
                status: 'success',
                badgeId: safeqrResult.data?.id || safeqrResult.data?.badgeId
            });
            await logIntegration('corpperks', 'safeqr', 'success', { userId: email }, safeqrResult.data, null);
            logger.info('SafeQR badge created', { badgeId: safeqrResult.data?.id });
        } else {
            results.errors.push({ service: 'safeqr', error: safeqrResult.error });
            await logIntegration('corpperks', 'safeqr', 'failed', { userId: email }, null, safeqrResult.error);
            logger.error('SafeQR failed', { error: safeqrResult.error });
        }

        // Step 4: Create Nexha Identity
        logger.info('Creating Nexha identity...');
        const nexhaResult = await callService('nexha', 'post', '/api/entities', {
            type: 'person',
            name,
            email,
            phone,
            metadata: {
                tenantId,
                department,
                role,
                employeeId: corpperksResult.data?.id,
                source: 'corpperks-integration'
            }
        });

        if (nexhaResult.success) {
            results.integrations.push({
                service: 'nexha',
                action: 'identity_created',
                status: 'success',
                entityId: nexhaResult.data?.id || nexhaResult.data?.entityId
            });
            await logIntegration('corpperks', 'nexha', 'success', { name, email }, nexhaResult.data, null);
            logger.info('Nexha identity created', { entityId: nexhaResult.data?.id });
        } else {
            results.errors.push({ service: 'nexha', error: nexhaResult.error });
            await logIntegration('corpperks', 'nexha', 'failed', { name, email }, null, nexhaResult.error);
            logger.error('Nexha failed', { error: nexhaResult.error });
        }

        results.completedAt = new Date().toISOString();

        logger.info('Employee integration completed', {
            requestId,
            employeeId: corpperksResult.data?.id,
            successCount: results.integrations.filter(i => i.status === 'success').length,
            errorCount: results.errors.length
        });

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        logger.error('Employee integration failed', { requestId, error: error.message });
        results.errors.push({ service: 'rtmn', error: error.message });
        results.completedAt = new Date().toISOString();

        res.status(500).json({
            success: false,
            error: 'Integration failed',
            data: results
        });
    }
});

// ========================
// SERVICE HEALTH CHECKS
// ========================

app.get('/api/health/:serviceId', async (req, res) => {
    const { serviceId } = req.params;
    const baseUrl = RTNM_SERVICES[serviceId];

    if (!baseUrl) {
        return res.status(400).json({
            success: false,
            error: 'Invalid service ID'
        });
    }

    try {
        const start = Date.now();
        await axios.get(`${baseUrl}/health`, { timeout: 5000 });

        res.json({
            success: true,
            data: {
                service: serviceId,
                status: 'online',
                latency: Date.now() - start,
                url: baseUrl,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.json({
            success: true,
            data: {
                service: serviceId,
                status: 'offline',
                url: baseUrl,
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

app.get('/api/services/status', async (req, res) => {
    const statuses = {};

    for (const [name, url] of Object.entries(RTNM_SERVICES)) {
        try {
            await axios.get(`${url}/health`, { timeout: 5000 });
            statuses[name] = { status: 'online', url };
        } catch {
            statuses[name] = { status: 'offline', url };
        }
    }

    res.json({
        success: true,
        data: {
            services: statuses,
            integrationCount: pool ? (await pool.query('SELECT COUNT(*) FROM integrations')).rows[0].count : integrationLog.length
        }
    });
});

// ========================
// INTEGRATION LOGS
// ========================

app.get('/api/integrations/log', async (req, res) => {
    const { limit = 50 } = req.query;

    if (pool) {
        const result = await pool.query(
            'SELECT * FROM integrations ORDER BY created_at DESC LIMIT $1',
            [parseInt(limit)]
        );
        res.json({ success: true, data: result.rows, count: result.rows.length });
    } else {
        const logs = integrationLog.slice(-parseInt(limit)).reverse();
        res.json({ success: true, data: logs, count: logs.length });
    }
});

app.get('/api/integrations/log/:integrationId', async (req, res) => {
    const { integrationId } = req.params;

    if (pool) {
        const result = await pool.query(
            'SELECT * FROM integrations WHERE id = $1',
            [integrationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Integration not found' });
        }

        const actions = await pool.query(
            'SELECT * FROM integration_logs WHERE integration_id = $1 ORDER BY created_at',
            [integrationId]
        );

        res.json({
            success: true,
            data: {
                ...result.rows[0],
                actions: actions.rows
            }
        });
    } else {
        const log = integrationLog.find(l => l.request_id === integrationId);
        if (!log) {
            return res.status(404).json({ success: false, error: 'Integration not found' });
        }
        res.json({ success: true, data: log });
    }
});

// ========================
// MANUAL INTEGRATION TRIGGERS
// ========================

app.post('/api/integrate/wallet', async (req, res) => {
    const { userId, name, email, phone, tenantId } = req.body;

    if (!userId || !email) {
        return res.status(400).json({
            success: false,
            error: 'userId and email are required'
        });
    }

    const result = await callService('rabtul', 'post', '/api/wallet/create', {
        userId,
        name,
        email,
        phone,
        type: 'user',
        metadata: { tenantId, source: 'manual' }
    });

    if (result.success) {
        logger.info('Manual wallet created', { userId });
        res.json({
            success: true,
            data: result.data
        });
    } else {
        res.status(500).json({
            success: false,
            error: result.error
        });
    }
});

app.post('/api/integrate/safeqr', async (req, res) => {
    const { userId, name, email, phone, type, tenantId } = req.body;

    if (!userId || !email) {
        return res.status(400).json({
            success: false,
            error: 'userId and email are required'
        });
    }

    const result = await callService('safeqr', 'post', '/api/safety/badge/create', {
        userId,
        name,
        email,
        phone,
        type: type || 'employee',
        tenantId
    });

    if (result.success) {
        logger.info('Manual SafeQR badge created', { userId });
        res.json({
            success: true,
            data: result.data
        });
    } else {
        res.status(500).json({
            success: false,
            error: result.error
        });
    }
});

app.post('/api/integrate/nexha', async (req, res) => {
    const { name, email, phone, type, metadata } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            success: false,
            error: 'name and email are required'
        });
    }

    const result = await callService('nexha', 'post', '/api/entities', {
        type: type || 'person',
        name,
        email,
        phone,
        metadata
    });

    if (result.success) {
        logger.info('Manual Nexha identity created', { email });
        res.json({
            success: true,
            data: result.data
        });
    } else {
        res.status(500).json({
            success: false,
            error: result.error
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'RTMN CorpPerks→RABTUL Integration',
        version: '2.0.0',
        database: pool ? 'connected' : 'in-memory',
        services: Object.keys(RTNM_SERVICES),
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3010;

const start = async () => {
    await connectDB();

    logger.info('RTNM Service URLs:', RTNM_SERVICES);

    app.listen(PORT, () => {
        logger.info(`🔗 CorpPerks→RABTUL Integration v2.0 running on port ${PORT}`);
        logger.info(`📖 API: http://localhost:${PORT}/api`);
    });
};

start();

module.exports = app;