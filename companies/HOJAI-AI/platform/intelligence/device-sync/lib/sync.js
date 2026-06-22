/**
 * Device Sync — pure helpers for picking the active device + merging state.
 *
 * "Active device" is the device the user most recently interacted with.
 * When the user opens Genie on a new device, we hand off the session —
 * the new device inherits the conversation history + context.
 */

/**
 * Pick the active device from a list of devices for a user.
 * Active = most recent lastSeenAt.
 *
 * @param {Array<{deviceId: string, lastSeenAt: string}>} devices
 * @returns {object|null}
 */
export function pickActive(devices, now = new Date().toISOString()) {
  if (!Array.isArray(devices) || devices.length === 0) return null;
  const sorted = [...devices].sort((a, b) => {
    const at = new Date(a.lastSeenAt || 0).getTime();
    const bt = new Date(b.lastSeenAt || 0).getTime();
    return bt - at;
  });
  return sorted[0];
}

/**
 * Merge two conversation histories into one (newest first, deduped by id).
 */
export function mergeHistories(a, b) {
  const seen = new Set();
  const merged = [];
  for (const msg of [...(b || []), ...(a || [])]) {
    const id = msg.id || `${msg.role}-${msg.text?.slice(0, 50)}-${msg.at}`;
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(msg);
    }
  }
  merged.sort((x, y) => new Date(x.at || 0).getTime() - new Date(y.at || 0).getTime());
  return merged;
}

/**
 * Determine if a device is "stale" — hasn't been seen in N hours.
 */
export function isStale(device, hoursThreshold = 24, now = new Date()) {
  if (!device?.lastSeenAt) return true;
  const ageHours = (now.getTime() - new Date(device.lastSeenAt).getTime()) / 3600000;
  return ageHours > hoursThreshold;
}

/**
 * Normalize a device record: ensure all fields exist with sensible defaults.
 */
export function normalize(device, userId) {
  return {
    deviceId: device.deviceId || device.id,
    userId,
    name: device.name || device.deviceId || device.id || 'unknown',
    type: device.type || 'unknown',     // phone | laptop | tablet | watch | car | desktop
    platform: device.platform || '',    // ios | android | web | macos | windows | linux
    capabilities: Array.isArray(device.capabilities) ? device.capabilities : [],
    lastSeenAt: device.lastSeenAt || new Date().toISOString(),
    sessionActive: !!device.sessionActive,
    metadata: device.metadata || {},
    registeredAt: device.registeredAt || new Date().toISOString(),
  };
}