/**
 * RTMN Unified Dashboard
 * Single admin panel for monitoring all RTMN services
 *
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const winston = require('winston');

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
        new winston.transports.File({ filename: 'logs/dashboard.log' })
    ]
});

// Service URLs
const SERVICE_URLS = {
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3000',
    helpCenter: process.env.HELP_CENTER_URL || 'http://localhost:3001',
    hojai: process.env.HOJAi_URL || 'http://localhost:4800',
    rabtul: process.env.RABTUL_URL || 'http://localhost:4005',
    corpperks: process.env.CORPPERKS_URL || 'http://localhost:4700',
    adbazaar: process.env.ADBAZAAR_URL || 'http://localhost:4200',
    safeqr: process.env.SAFEQR_URL || 'http://localhost:4001',
    nexha: process.env.NEXHA_URL || 'http://localhost:4100',
    risacare: process.env.RISACARE_URL || 'http://localhost:4700',
    risnaestate: process.env.RISNAESTATE_URL || 'http://localhost:4100'
};

// Dashboard data cache
let dashboardData = {
    services: [],
    metrics: {},
    alerts: [],
    lastUpdated: null
};

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'RTMN Unified Dashboard',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/dashboard
 * Main dashboard data
 */
app.get('/api/dashboard', async (req, res) => {
    try {
        // Fetch all service statuses
        const serviceChecks = await Promise.allSettled(
            Object.entries(SERVICE_URLS).map(async ([name, url]) => {
                const start = Date.now();
                try {
                    const response = await axios.get(`${url}/health`, { timeout: 5000 });
                    return {
                        name,
                        displayName: formatServiceName(name),
                        status: response.data.status === 'ok' ? 'online' : 'degraded',
                        latency: Date.now() - start,
                        data: response.data
                    };
                } catch {
                    return {
                        name,
                        displayName: formatServiceName(name),
                        status: 'offline',
                        latency: 0,
                        data: null
                    };
                }
            })
        );

        const services = serviceChecks
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        const onlineCount = services.filter(s => s.status === 'online').length;
        const totalCount = services.length;

        dashboardData = {
            services,
            metrics: {
                totalServices: totalCount,
                onlineServices: onlineCount,
                offlineServices: totalCount - onlineCount,
                uptime: `${((onlineCount / totalCount) * 100).toFixed(1)}%`
            },
            lastUpdated: new Date().toISOString()
        };

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/dashboard/services
 * List all services with status
 */
app.get('/api/dashboard/services', async (req, res) => {
    try {
        const { status } = req.query;

        let services = dashboardData.services;

        if (status) {
            services = services.filter(s => s.status === status);
        }

        res.json({
            success: true,
            data: {
                services,
                summary: dashboardData.metrics
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/dashboard/services/:name
 * Get specific service details
 */
app.get('/api/dashboard/services/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const url = SERVICE_URLS[name];

        if (!url) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }

        const start = Date.now();
        const response = await axios.get(`${url}/health`, { timeout: 5000 });

        res.json({
            success: true,
            data: {
                name,
                displayName: formatServiceName(name),
                status: response.data.status === 'ok' ? 'online' : 'degraded',
                latency: Date.now() - start,
                details: response.data
            }
        });
    } catch (error) {
        res.json({
            success: true,
            data: {
                name: req.params.name,
                displayName: formatServiceName(req.params.name),
                status: 'offline',
                error: error.message
            }
        });
    }
});

/**
 * GET /api/dashboard/metrics
 * Aggregated metrics from all services
 */
app.get('/api/dashboard/metrics', async (req, res) => {
    try {
        // In production, fetch real metrics from each service
        const metrics = {
            api: {
                requests: Math.floor(Math.random() * 10000) + 5000,
                errors: Math.floor(Math.random() * 50),
                latency: Math.floor(Math.random() * 100) + 20
            },
            users: {
                active: Math.floor(Math.random() * 1000) + 500,
                new: Math.floor(Math.random() * 100) + 50,
                retention: Math.floor(Math.random() * 20) + 80
            },
            revenue: {
                monthly: Math.floor(Math.random() * 1000000) + 500000,
                growth: Math.floor(Math.random() * 30) + 5,
                mrr: Math.floor(Math.random() * 100000) + 50000
            },
            products: {
                hojai: { users: Math.floor(Math.random() * 500) + 100, requests: Math.floor(Math.random() * 10000) },
                rabtul: { transactions: Math.floor(Math.random() * 100000) + 10000, volume: Math.floor(Math.random() * 10000000) },
                corpperks: { employees: Math.floor(Math.random() * 5000) + 1000, companies: Math.floor(Math.random() * 500) + 100 },
                adbazaar: { campaigns: Math.floor(Math.random() * 500) + 100, impressions: Math.floor(Math.random() * 1000000) }
            }
        };

        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/dashboard/alerts
 * System alerts
 */
app.get('/api/dashboard/alerts', async (req, res) => {
    // Generate sample alerts
    const alerts = [];

    // Check for offline services
    const offlineServices = dashboardData.services.filter(s => s.status === 'offline');
    if (offlineServices.length > 0) {
        alerts.push({
            type: 'error',
            title: `${offlineServices.length} service(s) offline`,
            message: offlineServices.map(s => s.displayName).join(', '),
            timestamp: new Date().toISOString()
        });
    }

    // Random info alerts
    if (Math.random() > 0.7) {
        alerts.push({
            type: 'info',
            title: 'New user signup',
            message: '10 new users registered today',
            timestamp: new Date().toISOString()
        });
    }

    // Performance alerts
    const slowServices = dashboardData.services.filter(s => s.latency > 500);
    if (slowServices.length > 0) {
        alerts.push({
            type: 'warning',
            title: 'High latency detected',
            message: `${slowServices.length} service(s) running slow`,
            timestamp: new Date().toISOString()
        });
    }

    res.json({
        success: true,
        data: alerts
    });
});

/**
 * GET /api/dashboard/activity
 * Recent activity log
 */
app.get('/api/dashboard/activity', async (req, res) => {
    const activities = [
        { type: 'user', action: 'New signup', target: 'Priya Sharma', time: '2 min ago' },
        { type: 'payment', action: 'Payment received', target: '₹50,000', time: '5 min ago' },
        { type: 'integration', action: 'Employee onboarded', target: 'Acme Corp', time: '10 min ago' },
        { type: 'campaign', action: 'Campaign launched', target: 'Summer Sale', time: '15 min ago' },
        { type: 'api', action: 'High traffic', target: 'HOJAI AI', time: '20 min ago' },
        { type: 'user', action: 'Plan upgraded', target: 'HDFC Bank', time: '30 min ago' },
        { type: 'payment', action: 'Invoice generated', target: '₹2,50,000', time: '1 hour ago' },
        { type: 'integration', action: 'API connected', target: 'Salesforce', time: '2 hours ago' }
    ];

    res.json({
        success: true,
        data: activities
    });
});

/**
 * GET /api/dashboard/health
 * Overall system health
 */
app.get('/api/dashboard/health', async (req, res) => {
    const services = dashboardData.services;
    const onlineCount = services.filter(s => s.status === 'online').length;
    const totalCount = services.length;

    let health = 'healthy';
    if (onlineCount === 0) {
        health = 'down';
    } else if (onlineCount < totalCount) {
        health = 'degraded';
    }

    res.json({
        success: true,
        data: {
            health,
            score: Math.round((onlineCount / totalCount) * 100),
            services: {
                total: totalCount,
                online: onlineCount,
                offline: totalCount - onlineCount
            },
            timestamp: new Date().toISOString()
        }
    });
});

/**
 * POST /api/dashboard/refresh
 * Force refresh dashboard data
 */
app.post('/api/dashboard/refresh', async (req, res) => {
    try {
        // Re-fetch all service statuses
        const serviceChecks = await Promise.allSettled(
            Object.entries(SERVICE_URLS).map(async ([name, url]) => {
                const start = Date.now();
                try {
                    const response = await axios.get(`${url}/health`, { timeout: 5000 });
                    return {
                        name,
                        displayName: formatServiceName(name),
                        status: response.data.status === 'ok' ? 'online' : 'degraded',
                        latency: Date.now() - start
                    };
                } catch {
                    return {
                        name,
                        displayName: formatServiceName(name),
                        status: 'offline',
                        latency: 0
                    };
                }
            })
        );

        dashboardData.services = serviceChecks
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        dashboardData.lastUpdated = new Date().toISOString();

        res.json({
            success: true,
            message: 'Dashboard refreshed',
            data: dashboardData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Format service name for display
 */
function formatServiceName(name) {
    const names = {
        apiGateway: 'API Gateway',
        helpCenter: 'Help Center',
        hojai: 'HOJAI AI',
        rabtul: 'RABTUL Payments',
        corpperks: 'CorpPerks HRMS',
        adbazaar: 'AdBazaar Marketing',
        safeqr: 'SafeQR',
        nexha: 'Nexha Identity',
        risacare: 'RisaCare Healthcare',
        risnaestate: 'RisnaEstate RE'
    };
    return names[name] || name;
}

const PORT = process.env.PORT || 3012;

app.listen(PORT, () => {
    logger.info(`📊 RTMN Unified Dashboard running on port ${PORT}`);
    logger.info(`🔗 Services monitored: ${Object.keys(SERVICE_URLS).length}`);
});

module.exports = app;