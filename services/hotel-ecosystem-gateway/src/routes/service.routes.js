/**
 * Service Routes - Room services, housekeeping, minibar, etc.
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

/**
 * POST /api/services/request
 * Create a room service request
 */
router.post('/request', async (req, res) => {
  try {
    const { bookingId, roomId, serviceType, items, notes } = req.body;

    const response = await axios.post(`${STAYOWN_API_URL}/v1/room-service/request`, {
      bookingId,
      roomId,
      serviceType,
      items,
      notes
    }, { timeout: 10000 });

    // Publish to Event Bus
    publishEvent('service.requested', {
      requestId: response.data.id,
      bookingId,
      roomId,
      serviceType,
      timestamp: new Date().toISOString()
    });

    // Also notify RTMN Hotel OS
    try {
      await axios.post(`${HOTEL_OS_URL}/api/housekeeping/tasks`, {
        requestId: response.data.id,
        roomId,
        type: serviceType,
        priority: 'normal'
      });
    } catch (syncErr) {
      logger.warn('Failed to sync to Hotel OS:', syncErr.message);
    }

    res.json({
      success: true,
      request: response.data
    });
  } catch (err) {
    logger.error('Error creating service request:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/services/room/:roomId
 * Get service requests for a room
 */
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const response = await axios.get(`${STAYOWN_API_URL}/v1/room-service/room/${roomId}`, {
      timeout: 5000
    });

    res.json({
      success: true,
      requests: response.data
    });
  } catch (err) {
    logger.error('Error getting room services:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/services/minibar
 * Add minibar charges
 */
router.post('/minibar', async (req, res) => {
  try {
    const { bookingId, roomId, items } = req.body;

    const response = await axios.post(`${STAYOWN_API_URL}/v1/room-service/minibar`, {
      bookingId,
      roomId,
      items
    }, { timeout: 5000 });

    // Publish event
    publishEvent('minibar.charge_added', {
      bookingId,
      roomId,
      items,
      total: response.data.total
    });

    res.json({
      success: true,
      charge: response.data
    });
  } catch (err) {
    logger.error('Error adding minibar charge:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/services/types
 * Get available service types
 */
router.get('/types', (req, res) => {
  res.json({
    success: true,
    types: [
      { id: 'housekeeping', name: 'Housekeeping', icon: '🧹' },
      { id: 'room_service', name: 'Room Service', icon: '🍽️' },
      { id: 'laundry', name: 'Laundry', icon: '👔' },
      { id: 'minibar', name: 'Minibar', icon: '🍺' },
      { id: 'maintenance', name: 'Maintenance', icon: '🔧' },
      { id: 'concierge', name: 'Concierge', icon: '🛎️' },
      { id: 'taxi', name: 'Taxi Service', icon: '🚕' },
      { id: 'wake_call', name: 'Wake-up Call', icon: '⏰' }
    ]
  });
});

/**
 * PUT /api/services/:id/status
 * Update service request status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staffId } = req.body;

    const response = await axios.put(`${STAYOWN_API_URL}/v1/room-service/${id}/status`, {
      status,
      staffId,
      updatedAt: new Date().toISOString()
    });

    // Publish status change event
    publishEvent('service.status_changed', {
      requestId: id,
      status,
      staffId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      request: response.data
    });
  } catch (err) {
    logger.error('Error updating service status:', err.message);
    res.status(500).json({ error: err.message });
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
