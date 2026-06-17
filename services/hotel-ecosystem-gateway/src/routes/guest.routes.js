/**
 * Guest Routes - Unified guest data from StayOwn and RTMN-OS
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
const HOTEL_OS_URL = process.env.HOTEL_OS_URL || 'http://localhost:5025';
const TWIN_OS_HUB_URL = process.env.TWIN_OS_HUB_URL || 'http://localhost:4705';

/**
 * GET /api/guests/:id
 * Get guest profile from all systems
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch from all sources in parallel
    const [stayownRes, hotelOsRes, twinRes] = await Promise.allSettled([
      axios.get(`${STAYOWN_API_URL}/v1/guests/${id}`, { timeout: 5000 }),
      axios.get(`${HOTEL_OS_URL}/api/guests/${id}`, { timeout: 5000 }),
      axios.get(`${TWIN_OS_HUB_URL}/api/twins/guest/${id}`, { timeout: 5000 })
    ]);

    const guest = {
      id,
      stayown: stayownRes.status === 'fulfilled' ? stayownRes.value.data : null,
      rmtn_os: hotelOsRes.status === 'fulfilled' ? hotelOsRes.value.data : null,
      twin: twinRes.status === 'fulfilled' ? twinRes.value.data : null,
      unified: {
        profile: mergeGuestProfile(
          stayownRes.status === 'fulfilled' ? stayownRes.value.data : {},
          hotelOsRes.status === 'fulfilled' ? hotelOsRes.value.data : {}
        ),
        twin: twinRes.status === 'fulfilled' ? twinRes.value.data : null
      }
    };

    res.json({
      success: true,
      guest
    });
  } catch (err) {
    logger.error('Error getting guest:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/guests/:id/bookings
 * Get guest's booking history
 */
router.get('/:id/bookings', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    const response = await axios.get(`${STAYOWN_API_URL}/v1/guests/${id}/bookings`, {
      params: { limit: limit || 10 },
      timeout: 5000
    });

    res.json({
      success: true,
      bookings: response.data,
      count: response.data?.length || 0
    });
  } catch (err) {
    logger.error('Error getting guest bookings:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/guests/:id/preferences
 * Get guest preferences from Digital Twin
 */
router.get('/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params;

    // Get from Digital Twin
    const response = await axios.get(`${TWIN_OS_HUB_URL}/api/twins/guest/${id}/preferences`, {
      timeout: 5000
    });

    res.json({
      success: true,
      preferences: response.data
    });
  } catch (err) {
    // Fallback to StayOwn
    try {
      const response = await axios.get(`${STAYOWN_API_URL}/v1/guests/${id}/preferences`, {
        timeout: 5000
      });
      res.json({
        success: true,
        preferences: response.data
      });
    } catch (fallbackErr) {
      res.status(404).json({ error: 'Preferences not found' });
    }
  }
});

/**
 * PUT /api/guests/:id/preferences
 * Update guest preferences
 */
router.put('/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params;
    const preferences = req.body;

    // Update in StayOwn
    const response = await axios.put(`${STAYOWN_API_URL}/v1/guests/${id}/preferences`,
      preferences,
      { timeout: 5000 }
    );

    // Also sync to Twin
    try {
      await axios.put(`${TWIN_OS_HUB_URL}/api/twins/guest/${id}/preferences`,
        preferences,
        { timeout: 5000 }
      );
    } catch (syncErr) {
      logger.warn('Failed to sync preferences to Twin:', syncErr.message);
    }

    res.json({
      success: true,
      preferences: response.data
    });
  } catch (err) {
    logger.error('Error updating preferences:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/guests/:id/loyalty
 * Get guest loyalty status
 */
router.get('/:id/loyalty', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`${STAYOWN_API_URL}/v1/guests/${id}/loyalty`, {
      timeout: 5000
    });

    res.json({
      success: true,
      loyalty: response.data
    });
  } catch (err) {
    logger.error('Error getting loyalty:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/guests/:id/stay-history
 * Get guest's complete stay history
 */
router.get('/:id/stay-history', async (req, res) => {
  try {
    const { id } = req.params;

    // Aggregate from all stays
    const [staysRes, bookingsRes] = await Promise.allSettled([
      axios.get(`${STAYOWN_API_URL}/v1/guests/${id}/stays`, { timeout: 5000 }),
      axios.get(`${STAYOWN_API_URL}/v1/guests/${id}/bookings`, { timeout: 5000 })
    ]);

    const stays = staysRes.status === 'fulfilled' ? staysRes.value.data : [];
    const bookings = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data : [];

    // Merge and deduplicate
    const allStays = mergeStays(stays, bookings);

    res.json({
      success: true,
      stays: allStays,
      count: allStays.length,
      stats: calculateStayStats(allStays)
    });
  } catch (err) {
    logger.error('Error getting stay history:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions
function mergeGuestProfile(stayownData, hotelOsData) {
  return {
    id: stayownData.id || hotelOsData._id,
    name: stayownData.name || hotelOsData.name,
    email: stayownData.email || hotelOsData.email,
    phone: stayownData.phone || hotelOsData.phone,
    nationality: stayownData.nationality || hotelOsData.nationality,
    idDocument: stayownData.idDocument || hotelOsData.idDocument,
    preferences: stayownData.preferences || hotelOsData.preferences || {},
    notes: stayownData.notes || hotelOsData.notes,
    tags: [...(stayownData.tags || []), ...(hotelOsData.tags || [])],
    createdAt: stayownData.createdAt || hotelOsData.createdAt
  };
}

function mergeStays(stays, bookings) {
  const merged = new Map();

  if (stays?.length) {
    stays.forEach(stay => merged.set(stay.id, { ...stay, source: 'stay' }));
  }

  if (bookings?.length) {
    bookings.forEach(booking => {
      if (merged.has(booking.id)) {
        merged.set(booking.id, { ...merged.get(booking.id), ...booking, source: 'stay,booking' });
      } else {
        merged.set(booking.id, { ...booking, source: 'booking' });
      }
    });
  }

  return Array.from(merged.values()).sort((a, b) =>
    new Date(b.checkIn || b.createdAt) - new Date(a.checkIn || a.createdAt)
  );
}

function calculateStayStats(stays) {
  return {
    totalStays: stays.length,
    totalNights: stays.reduce((sum, s) => sum + (s.nights || 1), 0),
    totalSpent: stays.reduce((sum, s) => sum + (s.totalSpent || s.totalAmount || 0), 0),
    avgRating: stays.reduce((sum, s) => sum + (s.rating || 0), 0) / stays.length || 0
  };
}

export default router;
