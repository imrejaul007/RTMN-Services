/**
 * RTMN Integration Service
 * Connects all RTMN products to unified gateway
 *
 * This service maps RTMN gateway URLs to actual RTNM ecosystem services
 *
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid').v4;

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

// ============================================
// SERVICE URLS - CONNECTED TO REAL RTNM ECOSYSTEM
// ============================================

const SERVICES = {
    // HOJAI AI - AI Platform
    hojai: {
        name: 'HOJAI AI',
        description: 'AI Platform with 600+ agents',
        baseUrl: process.env.HOJAi_URL || 'http://localhost:4800',
        healthEndpoint: '/health',
        routes: ['/chat', '/agent', '/search', '/agents'],
        connected: false
    },

    // RABTUL - Payment Infrastructure
    rabtul: {
        name: 'RABTUL Payments',
        description: 'Payment infrastructure - UPI, Cards, Wallet, BNPL',
        baseUrl: process.env.RABTUL_URL || 'http://localhost:4005',
        healthEndpoint: '/health',
        routes: ['/payments', '/wallet', '/bnpl'],
        connected: false
    },

    // CorpPerks - HRMS
    corpperks: {
        name: 'CorpPerks HRMS',
        description: 'Complete HR - Payroll, Attendance, Onboarding',
        baseUrl: process.env.CORPPERKS_URL || 'http://localhost:4700',
        healthEndpoint: '/health',
        routes: ['/employees', '/payroll', '/attendance'],
        connected: false
    },

    // AdBazaar - Marketing
    adbazaar: {
        name: 'AdBazaar Marketing',
        description: 'Marketing automation - Campaigns, Influencers, DOOH',
        baseUrl: process.env.ADBAZAAR_URL || 'http://localhost:4200',
        healthEndpoint: '/health',
        routes: ['/campaigns', '/influencers', '/screens'],
        connected: false
    },

    // SafeQR - Safety & Verification
    safeqr: {
        name: 'SafeQR',
        description: 'Safety, Verification, Loyalty QR codes',
        baseUrl: process.env.SAFEQR_URL || 'http://localhost:4001',
        healthEndpoint: '/health',
        routes: ['/qr', '/warranty', '/safety'],
        connected: false
    },

    // Nexha - Identity
    nexha: {
        name: 'Nexha Identity',
        description: 'Universal identity graph and trust scoring',
        baseUrl: process.env.NEXHA_URL || 'http://localhost:4100',
        healthEndpoint: '/health',
        routes: ['/entities', '/trust', '/search'],
        connected: false
    },

    // RisaCare - Healthcare
    risacare: {
        name: 'RisaCare Healthcare',
        description: 'Healthcare OS - Patients, Appointments, Records',
        baseUrl: process.env.RISACARE_URL || 'http://localhost:4700',
        healthEndpoint: '/health',
        routes: ['/patients', '/appointments', '/records'],
        connected: false
    },

    // RisnaEstate - Real Estate
    risnaestate: {
        name: 'RisnaEstate',
        description: 'Real Estate CRM - Leads, Properties, Site Visits',
        baseUrl: process.env.RISNAESTATE_URL || 'http://localhost:4100',
        healthEndpoint: '/health',
        routes: ['/leads', '/properties', '/visits'],
        connected: false
    },

    // AssetMind - Financial Intelligence
    assetmind: {
        name: 'AssetMind',
        description: 'Financial Intelligence - Bloomberg competitor',
        baseUrl: process.env.ASSETMIND_URL || 'http://localhost:5001',
        healthEndpoint: '/health',
        routes: ['/assets', '/portfolios', '/predictions'],
        connected: false
    },

    // LawGens - Legal AI
    lawgens: {
        name: 'LawGens Legal',
        description: 'Legal AI - Harvey AI competitor',
        baseUrl: process.env.LAWGENS_URL || 'http://localhost:5099',
        healthEndpoint: '/health',
        routes: ['/contracts', '/research', '/compliance'],
        connected: false
    },

    // HIB - Security Intelligence
    hib: {
        name: 'HIB Security',
        description: 'Security Intelligence - Palantir + CrowdStrike competitor',
        baseUrl: process.env.HIB_URL || 'http://localhost:3055',
        healthEndpoint: '/health',
        routes: ['/threats', '/alerts', '/cases'],
        connected: false
    }
};

// Integration mappings
const INTEGRATIONS = {
    corpperks_rabtul: {
        name: 'CorpPerks → RABTUL',
        description: 'Employee created → Wallet auto-created',
        source: 'corpperks',
        targets: ['rabtul', 'safeqr', 'nexha'],
        autoTrigger: true
    },
    adbazaar_hojai: {
        name: 'AdBazaar → HOJAI',
        description: 'Campaign performance → AI optimization',
        source: 'adbazaar',
        targets: ['hojai'],
        autoTrigger: false
    },
    safeqr_rabtul: {
        name: 'SafeQR → RABTUL',
        description: 'QR scan → Loyalty points awarded',
        source: 'safeqr',
        targets: ['rabtul'],
        autoTrigger: true
    },
    risacare_rabtul: {
        name: 'RisaCare → RABTUL',
        description: 'Patient payment → Wallet debit',
        source: 'risacare',
        targets: ['rabtul'],
        autoTrigger: false
    }
};

// Connection history
const connectionHistory = [];

app.use(express.json());

// ============================================
// HEALTH & STATUS
// ============================================

/**
 * GET /health
 * Basic health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'RTMN Integration Service',
        version: '1.0.0',
        servicesConfigured: Object.keys(SERVICES).length,
        integrationsConfigured: Object.keys(INTEGRATIONS).length,
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/services
 * List all services and their status
 */
app.get('/api/services', async (req, res) => {
    const results = await Promise.allSettled(
        Object.entries(SERVICES).map(async ([key, service]) => {
            try {
                const response = await axios.get(
                    `${service.baseUrl}${service.healthEndpoint}`,
                    { timeout: 5000 }
                );
                return {
                    id: key,
                    ...service,
                    status: 'connected',
                    responseTime: response.headers['x-response-time'] || 0,
                    connected: true
                };
            } catch (error) {
                return {
                    id: key,
                    ...service,
                    status: 'disconnected',
                    error: error.message,
                    connected: false
                };
            }
        })
    );

    const services = results.map(r => r.status === 'fulfilled' ? r.value : { id: r.reason?.id, error: r.reason?.message });

    res.json({
        success: true,
        data: {
            total: services.length,
            connected: services.filter(s => s.connected).length,
            services
        }
    });
});

/**
 * GET /api/services/:serviceId
 * Get specific service details
 */
app.get('/api/services/:serviceId', async (req, res) => {
    const { serviceId } = req.params;
    const service = SERVICES[serviceId];

    if (!service) {
        return res.status(404).json({
            success: false,
            error: 'Service not found'
        });
    }

    try {
        const response = await axios.get(
            `${service.baseUrl}${service.healthEndpoint}`,
            { timeout: 5000 }
        );

        res.json({
            success: true,
            data: {
                ...service,
                status: 'connected',
                response: response.data,
                connected: true
            }
        });
    } catch (error) {
        res.json({
            success: true,
            data: {
                ...service,
                status: 'disconnected',
                error: error.message,
                connected: false
            }
        });
    }
});

/**
 * POST /api/services/:serviceId/configure
 * Update service configuration
 */
app.post('/api/services/:serviceId/configure', (req, res) => {
    const { serviceId } = req.params;
    const { baseUrl, apiKey } = req.body;

    if (!SERVICES[serviceId]) {
        return res.status(404).json({
            success: false,
            error: 'Service not found'
        });
    }

    if (baseUrl) {
        SERVICES[serviceId].baseUrl = baseUrl;
    }

    if (apiKey) {
        SERVICES[serviceId].apiKey = apiKey;
    }

    logger.info({
        type: 'service_configured',
        serviceId,
        baseUrl: SERVICES[serviceId].baseUrl
    });

    res.json({
        success: true,
        data: SERVICES[serviceId]
    });
});

// ============================================
// INTEGRATIONS
// ============================================

/**
 * GET /api/integrations
 * List all integrations
 */
app.get('/api/integrations', (req, res) => {
    res.json({
        success: true,
        data: {
            total: Object.keys(INTEGRATIONS).length,
            integrations: Object.entries(INTEGRATIONS).map(([key, value]) => ({
                id: key,
                ...value
            }))
        }
    });
});

/**
 * POST /api/integrations/:integrationId/trigger
 * Manually trigger an integration
 */
app.post('/api/integrations/:integrationId/trigger', async (req, res) => {
    const { integrationId } = req.params;
    const integration = INTEGRATIONS[integrationId];

    if (!integration) {
        return res.status(404).json({
            success: false,
            error: 'Integration not found'
        });
    }

    const { sourceData, targetData } = req.body;
    const traceId = uuidv4();

    logger.info({
        type: 'integration_triggered',
        integrationId,
        traceId
    });

    res.json({
        success: true,
        data: {
            integrationId,
            traceId,
            status: 'triggered',
            message: `${integration.name} triggered manually`
        }
    });
});

/**
 * GET /api/integrations/history
 * Get integration history
 */
app.get('/api/integrations/history', (req, res) => {
    const { limit = 50 } = req.query;
    res.json({
        success: true,
        data: connectionHistory.slice(-parseInt(limit)).reverse()
    });
});

// ============================================
// CONNECTIVITY TEST
// ============================================

/**
 * POST /api/connect
 * Test connection to a service
 */
app.post('/api/connect', async (req, res) => {
    const { serviceId, url } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL is required'
        });
    }

    const testUrl = url.endsWith('/health') ? url : `${url}/health`;
    const startTime = Date.now();

    try {
        const response = await axios.get(testUrl, { timeout: 10000 });
        const latency = Date.now() - startTime;

        // Record connection
        const record = {
            serviceId,
            url,
            status: 'success',
            latency,
            timestamp: new Date().toISOString()
        };
        connectionHistory.push(record);
        if (connectionHistory.length > 1000) connectionHistory.shift();

        logger.info({
            type: 'connection_success',
            serviceId,
            url,
            latency
        });

        res.json({
            success: true,
            data: record,
            response: response.data
        });
    } catch (error) {
        const record = {
            serviceId,
            url,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        };
        connectionHistory.push(record);

        logger.error({
            type: 'connection_failed',
            serviceId,
            url,
            error: error.message
        });

        res.status(400).json({
            success: false,
            data: record
        });
    }
});

/**
 * POST /api/connect/all
 * Test all configured services
 */
app.post('/api/connect/all', async (req, res) => {
    const results = await Promise.allSettled(
        Object.entries(SERVICES).map(async ([key, service]) => {
            const startTime = Date.now();
            try {
                await axios.get(
                    `${service.baseUrl}${service.healthEndpoint}`,
                    { timeout: 5000 }
                );
                service.connected = true;
                return {
                    id: key,
                    status: 'connected',
                    latency: Date.now() - startTime
                };
            } catch {
                service.connected = false;
                return {
                    id: key,
                    status: 'disconnected',
                    error: 'Service unreachable'
                };
            }
        })
    );

    const summary = {
        total: results.length,
        connected: results.filter(r => r.status === 'fulfilled' && r.value.status === 'connected').length
    };

    res.json({
        success: true,
        data: {
            summary,
            results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message })
        }
    });
});

// ============================================
// FORWARD PROXY
// ============================================

/**
 * Forward requests to specific services
 */
app.all('/api/proxy/:serviceId/*', async (req, res) => {
    const { serviceId } = req.params;
    const service = SERVICES[serviceId];

    if (!service) {
        return res.status(404).json({
            success: false,
            error: 'Service not found'
        });
    }

    const path = req.params[0];
    const targetUrl = `${service.baseUrl}/${path}`;

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: {
                ...req.headers,
                'X-RTMN-Proxy': 'true',
                'X-RTMN-Service': serviceId,
                'X-Request-ID': req.headers['x-request-id'] || uuidv4()
            },
            timeout: 30000
        });

        res.json({
            success: true,
            data: response.data,
            meta: {
                service: serviceId,
                proxiedFrom: targetUrl
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.message,
            proxiedFrom: targetUrl
        });
    }
});

// ============================================
// SERVICE REGISTRY
// ============================================

/**
 * GET /api/registry
 * Get complete service registry
 */
app.get('/api/registry', (req, res) => {
    res.json({
        success: true,
        data: {
            services: SERVICES,
            integrations: INTEGRATIONS,
            lastUpdated: new Date().toISOString()
        }
    });
});

/**
 * POST /api/registry/service
 * Register a new service
 */
app.post('/api/registry/service', (req, res) => {
    const { id, name, description, baseUrl, routes } = req.body;

    if (!id || !name || !baseUrl) {
        return res.status(400).json({
            success: false,
            error: 'ID, name, and baseUrl are required'
        });
    }

    SERVICES[id] = {
        name,
        description: description || '',
        baseUrl,
        healthEndpoint: '/health',
        routes: routes || [],
        connected: false
    };

    logger.info({
        type: 'service_registered',
        serviceId: id,
        baseUrl
    });

    res.status(201).json({
        success: true,
        data: SERVICES[id]
    });
});

/**
 * DELETE /api/registry/service/:serviceId
 * Remove a service from registry
 */
app.delete('/api/registry/service/:serviceId', (req, res) => {
    const { serviceId } = req.params;

    if (!SERVICES[serviceId]) {
        return res.status(404).json({
            success: false,
            error: 'Service not found'
        });
    }

    delete SERVICES[serviceId];

    logger.info({
        type: 'service_removed',
        serviceId
    });

    res.json({
        success: true,
        message: `Service ${serviceId} removed from registry`
    });
});

const PORT = process.env.PORT || 3018;

app.listen(PORT, () => {
    logger.info(`🔗 RTMN Integration Service running on port ${PORT}`);
    logger.info(`📋 ${Object.keys(SERVICES).length} services configured`);
    logger.info(`🔄 ${Object.keys(INTEGRATIONS).length} integrations configured`);
});

module.exports = app;
