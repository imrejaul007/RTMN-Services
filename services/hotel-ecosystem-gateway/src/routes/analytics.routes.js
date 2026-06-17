/**
 * Analytics Routes - Aggregated analytics from all systems
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

const HOTEL_OS_URL = process.env.HOTEL_OS_URL || 'http://localhost:5025';
const REZ_MIND_HOTEL_URL = process.env.REZ_MIND_HOTEL_URL || 'http://localhost:4017';
const STAYOWN_API_URL = process.env.STAYOWN_API_URL || 'http://localhost:3000';

/**
 * GET /api/analytics/dashboard
 * Get unified hotel dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { hotelId, period } = req.query;

    // Fetch from RTMN Hotel OS (primary for ops metrics)
    const [hotelOsRes, stayownRes] = await Promise.allSettled([
      axios.get(`${HOTEL_OS_URL}/api/analytics/dashboard`, {
        params: { hotelId, period: period || '7d' },
        timeout: 5000
      }),
      axios.get(`${STAYOWN_API_URL}/v1/analytics/dashboard`, {
        params: { hotelId, period },
        timeout: 5000
      })
    ]);

    res.json({
      success: true,
      dashboard: {
        operations: hotelOsRes.status === 'fulfilled' ? hotelOsRes.value.data : null,
        booking: stayownRes.status === 'fulfilled' ? stayownRes.value.data : null,
        unified: mergeDashboard(
          hotelOsRes.status === 'fulfilled' ? hotelOsRes.value.data : {},
          stayownRes.status === 'fulfilled' ? stayownRes.value.data : {}
        )
      }
    });
  } catch (err) {
    logger.error('Error getting dashboard:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/revpar
 * Get RevPAR metrics
 */
router.get('/revpar', async (req, res) => {
  try {
    const { hotelId, period } = req.query;

    const response = await axios.get(`${HOTEL_OS_URL}/api/analytics/revpar`, {
      params: { hotelId, period: period || '30d' },
      timeout: 5000
    });

    res.json({
      success: true,
      revpar: response.data
    });
  } catch (err) {
    logger.error('Error getting RevPAR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/occupancy
 * Get occupancy rates
 */
router.get('/occupancy', async (req, res) => {
  try {
    const { hotelId, period } = req.query;

    const response = await axios.get(`${HOTEL_OS_URL}/api/analytics/occupancy`, {
      params: { hotelId, period: period || '30d' },
      timeout: 5000
    });

    res.json({
      success: true,
      occupancy: response.data
    });
  } catch (err) {
    logger.error('Error getting occupancy:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/booking-trends
 * Get booking trends
 */
router.get('/booking-trends', async (req, res) => {
  try {
    const { hotelId, period } = req.query;

    const response = await axios.get(`${STAYOWN_API_URL}/v1/analytics/booking-trends`, {
      params: { hotelId, period: period || '30d' },
      timeout: 5000
    });

    res.json({
      success: true,
      trends: response.data
    });
  } catch (err) {
    logger.error('Error getting booking trends:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/revenue
 * Get revenue breakdown
 */
router.get('/revenue', async (req, res) => {
  try {
    const { hotelId, period } = req.query;

    // Fetch from both systems
    const [hotelOsRes, stayownRes] = await Promise.allSettled([
      axios.get(`${HOTEL_OS_URL}/api/analytics/revenue`, {
        params: { hotelId, period },
        timeout: 5000
      }),
      axios.get(`${STAYOWN_API_URL}/v1/analytics/revenue`, {
        params: { hotelId, period },
        timeout: 5000
      })
    ]);

    res.json({
      success: true,
      revenue: {
        rooms: hotelOsRes.status === 'fulfilled' ? hotelOsRes.value.data : null,
        services: stayownRes.status === 'fulfilled' ? stayownRes.value.data : null,
        total: calculateTotalRevenue(
          hotelOsRes.status === 'fulfilled' ? hotelOsRes.value.data : {},
          stayownRes.status === 'fulfilled' ? stayownRes.value.data : {}
        )
      }
    });
  } catch (err) {
    logger.error('Error getting revenue:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/predictions
 * AI-powered predictions from REZ Mind Hotel
 */
router.get('/predictions', async (req, res) => {
  try {
    const { hotelId } = req.query;

    const response = await axios.get(`${REZ_MIND_HOTEL_URL}/api/hotel/predictions`, {
      params: { hotelId },
      timeout: 10000
    });

    res.json({
      success: true,
      predictions: response.data
    });
  } catch (err) {
    logger.error('Error getting predictions:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/satisfaction
 * Guest satisfaction metrics
 */
router.get('/satisfaction', async (req, res) => {
  try {
    const { hotelId, period } = req.query;

    const response = await axios.get(`${REZ_MIND_HOTEL_URL}/api/hotel/satisfaction`, {
      params: { hotelId, period },
      timeout: 5000
    });

    res.json({
      success: true,
      satisfaction: response.data
    });
  } catch (err) {
    logger.error('Error getting satisfaction:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions
function mergeDashboard(hotelOsData, stayownData) {
  return {
    today: {
      arrivals: hotelOsData.today?.arrivals || 0,
      departures: hotelOsData.today?.departures || 0,
      inHouse: hotelOsData.today?.inHouse || 0,
      occupancy: hotelOsData.today?.occupancy || 0,
      revenue: (hotelOsData.today?.revenue || 0) + (stayownData.today?.revenue || 0)
    },
    week: {
      bookings: (hotelOsData.week?.bookings || 0) + (stayownData.week?.bookings || 0),
      revenue: (hotelOsData.week?.revenue || 0) + (stayownData.week?.revenue || 0),
      avgRate: hotelOsData.week?.avgRate || 0
    }
  };
}

function calculateTotalRevenue(hotelOsData, stayownData) {
  return {
    rooms: hotelOsData.rooms || 0,
    fnb: hotelOsData.fnb || 0,
    services: stayownData.services || 0,
    other: (hotelOsData.other || 0) + (stayownData.other || 0),
    total: (hotelOsData.total || 0) + (stayownData.total || 0)
  };
}

export default router;
