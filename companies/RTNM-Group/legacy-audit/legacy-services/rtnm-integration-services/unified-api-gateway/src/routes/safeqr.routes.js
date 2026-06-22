/**
 * SafeQR Routes
 * Routes requests to SafeQR services
 */

const express = require('express');
const axios = require('axios');
const { EventBus } = require('../services/event-bus.service');

const router = express.Router();
const eventBus = new EventBus();

const SAFEQR_BASE_URL = process.env.SAFEQR_URL || 'http://localhost:4001';

// Generate QR code
router.post('/qr/generate', async (req, res) => {
    try {
        const { type, entityId, metadata } = req.body;

        if (!type || !entityId) {
            return res.status(400).json({
                success: false,
                error: 'Type and entityId required'
            });
        }

        const response = await axios.post(
            `${SAFEQR_BASE_URL}/api/qr/generate`,
            { type, entityId, metadata },
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
                product: 'safeqr'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'QR generation failed'
        });
    }
});

// Verify QR code
router.post('/qr/verify', async (req, res) => {
    try {
        const { qrCode } = req.body;

        if (!qrCode) {
            return res.status(400).json({
                success: false,
                error: 'QR code required'
            });
        }

        const response = await axios.post(
            `${SAFEQR_BASE_URL}/api/qr/verify`,
            { qrCode },
            {
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        // Emit scan event
        await eventBus.emit('safeqr.qr.scanned', {
            qrCode,
            result: response.data,
            userId: req.user.id,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'safeqr'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'QR verification failed'
        });
    }
});

// Register warranty
router.post('/warranty/register', async (req, res) => {
    try {
        const { qrCode, productId, purchaseDate, warrantyMonths } = req.body;

        const response = await axios.post(
            `${SAFEQR_BASE_URL}/api/warranty/register`,
            { qrCode, productId, purchaseDate, warrantyMonths },
            {
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        // Emit warranty event
        await eventBus.emit('safeqr.warranty.registered', {
            qrCode,
            productId,
            userId: req.user.id
        });

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'safeqr'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Warranty registration failed'
        });
    }
});

// Get warranty status
router.get('/warranty/:qrCode', async (req, res) => {
    try {
        const { qrCode } = req.params;

        const response = await axios.get(
            `${SAFEQR_BASE_URL}/api/warranty/${qrCode}`,
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
                product: 'safeqr'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Warranty lookup failed'
        });
    }
});

// Safety alert
router.post('/safety/alert', async (req, res) => {
    try {
        const { type, location, userId } = req.body;

        if (!type) {
            return res.status(400).json({
                success: false,
                error: 'Alert type required'
            });
        }

        const response = await axios.post(
            `${SAFEQR_BASE_URL}/api/safety/alert`,
            { type, location, userId: userId || req.user.id },
            {
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        // Emit safety event
        await eventBus.emit('safeqr.safety.alert', {
            type,
            location,
            userId,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'safeqr'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Safety alert failed'
        });
    }
});

// Batch QR generation
router.post('/qr/batch', async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                error: 'Items array required'
            });
        }

        const response = await axios.post(
            `${SAFEQR_BASE_URL}/api/qr/batch`,
            { items },
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
                product: 'safeqr',
                count: items.length
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Batch QR generation failed'
        });
    }
});

module.exports = router;
