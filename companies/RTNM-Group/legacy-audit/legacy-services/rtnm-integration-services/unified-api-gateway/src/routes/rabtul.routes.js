/**
 * RABTUL Payment Routes
 * Routes requests to RABTUL payment services
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const RABTUL_BASE_URL = process.env.RABTUL_URL || 'http://localhost:4005';

// Create payment
router.post('/payments', async (req, res) => {
    try {
        const { amount, currency, orderId, customer, metadata } = req.body;

        if (!amount || !orderId) {
            return res.status(400).json({
                success: false,
                error: 'Amount and orderId required'
            });
        }

        const response = await axios.post(
            `${RABTUL_BASE_URL}/api/payments/create`,
            { amount, currency: currency || 'INR', orderId, customer, metadata },
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
                product: 'rabtul'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.error || 'Payment creation failed'
        });
    }
});

// Verify payment
router.get('/payments/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;

        const response = await axios.get(
            `${RABTUL_BASE_URL}/api/payments/${paymentId}`,
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
                product: 'rabtul'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Payment lookup failed'
        });
    }
});

// Create wallet
router.post('/wallet', async (req, res) => {
    try {
        const { userId, name, email, phone } = req.body;

        const response = await axios.post(
            `${RABTUL_BASE_URL}/api/wallet/create`,
            { userId, name, email, phone },
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
                product: 'rabtul'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Wallet creation failed'
        });
    }
});

// Get wallet balance
router.get('/wallet/:walletId', async (req, res) => {
    try {
        const { walletId } = req.params;

        const response = await axios.get(
            `${RABTUL_BASE_URL}/api/wallet/${walletId}/balance`,
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
                product: 'rabtul'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Balance lookup failed'
        });
    }
});

// Add to wallet
router.post('/wallet/:walletId/topup', async (req, res) => {
    try {
        const { walletId } = req.params;
        const { amount, source } = req.body;

        const response = await axios.post(
            `${RABTUL_BASE_URL}/api/wallet/${walletId}/topup`,
            { amount, source },
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
                product: 'rabtul'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Topup failed'
        });
    }
});

// Transfer between wallets
router.post('/wallet/transfer', async (req, res) => {
    try {
        const { fromWalletId, toWalletId, amount, reason } = req.body;

        const response = await axios.post(
            `${RABTUL_BASE_URL}/api/wallet/transfer`,
            { fromWalletId, toWalletId, amount, reason },
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
                product: 'rabtul'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Transfer failed'
        });
    }
});

// BNPL - Create order
router.post('/bnpl/order', async (req, res) => {
    try {
        const { amount, customerId, tenure } = req.body;

        const response = await axios.post(
            `${RABTUL_BASE_URL}/api/bnpl/create`,
            { amount, customerId, tenure: tenure || 3 },
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
                product: 'rabtul'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'BNPL order failed'
        });
    }
});

module.exports = router;
