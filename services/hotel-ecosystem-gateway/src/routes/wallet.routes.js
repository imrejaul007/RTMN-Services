/**
 * Wallet Routes - Unified wallet across StayOwn and REZ
 */

import express from 'express';
import axios from 'axios';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const STAYOWN_API_URL = process.env.STAYOWN_API_URL || 'http://localhost:3000';
const REZ_WALLET_URL = process.env.REZ_WALLET_URL || 'http://localhost:4004';

/**
 * GET /api/wallet/:userId
 * Get user wallet balance
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get from REZ Wallet (primary)
    const response = await axios.get(`${REZ_WALLET_URL}/api/wallet/${userId}`, {
      timeout: 5000
    });

    res.json({
      success: true,
      wallet: response.data
    });
  } catch (err) {
    logger.error('Error getting wallet:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/wallet/:userId/coins/earn
 * Earn coins (e.g., from booking)
 */
router.post('/:userId/coins/earn', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason, bookingId, source } = req.body;

    // Earn in REZ Wallet
    const response = await axios.post(`${REZ_WALLET_URL}/api/wallet/${userId}/earn`, {
      amount,
      reason,
      bookingId,
      source: source || 'hotel-ecosystem'
    }, { timeout: 10000 });

    // Also sync to StayOwn
    try {
      await axios.post(`${STAYOWN_API_URL}/v1/wallet/${userId}/earn`, {
        amount,
        reason,
        bookingId
      });
    } catch (syncErr) {
      logger.warn('Failed to sync earn to StayOwn:', syncErr.message);
    }

    res.json({
      success: true,
      transaction: response.data
    });
  } catch (err) {
    logger.error('Error earning coins:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/wallet/:userId/coins/burn
 * Burn coins (e.g., for redemption)
 */
router.post('/:userId/coins/burn', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason, orderId, source } = req.body;

    const response = await axios.post(`${REZ_WALLET_URL}/api/wallet/${userId}/burn`, {
      amount,
      reason,
      orderId,
      source: source || 'hotel-ecosystem'
    }, { timeout: 10000 });

    // Sync to StayOwn
    try {
      await axios.post(`${STAYOWN_API_URL}/v1/wallet/${userId}/burn`, {
        amount,
        reason,
        orderId
      });
    } catch (syncErr) {
      logger.warn('Failed to sync burn to StayOwn:', syncErr.message);
    }

    res.json({
      success: true,
      transaction: response.data
    });
  } catch (err) {
    logger.error('Error burning coins:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/wallet/:userId/transactions
 * Get transaction history
 */
router.get('/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit, offset, type } = req.query;

    const response = await axios.get(`${REZ_WALLET_URL}/api/wallet/${userId}/transactions`, {
      params: { limit: limit || 20, offset: offset || 0, type },
      timeout: 5000
    });

    res.json({
      success: true,
      transactions: response.data
    });
  } catch (err) {
    logger.error('Error getting transactions:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/wallet/:userId/payment
 * Process hotel payment
 */
router.post('/:userId/payment', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, bookingId, paymentMethod, useCoins } = req.body;

    // Process payment via StayOwn
    const response = await axios.post(`${STAYOWN_API_URL}/v1/payments/hotel`, {
      userId,
      amount,
      bookingId,
      paymentMethod,
      useCoins
    }, { timeout: 15000 });

    res.json({
      success: true,
      payment: response.data
    });
  } catch (err) {
    logger.error('Error processing payment:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

export default router;
