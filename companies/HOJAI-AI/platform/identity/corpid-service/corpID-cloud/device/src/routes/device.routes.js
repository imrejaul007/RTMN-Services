/**
 * CorpID Cloud - Device Routes
 * Express routes for device management
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../../shared/utils/logger.js';
import {
  devices,
  deviceTrustHistory,
  getDeviceById,
  getUserDevices,
  updateDevice,
  trustDevice,
  blockDevice,
  unblockDevice,
  deleteDevice,
  registerOrUpdateDevice
} from '../models/device.model.js';

const router = express.Router();

/**
 * Register or update device
 * POST /api/devices
 */
router.post('/',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { name, type, make, model, os, osVersion, browser, browserVersion, userAgent, capabilities, sessionId, ip, location } = req.body;

    // Get client IP
    const clientIp = ip || req.ip;

    const device = registerOrUpdateDevice(req.user.id, {
      name,
      type,
      make,
      model,
      os,
      osVersion,
      browser,
      browserVersion,
      userAgent: userAgent || req.headers['user-agent'],
      capabilities,
      sessionId,
      ip: clientIp,
      location
    });

    dataAudit('device.registered', req, 'device', device.id, {
      isNew: device.loginCount === 1,
      deviceType: device.type
    });

    res.status(201).json({
      success: true,
      message: device.loginCount === 1 ? 'Device registered' : 'Device updated',
      device: formatDeviceResponse(device)
    });
  })
);

/**
 * List user's devices
 * GET /api/devices
 */
router.get('/',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { status, type, trustLevel } = req.query;

    const userDevices = getUserDevices(req.user.id, {
      status,
      type,
      trustLevel
    });

    res.json({
      success: true,
      count: userDevices.length,
      devices: userDevices.map(formatDeviceResponse)
    });
  })
);

/**
 * Get device by ID
 * GET /api/devices/:id
 */
router.get('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const device = getDeviceById(req.params.id);

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.json({
      success: true,
      device: formatDeviceResponse(device)
    });
  })
);

/**
 * Update device (rename, etc.)
 * PUT /api/devices/:id
 */
router.put('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const device = getDeviceById(req.params.id);

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const updated = updateDevice(req.params.id, req.body);

    dataAudit('device.updated', req, 'device', req.params.id);

    res.json({
      success: true,
      message: 'Device updated',
      device: formatDeviceResponse(updated)
    });
  })
);

/**
 * Trust device
 * POST /api/devices/:id/trust
 */
router.post('/:id/trust',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const device = getDeviceById(req.params.id);

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const trusted = trustDevice(req.params.id, req.user.id);

    dataAudit('device.trusted', req, 'device', req.params.id);

    res.json({
      success: true,
      message: 'Device trusted',
      device: formatDeviceResponse(trusted)
    });
  })
);

/**
 * Block device
 * POST /api/devices/:id/block
 */
router.post('/:id/block',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const device = getDeviceById(req.params.id);

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const blocked = blockDevice(req.params.id, req.body?.reason || 'user_blocked', req.user.id);

    dataAudit('device.blocked', req, 'device', req.params.id);

    res.json({
      success: true,
      message: 'Device blocked',
      device: formatDeviceResponse(blocked)
    });
  })
);

/**
 * Unblock device
 * POST /api/devices/:id/unblock
 */
router.post('/:id/unblock',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const device = getDeviceById(req.params.id);

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const unblocked = unblockDevice(req.params.id, req.user.id);

    dataAudit('device.unblocked', req, 'device', req.params.id);

    res.json({
      success: true,
      message: 'Device unblocked',
      device: formatDeviceResponse(unblocked)
    });
  })
);

/**
 * Delete device
 * DELETE /api/devices/:id
 */
router.delete('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const device = getDeviceById(req.params.id);

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    deleteDevice(req.params.id);

    dataAudit('device.deleted', req, 'device', req.params.id);

    res.json({
      success: true,
      message: 'Device deleted'
    });
  })
);

/**
 * Get device trust history
 * GET /api/devices/:id/history
 */
router.get('/:id/history',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const device = getDeviceById(req.params.id);

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const history = deviceTrustHistory.get(req.params.id) || [];

    res.json({
      success: true,
      history
    });
  })
);

/**
 * Get device capabilities
 * GET /api/devices/:id/capabilities
 */
router.get('/:id/capabilities',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const device = getDeviceById(req.params.id);

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.json({
      success: true,
      capabilities: device.capabilities
    });
  })
);

// ============ HELPER ============

function formatDeviceResponse(device) {
  return {
    id: device.id,
    name: device.name,
    type: device.type,
    subtype: device.subtype,
    make: device.make,
    model: device.model,
    os: device.os,
    osVersion: device.osVersion,
    browser: device.browser,
    browserVersion: device.browserVersion,
    capabilities: device.capabilities,
    trustLevel: device.trustLevel,
    trustScore: device.trustScore,
    verifiedAt: device.verifiedAt,
    firstSeenAt: device.firstSeenAt,
    lastSeenAt: device.lastSeenAt,
    loginCount: device.loginCount,
    currentIp: device.currentIp,
    currentLocation: device.currentLocation,
    status: device.status,
    blockedAt: device.blockedAt,
    blockReason: device.blockReason,
    maxSessions: device.maxSessions,
    createdAt: device.createdAt
  };
}

export default router;
