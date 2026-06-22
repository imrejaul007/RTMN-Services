/**
 * AdBazaar Marketing Routes
 * Routes requests to AdBazaar services
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const ADBAZAAR_BASE_URL = process.env.ADBAZAAR_URL || 'http://localhost:4200';

// Campaign Management

// Create campaign
router.post('/campaigns', async (req, res) => {
    try {
        const { name, type, budget, target, startDate, endDate, platforms } = req.body;

        if (!name || !budget) {
            return res.status(400).json({
                success: false,
                error: 'Name and budget required'
            });
        }

        const response = await axios.post(
            `${ADBAZAAR_BASE_URL}/api/campaigns`,
            { name, type, budget, target, startDate, endDate, platforms },
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
                product: 'adbazaar'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Campaign creation failed'
        });
    }
});

// Get campaign
router.get('/campaigns/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;

        const response = await axios.get(
            `${ADBAZAAR_BASE_URL}/api/campaigns/${campaignId}`,
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
                product: 'adbazaar'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Campaign lookup failed'
        });
    }
});

// List campaigns
router.get('/campaigns', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const response = await axios.get(
            `${ADBAZAAR_BASE_URL}/api/campaigns`,
            {
                params: { status, page, limit },
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
                product: 'adbazaar'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Campaign list failed'
        });
    }
});

// Get campaign analytics
router.get('/campaigns/:campaignId/analytics', async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { startDate, endDate } = req.query;

        const response = await axios.get(
            `${ADBAZAAR_BASE_URL}/api/campaigns/${campaignId}/analytics`,
            {
                params: { startDate, endDate },
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'adbazaar',
                campaignId
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Analytics fetch failed'
        });
    }
});

// Influencer Management

// Find influencers
router.get('/influencers', async (req, res) => {
    try {
        const { category, followers, location, budget } = req.query;

        const response = await axios.get(
            `${ADBAZAAR_BASE_URL}/api/influencers`,
            {
                params: { category, followers, location, budget },
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'adbazaar'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Influencer search failed'
        });
    }
});

// DOOH Screen Management

// List screens
router.get('/screens', async (req, res) => {
    try {
        const { location, status, type } = req.query;

        const response = await axios.get(
            `${ADBAZAAR_BASE_URL}/api/screens`,
            {
                params: { location, status, type },
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'adbazaar'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Screen list failed'
        });
    }
});

// Book screen
router.post('/screens/:screenId/book', async (req, res) => {
    try {
        const { screenId } = req.params;
        const { startTime, duration, content } = req.body;

        const response = await axios.post(
            `${ADBAZAAR_BASE_URL}/api/screens/${screenId}/book`,
            { startTime, duration, content },
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
                product: 'adbazaar',
                screenId
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Screen booking failed'
        });
    }
});

module.exports = router;
