/**
 * RisnaEstate Real Estate Routes
 * Routes requests to RisnaEstate services
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const RISNAESTATE_BASE_URL = process.env.RISNAESTATE_URL || 'http://localhost:4100';

// Lead Management

// Create lead
router.post('/leads', async (req, res) => {
    try {
        const { name, email, phone, source, propertyType, budget } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Name and phone required'
            });
        }

        const response = await axios.post(
            `${RISNAESTATE_BASE_URL}/api/leads`,
            { name, email, phone, source, propertyType, budget },
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
                product: 'risnaestate'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Lead creation failed'
        });
    }
});

// Get lead
router.get('/leads/:leadId', async (req, res) => {
    try {
        const { leadId } = req.params;

        const response = await axios.get(
            `${RISNAESTATE_BASE_URL}/api/leads/${leadId}`,
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
                product: 'risnaestate'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Lead lookup failed'
        });
    }
});

// Update lead status
router.put('/leads/:leadId/status', async (req, res) => {
    try {
        const { leadId } = req.params;
        const { status, notes } = req.body;

        const response = await axios.put(
            `${RISNAESTATE_BASE_URL}/api/leads/${leadId}/status`,
            { status, notes },
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
                product: 'risnaestate'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Lead update failed'
        });
    }
});

// Property Management

// Create property
router.post('/properties', async (req, res) => {
    try {
        const { name, type, address, price, size, bedrooms, bathrooms } = req.body;

        if (!name || !type || !price) {
            return res.status(400).json({
                success: false,
                error: 'Name, type, and price required'
            });
        }

        const response = await axios.post(
            `${RISNAESTATE_BASE_URL}/api/properties`,
            { name, type, address, price, size, bedrooms, bathrooms },
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
                product: 'risnaestate'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Property creation failed'
        });
    }
});

// Get properties
router.get('/properties', async (req, res) => {
    try {
        const { type, minPrice, maxPrice, location, page = 1, limit = 20 } = req.query;

        const response = await axios.get(
            `${RISNAESTATE_BASE_URL}/api/properties`,
            {
                params: { type, minPrice, maxPrice, location, page, limit },
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'risnaestate'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Property list failed'
        });
    }
});

// Site Visit Booking
router.post('/visits', async (req, res) => {
    try {
        const { leadId, propertyId, date, time } = req.body;

        const response = await axios.post(
            `${RISNAESTATE_BASE_URL}/api/visits`,
            { leadId, propertyId, date, time },
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
                product: 'risnaestate'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Visit booking failed'
        });
    }
});

// Agreement Generation
router.post('/agreements', async (req, res) => {
    try {
        const { leadId, propertyId, terms } = req.body;

        const response = await axios.post(
            `${RISNAESTATE_BASE_URL}/api/agreements`,
            { leadId, propertyId, terms },
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
                product: 'risnaestate'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Agreement generation failed'
        });
    }
});

module.exports = router;
