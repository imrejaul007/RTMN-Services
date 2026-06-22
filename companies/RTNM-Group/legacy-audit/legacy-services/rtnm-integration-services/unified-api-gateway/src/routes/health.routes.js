/**
 * Health Check Routes
 */

const express = require('express');
const router = express.Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'RTMN Unified API Gateway',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /health/live
 * Liveness probe (for Kubernetes)
 */
router.get('/live', (req, res) => {
    res.json({
        status: 'alive',
        uptime: process.uptime()
    });
});

/**
 * GET /health/ready
 * Readiness probe (for Kubernetes)
 */
router.get('/ready', async (req, res) => {
    try {
        // Check dependencies
        const checks = {
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            timestamp: Date.now()
        };

        // Check if memory usage is acceptable (< 90%)
        const memoryUsage = (checks.memory.heapUsed / checks.memory.heapTotal) * 100;
        const isHealthy = memoryUsage < 90;

        if (isHealthy) {
            res.json({
                status: 'ready',
                checks,
                memoryUsage: `${memoryUsage.toFixed(2)}%`
            });
        } else {
            res.status(503).json({
                status: 'not ready',
                reason: 'Memory usage too high',
                memoryUsage: `${memoryUsage.toFixed(2)}%`
            });
        }
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message
        });
    }
});

/**
 * GET /health/services
 * Check all service statuses
 */
router.get('/services', async (req, res) => {
    try {
        // In production, check actual service health
        const services = [
            { name: 'hojai', status: 'online', latency: Math.random() * 100 },
            { name: 'rabtul', status: 'online', latency: Math.random() * 100 },
            { name: 'corpperks', status: 'online', latency: Math.random() * 100 },
            { name: 'adbazaar', status: 'online', latency: Math.random() * 100 },
            { name: 'safeqr', status: 'online', latency: Math.random() * 100 },
            { name: 'nexha', status: 'online', latency: Math.random() * 100 },
            { name: 'risacare', status: 'online', latency: Math.random() * 100 },
            { name: 'risnaestate', status: 'online', latency: Math.random() * 100 }
        ];

        const onlineCount = services.filter(s => s.status === 'online').length;

        res.json({
            status: onlineCount === services.length ? 'all_online' : 'degraded',
            total: services.length,
            online: onlineCount,
            services
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;
