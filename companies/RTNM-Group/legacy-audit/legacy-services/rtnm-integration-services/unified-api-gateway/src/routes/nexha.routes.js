/**
 * Nexha Identity Routes
 * Routes requests to Nexha identity graph services
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const NEXHA_BASE_URL = process.env.NEXHA_URL || 'http://localhost:4100';

// Create entity
router.post('/entities', async (req, res) => {
    try {
        const { type, name, email, phone, metadata } = req.body;

        if (!type || !name) {
            return res.status(400).json({
                success: false,
                error: 'Type and name required'
            });
        }

        const response = await axios.post(
            `${NEXHA_BASE_URL}/api/entities`,
            { type, name, email, phone, metadata },
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
                product: 'nexha'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Entity creation failed'
        });
    }
});

// Get entity
router.get('/entities/:entityId', async (req, res) => {
    try {
        const { entityId } = req.params;

        const response = await axios.get(
            `${NEXHA_BASE_URL}/api/entities/${entityId}`,
            {
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'nexha'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Entity lookup failed'
        });
    }
});

// Link entities
router.post('/entities/:entityId/link', async (req, res) => {
    try {
        const { entityId } = req.params;
        const { targetId, relationship, metadata } = req.body;

        const response = await axios.post(
            `${NEXHA_BASE_URL}/api/entities/${entityId}/link`,
            { targetId, relationship, metadata },
            {
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'nexha'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Entity linking failed'
        });
    }
});

// Get trust score
router.get('/trust/:entityId', async (req, res) => {
    try {
        const { entityId } = req.params;

        const response = await axios.get(
            `${NEXHA_BASE_URL}/api/trust/${entityId}`,
            {
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'nexha'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Trust score lookup failed'
        });
    }
});

// Search entities
router.post('/search', async (req, res) => {
    try {
        const { query, type, limit = 20 } = req.body;

        const response = await axios.post(
            `${NEXHA_BASE_URL}/api/search`,
            { query, type, limit },
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
                product: 'nexha'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Search failed'
        });
    }
});

module.exports = router;
