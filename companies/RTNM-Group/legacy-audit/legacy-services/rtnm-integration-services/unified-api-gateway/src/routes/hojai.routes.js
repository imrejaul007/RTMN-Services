/**
 * HOJAI AI Routes
 * Routes requests to HOJAI AI services
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const HOJAI_BASE_URL = process.env.HOJAi_URL || 'http://localhost:4800';

// AI Chat endpoint
router.post('/chat', async (req, res) => {
    try {
        const { message, context, userId } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message required'
            });
        }

        const response = await axios.post(`${HOJAI_BASE_URL}/api/chat`, {
            message,
            context,
            userId: userId || req.user.id
        }, {
            headers: {
                'Authorization': req.headers.authorization,
                'X-Tenant-ID': req.user.tenantId
            },
            timeout: 30000
        });

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'hojai',
                model: 'rtmn-ai',
                latency_ms: response.headers['x-response-time'] || 0
            }
        });
    } catch (error) {
        console.error('HOJAI chat error:', error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.error || 'AI service unavailable'
        });
    }
});

// AI Agent endpoint
router.post('/agent/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const { task, context } = req.body;

        if (!task) {
            return res.status(400).json({
                success: false,
                error: 'Task required'
            });
        }

        const response = await axios.post(
            `${HOJAI_BASE_URL}/api/agents/${agentId}/execute`,
            { task, context },
            {
                headers: {
                    'Authorization': req.headers.authorization,
                    'X-Tenant-ID': req.user.tenantId
                },
                timeout: 60000
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'hojai',
                agent: agentId
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.error || 'Agent execution failed'
        });
    }
});

// Knowledge search
router.post('/search', async (req, res) => {
    try {
        const { query, limit = 10 } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query required'
            });
        }

        const response = await axios.post(
            `${HOJAI_BASE_URL}/api/search`,
            { query, limit },
            {
                headers: {
                    'Authorization': req.headers.authorization,
                    'X-Tenant-ID': req.user.tenantId
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'hojai',
                query
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Search failed'
        });
    }
});

// List available agents
router.get('/agents', async (req, res) => {
    try {
        const { industry, category } = req.query;

        const response = await axios.get(
            `${HOJAI_BASE_URL}/api/agents`,
            {
                params: { industry, category },
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'hojai'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Failed to fetch agents'
        });
    }
});

module.exports = router;
