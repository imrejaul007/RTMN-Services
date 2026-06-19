/**
 * CorpID Cloud - Device Model
 * Device registration, fingerprinting, and management
 */

import { v4 as uuidv4 } from 'uuid';
import { sha256 } from '../../../shared/utils/security.js';

// ============ IN-MEMORY STORES ============

export const devices = new Map();
export const deviceLocations = new Map();
export const deviceTrustHistory = new Map();

// ============ MODEL FACTORY ============

/**
 * Create a new device
 */
export function createDevice(data) {
  const now = new Date().toISOString();
  const fingerprint = generateFingerprint(data);

  const device = {
    id: `dev-${uuidv4().slice(0, 12)}`,
    userId: data.userId,

    // Recognition
    fingerprint,
    name: data.name || generateDeviceName(data),
    type: data.type || 'desktop', // desktop, mobile, tablet, iot, tv, car, watch, speaker
    subtype: data.subtype || null,

    // Details
    make: data.make || null,
    model: data.model || null,
    os: data.os || null,
    osVersion: data.osVersion || null,

    // Browser
    browser: data.browser || null,
    browserVersion: data.browserVersion || null,
    userAgent: data.userAgent || null,

    // Capabilities
    capabilities: {
      biometric: data.capabilities?.biometric || false,
      secureEnclave: data.capabilities?.secureEnclave || false,
      hardwareToken: data.capabilities?.hardwareToken || false,
      pushNotifications: data.capabilities?.pushNotifications || false
    },

    // Trust
    trustLevel: 'unverified', // trusted, unverified, blocked
    trustScore: 0,
    verifiedAt: null,
    verifiedBy: null,

    // First/Last seen
    firstSeenAt: now,
    lastSeenAt: now,
    loginCount: 1,

    // Current session
    currentSessionId: data.sessionId || null,
    currentIp: data.ip || null,
    currentLocation: data.location || null,

    // History
    ipHistory: [{
      ip: data.ip || null,
      seenAt: now
    }],
    locationHistory: data.location ? [{
      ...data.location,
      seenAt: now
    }] : [],

    // Status
    status: 'active',
    blockedAt: null,
    blockReason: null,

    // Limits
    maxSessions: data.maxSessions || 5,
    currentSessions: 1,

    // Metadata
    metadata: data.metadata || {},
    tags: data.tags || [],

    // Timestamps
    createdAt: now,
    updatedAt: now
  };

  devices.set(device.id, device);
  return device;
}

/**
 * Generate device fingerprint
 */
function generateFingerprint(data) {
  const components = [
    data.userAgent || '',
    data.os || '',
    data.osVersion || '',
    data.browser || '',
    data.browserVersion || '',
    data.make || '',
    data.model || '',
    data.type || ''
  ].join('|');

  return sha256(components);
}

/**
 * Generate default device name
 */
function generateDeviceName(data) {
  const parts = [];

  if (data.make) parts.push(data.make);
  if (data.model) parts.push(data.model);
  else if (data.type) parts.push(data.type);

  if (data.os) {
    if (data.osVersion) parts.push(`(${data.os} ${data.osVersion})`);
    else parts.push(`(${data.os})`);
  }

  if (parts.length === 0) return 'Unknown Device';
  return parts.join(' ');
}

// ============ QUERY HELPERS ============

/**
 * Get device by ID
 */
export function getDeviceById(id) {
  return devices.get(id) || null;
}

/**
 * Find device by fingerprint
 */
export function findDeviceByFingerprint(userId, fingerprint) {
  for (const device of devices.values()) {
    if (device.userId === userId && device.fingerprint === fingerprint) {
      return device;
    }
  }
  return null;
}

/**
 * Get user's devices
 */
export function getUserDevices(userId, options = {}) {
  let userDevices = Array.from(devices.values()).filter(d => d.userId === userId);

  if (options.status) {
    userDevices = userDevices.filter(d => d.status === options.status);
  }
  if (options.type) {
    userDevices = userDevices.filter(d => d.type === options.type);
  }
  if (options.trustLevel) {
    userDevices = userDevices.filter(d => d.trustLevel === options.trustLevel);
  }

  return userDevices;
}

/**
 * Update device
 */
export function updateDevice(id, data) {
  const device = devices.get(id);
  if (!device) return null;

  const allowedFields = ['name', 'capabilities', 'maxSessions', 'metadata', 'tags'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      device[field] = data[field];
    }
  }

  device.updatedAt = new Date().toISOString();
  devices.set(id, device);
  return device;
}

/**
 * Record device activity (login from device)
 */
export function recordDeviceActivity(deviceId, data) {
  const device = devices.get(deviceId);
  if (!device) return null;

  device.lastSeenAt = new Date().toISOString();
  device.loginCount = (device.loginCount || 0) + 1;
  device.currentSessionId = data.sessionId || device.currentSessionId;
  device.currentIp = data.ip || device.currentIp;

  // Track IP history
  if (data.ip && !device.ipHistory.some(h => h.ip === data.ip)) {
    device.ipHistory.push({ ip: data.ip, seenAt: device.lastSeenAt });
    if (device.ipHistory.length > 50) device.ipHistory.shift();
  } else if (data.ip) {
    // Update existing entry
    const existing = device.ipHistory.find(h => h.ip === data.ip);
    if (existing) existing.seenAt = device.lastSeenAt;
  }

  // Track location
  if (data.location) {
    const existingLoc = device.locationHistory.find(l =>
      l.country === data.location.country && l.city === data.location.city
    );

    if (!existingLoc) {
      device.locationHistory.push({
        ...data.location,
        seenAt: device.lastSeenAt
      });
      if (device.locationHistory.length > 50) device.locationHistory.shift();
    } else {
      existingLoc.seenAt = device.lastSeenAt;
    }

    device.currentLocation = data.location;
  }

  devices.set(deviceId, device);
  return device;
}

/**
 * Trust device
 */
export function trustDevice(deviceId, trustedBy) {
  const device = devices.get(deviceId);
  if (!device) return null;

  device.trustLevel = 'trusted';
  device.trustScore = 100;
  device.verifiedAt = new Date().toISOString();
  device.verifiedBy = trustedBy;
  device.updatedAt = new Date().toISOString();
  devices.set(deviceId, device);

  // Record trust history
  const history = deviceTrustHistory.get(deviceId) || [];
  history.push({
    action: 'trusted',
    by: trustedBy,
    at: device.verifiedAt
  });
  deviceTrustHistory.set(deviceId, history);

  return device;
}

/**
 * Block device
 */
export function blockDevice(deviceId, reason, blockedBy) {
  const device = devices.get(deviceId);
  if (!device) return null;

  device.status = 'blocked';
  device.trustLevel = 'blocked';
  device.trustScore = 0;
  device.blockedAt = new Date().toISOString();
  device.blockReason = reason;
  device.updatedAt = new Date().toISOString();
  devices.set(deviceId, device);

  // Record trust history
  const history = deviceTrustHistory.get(deviceId) || [];
  history.push({
    action: 'blocked',
    reason,
    by: blockedBy,
    at: device.blockedAt
  });
  deviceTrustHistory.set(deviceId, history);

  return device;
}

/**
 * Unblock device
 */
export function unblockDevice(deviceId, unblockedBy) {
  const device = devices.get(deviceId);
  if (!device) return null;

  device.status = 'active';
  device.trustLevel = 'unverified';
  device.blockedAt = null;
  device.blockReason = null;
  device.updatedAt = new Date().toISOString();
  devices.set(deviceId, device);

  // Record trust history
  const history = deviceTrustHistory.get(deviceId) || [];
  history.push({
    action: 'unblocked',
    by: unblockedBy,
    at: new Date().toISOString()
  });
  deviceTrustHistory.set(deviceId, history);

  return device;
}

/**
 * Delete device
 */
export function deleteDevice(deviceId) {
  return devices.delete(deviceId);
}

/**
 * Register or update device
 */
export function registerOrUpdateDevice(userId, data) {
  const fingerprint = generateFingerprint(data);

  let device = findDeviceByFingerprint(userId, fingerprint);

  if (device) {
    // Existing device - update activity
    recordDeviceActivity(device.id, {
      sessionId: data.sessionId,
      ip: data.ip,
      location: data.location
    });
  } else {
    // New device
    device = createDevice({
      ...data,
      userId
    });
  }

  return device;
}
