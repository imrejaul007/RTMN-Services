/**
 * Hotel Routes - Aggregates hotel data from RTMN-OS and StayOwn
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

// Service URLs from environment
const HOTEL_OS_URL = process.env.HOTEL_OS_URL || process.env.DEV_HOTEL_OS_URL || 'http://localhost:5025';
const STAYOWN_API_URL = process.env.STAYOWN_API_URL || process.env.DEV_STAYOWN_API_URL || 'http://localhost:3000';

/**
 * GET /api/hotels
 * Search hotels across all systems
 */
router.get('/', async (req, res) => {
  try {
    const { city, checkIn, checkOut, guests } = req.query;

    // Search in StayOwn OTA
    const stayownResponse = await axios.get(`${STAYOWN_API_URL}/v1/hotels/search`, {
      params: { city, checkIn, checkOut, guests },
      timeout: 5000
    });

    // Get hotel details from RTMN Hotel OS
    const hotelOsResponse = await axios.get(`${HOTEL_OS_URL}/api/hotels`, {
      params: { city },
      timeout: 5000
    });

    // Aggregate results
    const hotels = {
      ota: stayownResponse.data || [],
      pms: hotelOsResponse.data || [],
      unified: mergeHotelResults(stayownResponse.data, hotelOsResponse.data)
    };

    res.json({
      success: true,
      source: 'hotel-ecosystem-gateway',
      count: hotels.unified.length,
      hotels: hotels.unified
    });
  } catch (err) {
    logger.error('Error searching hotels:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/hotels/:id
 * Get hotel details from both systems
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch from both systems in parallel
    const [stayownResponse, hotelOsResponse] = await Promise.allSettled([
      axios.get(`${STAYOWN_API_URL}/v1/hotels/${id}`, { timeout: 5000 }),
      axios.get(`${HOTEL_OS_URL}/api/hotels/${id}`, { timeout: 5000 })
    ]);

    const hotel = {
      id,
      stayown: stayownResponse.status === 'fulfilled' ? stayownResponse.value.data : null,
      rmtn_os: hotelOsResponse.status === 'fulfilled' ? hotelOsResponse.value.data : null,
      unified: mergeHotelDetails(
        stayownResponse.status === 'fulfilled' ? stayownResponse.value.data : {},
        hotelOsResponse.status === 'fulfilled' ? hotelOsResponse.value.data : {}
      )
    };

    res.json({
      success: true,
      hotel
    });
  } catch (err) {
    logger.error('Error getting hotel:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/hotels/:id/availability
 * Check room availability
 */
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, rooms } = req.query;

    // Try StayOwn OTA first (primary source for booking)
    const response = await axios.get(`${STAYOWN_API_URL}/v1/hotels/${id}/availability`, {
      params: { checkIn, checkOut, rooms },
      timeout: 5000
    });

    res.json(response.data);
  } catch (err) {
    // Fallback to RTMN Hotel OS
    try {
      const response = await axios.get(`${HOTEL_OS_URL}/api/availability`, {
        params: { hotelId: id, checkIn, checkOut, rooms },
        timeout: 5000
      });
      res.json(response.data);
    } catch (fallbackErr) {
      logger.error('Error checking availability:', fallbackErr.message);
      res.status(500).json({ error: fallbackErr.message });
    }
  }
});

/**
 * GET /api/hotels/:id/rooms
 * Get room types and inventory
 */
router.get('/:id/rooms', async (req, res) => {
  try {
    const { id } = req.params;

    // RTMN Hotel OS has detailed room management
    const response = await axios.get(`${HOTEL_OS_URL}/api/rooms`, {
      params: { hotelId: id },
      timeout: 5000
    });

    res.json({
      success: true,
      source: 'rtmn-hotel-os',
      rooms: response.data
    });
  } catch (err) {
    logger.error('Error getting rooms:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/hotels/:id/analytics
 * Get hotel analytics from RTMN Hotel OS
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;

    const response = await axios.get(`${HOTEL_OS_URL}/api/analytics`, {
      params: { hotelId: id, period: period || '30d' },
      timeout: 5000
    });

    res.json({
      success: true,
      source: 'rtmn-hotel-os',
      analytics: response.data
    });
  } catch (err) {
    logger.error('Error getting analytics:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions
function mergeHotelResults(otaHotels, pmsHotels) {
  // Merge and deduplicate hotel results
  const merged = new Map();

  if (otaHotels?.length) {
    otaHotels.forEach(hotel => {
      merged.set(hotel.id, { ...hotel, source: 'ota' });
    });
  }

  if (pmsHotels?.length) {
    pmsHotels.forEach(hotel => {
      if (merged.has(hotel.id)) {
        const existing = merged.get(hotel.id);
        merged.set(hotel.id, { ...existing, ...hotel, source: 'ota,pms' });
      } else {
        merged.set(hotel.id, { ...hotel, source: 'pms' });
      }
    });
  }

  return Array.from(merged.values());
}

function mergeHotelDetails(stayownData, hotelOsData) {
  return {
    // Best data from each source
    basic: {
      id: stayownData.id || hotelOsData._id,
      name: stayownData.name || hotelOsData.name,
      description: stayownData.description || hotelOsData.description,
      address: stayownData.address || hotelOsData.address,
      city: stayownData.city || hotelOsData.location?.city,
      rating: stayownData.rating || hotelOsData.rating,
      images: stayownData.images || hotelOsData.images || [],
      amenities: stayownData.amenities || hotelOsData.amenities || []
    },
    // RTMN Hotel OS specific
    operations: hotelOsData,
    // StayOwn OTA specific
    booking: stayownData
  };
}

export default router;
