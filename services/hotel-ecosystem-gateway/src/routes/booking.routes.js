/**
 * Booking Routes - Unified booking across StayOwn and RTMN Hotel OS
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

// Service URLs
const STAYOWN_API_URL = process.env.STAYOWN_API_URL || 'http://localhost:3000';
const HOTEL_OS_URL = process.env.HOTEL_OS_URL || 'http://localhost:5025';
const REZ_BOOKING_URL = process.env.REZ_BOOKING_URL || 'http://localhost:4015';

/**
 * POST /api/bookings
 * Create a new booking (StayOwn is primary for guest bookings)
 */
router.post('/', async (req, res) => {
  try {
    const bookingData = req.body;

    // Create booking in StayOwn OTA
    const response = await axios.post(`${STAYOWN_API_URL}/v1/bookings`, bookingData, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    const booking = response.data;

    // Sync to RTMN Hotel OS
    try {
      await axios.post(`${HOTEL_OS_URL}/api/bookings`, {
        bookingId: booking.id,
        hotelId: booking.hotelId,
        roomId: booking.roomId,
        guestId: booking.guestId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut
      }, { timeout: 5000 });
    } catch (syncErr) {
      logger.warn('Failed to sync booking to Hotel OS:', syncErr.message);
    }

    // Publish booking event
    publishEvent('booking.created', {
      bookingId: booking.id,
      hotelId: booking.hotelId,
      guestId: booking.guestId,
      source: 'hotel-ecosystem-gateway'
    });

    res.json({
      success: true,
      booking,
      synced: true
    });
  } catch (err) {
    logger.error('Error creating booking:', err.message);
    res.status(err.response?.status || 500).json({
      error: err.message,
      details: err.response?.data
    });
  }
});

/**
 * GET /api/bookings/:id
 * Get booking details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Primary: StayOwn
    const response = await axios.get(`${STAYOWN_API_URL}/v1/bookings/${id}`, {
      timeout: 5000
    });

    res.json({
      success: true,
      booking: response.data,
      source: 'stayown'
    });
  } catch (err) {
    // Fallback: Try RTMN Hotel OS
    try {
      const response = await axios.get(`${HOTEL_OS_URL}/api/bookings/${id}`, {
        timeout: 5000
      });
      res.json({
        success: true,
        booking: response.data,
        source: 'rtmn-hotel-os'
      });
    } catch (fallbackErr) {
      res.status(404).json({ error: 'Booking not found' });
    }
  }
});

/**
 * GET /api/bookings/user/:userId
 * Get user's bookings
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const response = await axios.get(`${STAYOWN_API_URL}/v1/bookings/user/${userId}`, {
      timeout: 5000
    });

    res.json({
      success: true,
      bookings: response.data,
      count: response.data?.length || 0
    });
  } catch (err) {
    logger.error('Error getting user bookings:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/bookings/:id/cancel
 * Cancel a booking
 */
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, guestId } = req.body;

    // Cancel in StayOwn
    const response = await axios.put(`${STAYOWN_API_URL}/v1/bookings/${id}/cancel`, {
      reason,
      guestId
    }, {
      timeout: 10000
    });

    // Update RTMN Hotel OS
    try {
      await axios.put(`${HOTEL_OS_URL}/api/bookings/${id}/cancel`, {
        reason,
        cancelledBy: 'guest'
      });
    } catch (syncErr) {
      logger.warn('Failed to cancel in Hotel OS:', syncErr.message);
    }

    // Publish cancellation event
    publishEvent('booking.cancelled', {
      bookingId: id,
      reason,
      guestId,
      cancelledAt: new Date().toISOString()
    });

    res.json({
      success: true,
      cancellation: response.data
    });
  } catch (err) {
    logger.error('Error cancelling booking:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/bookings/:id/check-in
 * Check in a guest
 */
router.post('/:id/check-in', async (req, res) => {
  try {
    const { id } = req.params;
    const { roomId, guestId, documents } = req.body;

    // Check in via StayOwn
    const response = await axios.post(`${STAYOWN_API_URL}/v1/bookings/${id}/check-in`, {
      roomId,
      guestId,
      documents
    });

    // Sync to RTMN Hotel OS
    try {
      await axios.post(`${HOTEL_OS_URL}/api/bookings/${id}/check-in`, {
        roomId,
        checkedInAt: new Date().toISOString()
      });
    } catch (syncErr) {
      logger.warn('Failed to check-in in Hotel OS:', syncErr.message);
    }

    // Publish event
    publishEvent('booking.checked_in', {
      bookingId: id,
      roomId,
      guestId,
      checkedInAt: new Date().toISOString()
    });

    res.json({
      success: true,
      checkIn: response.data
    });
  } catch (err) {
    logger.error('Error checking in:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/bookings/:id/check-out
 * Check out a guest
 */
router.post('/:id/check-out', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, checkoutTime } = req.body;

    // Get bill from StayOwn
    const billResponse = await axios.get(`${STAYOWN_API_URL}/v1/bookings/${id}/bill`, {
      timeout: 5000
    });

    // Process checkout in StayOwn
    const response = await axios.post(`${STAYOWN_API_URL}/v1/bookings/${id}/checkout`, {
      paymentMethod,
      checkoutTime
    });

    // Sync to RTMN Hotel OS
    try {
      await axios.post(`${HOTEL_OS_URL}/api/bookings/${id}/checkout`, {
        checkedOutAt: new Date().toISOString(),
        totalCharges: billResponse.data.total
      });
    } catch (syncErr) {
      logger.warn('Failed to checkout in Hotel OS:', syncErr.message);
    }

    // Publish event
    publishEvent('booking.checked_out', {
      bookingId: id,
      totalCharges: billResponse.data.total,
      checkedOutAt: new Date().toISOString()
    });

    res.json({
      success: true,
      checkout: response.data,
      bill: billResponse.data
    });
  } catch (err) {
    logger.error('Error checking out:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// Event publishing helper
function publishEvent(eventType, data) {
  const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
  axios.post(`${EVENT_BUS_URL}/events`, {
    type: `hotel.${eventType}`,
    data,
    timestamp: new Date().toISOString(),
    source: 'hotel-ecosystem-gateway'
  }).catch(err => logger.warn('Failed to publish event:', err.message));
}

export default router;
