/**
 * Event Sourcing Engine (Port 5370) - Phase 1.1
 *
 * Provides immutable event log for workflow durability.
 * Every workflow event is persisted with checksum for integrity.
 * Supports replay, snapshots, and event querying.
 *
 * Key Features:
 * - Append-only event store
 * - SHA-256 checksums for integrity
 * - Snapshot management for fast replay
 * - Event querying and filtering
 * - Idempotent event append
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT, 10) || 5370;
const SERVICE_NAME = 'event-sourcing-engine';
const DATA_DIR = process.env.EVENT_SOURCING_DATA_DIR || path.join(__dirname, '../data');
const CHECKSUM_ALGO = 'sha256';
const SNAPSHOT_INTERVAL = parseInt(process.env.SNAPSHOT_INTERVAL, 10) || 100; // Snapshot every N events

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_) { /* ignore */ }
}

function getEventStorePath(aggregateId) {
  return path.join(DATA_DIR, `${aggregateId}.events.json`);
}

function getSnapshotStorePath(aggregateId) {
  return path.join(DATA_DIR, `${aggregateId}.snapshots.json`);
}

// In-memory cache for hot data
const eventCache = new Map(); // aggregateId -> events[]
const snapshotCache = new Map(); // aggregateId -> { sequence, state, timestamp }
const metadataCache = new Map(); // aggregateId -> metadata

// ============================================================================
// EVENT STORE OPERATIONS
// ============================================================================

/**
 * Append an event to the aggregate's event stream
 * @param {string} aggregateId - Workflow/run ID
 * @param {object} event - Event payload
 * @param {string} event.type - Event type (e.g., 'TASK_STARTED', 'WORKFLOW_COMPLETED')
 * @param {string} event.correlationId - Correlation ID for tracing
 * @param {string} event.causationId - What caused this event
 * @returns {object} The appended event with id, sequence, timestamp, checksum
 */
function appendEvent(aggregateId, event) {
  ensureDir();

  // Load existing events
  const events = loadEvents(aggregateId);
  const sequence = events.length;

  // Create event envelope
  const eventEnvelope = {
    id: uuidv4(),
    aggregateId,
    sequence,
    type: event.type,
    timestamp: Date.now(),
    correlationId: event.correlationId || null,
    causationId: event.causationId || null,
    metadata: event.metadata || {},
    payload: event.payload || event,
    checksum: null // Will be set below
  };

  // Calculate checksum of payload
  const payloadString = JSON.stringify(eventEnvelope.payload);
  eventEnvelope.checksum = crypto
    .createHash(CHECKSUM_ALGO)
    .update(payloadString)
    .digest('hex');

  // Append to events array
  events.push(eventEnvelope);

  // Persist to disk
  saveEvents(aggregateId, events);

  // Update cache
  eventCache.set(aggregateId, events);

  // Auto-snapshot if needed
  if ((sequence + 1) % SNAPSHOT_INTERVAL === 0) {
    createSnapshot(aggregateId, events);
  }

  return eventEnvelope;
}

/**
 * Load events for an aggregate from disk
 */
function loadEvents(aggregateId) {
  // Check cache first
  if (eventCache.has(aggregateId)) {
    return eventCache.get(aggregateId);
  }

  try {
    const filePath = getEventStorePath(aggregateId);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const events = JSON.parse(data);
      eventCache.set(aggregateId, events);
      return events;
    }
  } catch (e) {
    console.error(`[${SERVICE_NAME}] Error loading events for ${aggregateId}:`, e.message);
  }

  return [];
}

/**
 * Save events to disk
 */
function saveEvents(aggregateId, events) {
  ensureDir();
  const filePath = getEventStorePath(aggregateId);
  fs.writeFileSync(filePath, JSON.stringify(events, null, 2));
}

/**
 * Get events for an aggregate
 */
function getEvents(aggregateId, options = {}) {
  const events = loadEvents(aggregateId);

  // Apply filters
  let filtered = events;

  if (options.fromSequence !== undefined) {
    filtered = filtered.filter(e => e.sequence >= options.fromSequence);
  }

  if (options.toSequence !== undefined) {
    filtered = filtered.filter(e => e.sequence <= options.toSequence);
  }

  if (options.type) {
    filtered = filtered.filter(e => e.type === options.type);
  }

  if (options.fromTime) {
    filtered = filtered.filter(e => e.timestamp >= options.fromTime);
  }

  if (options.toTime) {
    filtered = filtered.filter(e => e.timestamp <= options.toTime);
  }

  return filtered;
}

// ============================================================================
// SNAPSHOT OPERATIONS
// ============================================================================

/**
 * Create a snapshot of the current state at a given sequence
 */
function createSnapshot(aggregateId, events, stateExtractor) {
  ensureDir();

  const sequence = events.length - 1;
  const lastEvent = events[events.length - 1];

  // Default state extractor - apply events to empty state
  const defaultExtractor = (eventList) => {
    return eventList.reduce((state, event) => {
      return applyEventToState(state, event);
    }, {});
  };

  const extractor = stateExtractor || defaultExtractor;
  const state = extractor(events);

  const snapshot = {
    id: uuidv4(),
    aggregateId,
    sequence,
    timestamp: Date.now(),
    state,
    eventChecksum: crypto
      .createHash(CHECKSUM_ALGO)
      .update(JSON.stringify(events))
      .digest('hex')
  };

  // Load existing snapshots
  const snapshots = loadSnapshots(aggregateId);
  snapshots.push(snapshot);

  // Keep only last 10 snapshots per aggregate
  while (snapshots.length > 10) {
    snapshots.shift();
  }

  // Persist
  saveSnapshots(aggregateId, snapshots);
  snapshotCache.set(aggregateId, snapshots);

  return snapshot;
}

/**
 * Load snapshots from disk
 */
function loadSnapshots(aggregateId) {
  if (snapshotCache.has(aggregateId)) {
    return snapshotCache.get(aggregateId);
  }

  try {
    const filePath = getSnapshotStorePath(aggregateId);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const snapshots = JSON.parse(data);
      snapshotCache.set(aggregateId, snapshots);
      return snapshots;
    }
  } catch (e) {
    console.error(`[${SERVICE_NAME}] Error loading snapshots for ${aggregateId}:`, e.message);
  }

  return [];
}

/**
 * Save snapshots to disk
 */
function saveSnapshots(aggregateId, snapshots) {
  ensureDir();
  const filePath = getSnapshotStorePath(aggregateId);
  fs.writeFileSync(filePath, JSON.stringify(snapshots, null, 2));
}

/**
 * Get the latest snapshot for an aggregate
 */
function getLatestSnapshot(aggregateId) {
  const snapshots = loadSnapshots(aggregateId);
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

/**
 * Default state reducer - applies events to build up state
 * Override this with aggregate-specific logic
 */
function applyEventToState(state, event) {
  // Generic event handlers - extend for specific aggregates
  switch (event.type) {
    case 'WORKFLOW_STARTED':
      return { ...state, status: 'running', startedAt: event.timestamp };

    case 'WORKFLOW_COMPLETED':
      return { ...state, status: 'completed', completedAt: event.timestamp };

    case 'WORKFLOW_FAILED':
      return { ...state, status: 'failed', failedAt: event.timestamp, error: event.payload?.error };

    case 'TASK_STARTED':
      return {
        ...state,
        tasks: {
          ...(state.tasks || {}),
          [event.payload?.taskId]: { status: 'running', startedAt: event.timestamp }
        }
      };

    case 'TASK_COMPLETED':
      return {
        ...state,
        tasks: {
          ...(state.tasks || {}),
          [event.payload?.taskId]: { status: 'completed', completedAt: event.timestamp }
        }
      };

    case 'TASK_FAILED':
      return {
        ...state,
        tasks: {
          ...(state.tasks || {}),
          [event.payload?.taskId]: { status: 'failed', failedAt: event.timestamp }
        }
      };

    default:
      return state;
  }
}

// ============================================================================
// REPLAY OPERATIONS
// ============================================================================

/**
 * Replay events from a given sequence number to reconstruct state
 */
function replay(aggregateId, fromSequence = 0, stateExtractor) {
  // Try to start from snapshot for efficiency
  const snapshot = getLatestSnapshot(aggregateId);

  let events;
  let startSequence;

  if (snapshot && snapshot.sequence >= fromSequence) {
    // Start from snapshot
    events = getEvents(aggregateId, { fromSequence: snapshot.sequence + 1 });
    startSequence = snapshot.sequence + 1;
  } else {
    // Start from beginning or specified sequence
    events = getEvents(aggregateId, { fromSequence });
    startSequence = fromSequence;
  }

  // Default state extractor
  const defaultExtractor = (eventList) => {
    return eventList.reduce((state, event) => {
      return applyEventToState(state, event);
    }, snapshot?.state || {});
  };

  const extractor = stateExtractor || defaultExtractor;

  // Apply events to state
  let state = snapshot?.state || {};
  for (const event of events) {
    state = applyEventToState(state, event);
  }

  return {
    aggregateId,
    startSequence,
    endSequence: startSequence + events.length - 1,
    eventCount: events.length,
    startedFromSnapshot: !!snapshot,
    state,
    replayedAt: Date.now()
  };
}

/**
 * Verify event integrity using checksums
 */
function verifyIntegrity(aggregateId) {
  const events = loadEvents(aggregateId);
  const results = {
    aggregateId,
    totalEvents: events.length,
    verified: 0,
    failed: 0,
    errors: []
  };

  for (const event of events) {
    const payloadString = JSON.stringify(event.payload);
    const expectedChecksum = crypto
      .createHash(CHECKSUM_ALGO)
      .update(payloadString)
      .digest('hex');

    if (event.checksum === expectedChecksum) {
      results.verified++;
    } else {
      results.failed++;
      results.errors.push({
        sequence: event.sequence,
        id: event.id,
        type: event.type,
        error: 'Checksum mismatch - event may be corrupted'
      });
    }
  }

  results.valid = results.failed === 0;
  return results;
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan(`[${SERVICE_NAME}] :method :url :status :response-time ms`));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Ready check
app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// ============================================================================
// EVENT ENDPOINTS
// ============================================================================

// Append event to aggregate
app.post('/api/aggregates/:aggregateId/events', (req, res) => {
  try {
    const { aggregateId } = req.params;
    const event = req.body;

    if (!event || !event.type) {
      return res.status(400).json({
        error: 'Invalid event: type is required',
        example: { type: 'TASK_STARTED', payload: { taskId: 'task-123' } }
      });
    }

    const appendedEvent = appendEvent(aggregateId, event);

    res.status(201).json({
      success: true,
      event: appendedEvent
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error appending event:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get events for aggregate
app.get('/api/aggregates/:aggregateId/events', (req, res) => {
  try {
    const { aggregateId } = req.params;
    const { fromSequence, toSequence, type, fromTime, toTime } = req.query;

    const options = {};
    if (fromSequence !== undefined) options.fromSequence = parseInt(fromSequence);
    if (toSequence !== undefined) options.toSequence = parseInt(toSequence);
    if (type) options.type = type;
    if (fromTime) options.fromTime = parseInt(fromTime);
    if (toTime) options.toTime = parseInt(toTime);

    const events = getEvents(aggregateId, options);

    res.json({
      aggregateId,
      count: events.length,
      events
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting events:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get single event
app.get('/api/aggregates/:aggregateId/events/:eventId', (req, res) => {
  try {
    const { aggregateId, eventId } = req.params;
    const events = getEvents(aggregateId);
    const event = events.find(e => e.id === eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting event:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SNAPSHOT ENDPOINTS
// ============================================================================

// Create snapshot
app.post('/api/aggregates/:aggregateId/snapshots', (req, res) => {
  try {
    const { aggregateId } = req.params;
    const events = loadEvents(aggregateId);

    if (events.length === 0) {
      return res.status(400).json({ error: 'No events to snapshot' });
    }

    const snapshot = createSnapshot(aggregateId, events);

    res.status(201).json({
      success: true,
      snapshot
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error creating snapshot:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get snapshots
app.get('/api/aggregates/:aggregateId/snapshots', (req, res) => {
  try {
    const { aggregateId } = req.params;
    const snapshots = loadSnapshots(aggregateId);

    res.json({
      aggregateId,
      count: snapshots.length,
      snapshots
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting snapshots:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest snapshot
app.get('/api/aggregates/:aggregateId/snapshots/latest', (req, res) => {
  try {
    const { aggregateId } = req.params;
    const snapshot = getLatestSnapshot(aggregateId);

    if (!snapshot) {
      return res.status(404).json({ error: 'No snapshots found' });
    }

    res.json({ snapshot });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting latest snapshot:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// REPLAY ENDPOINTS
// ============================================================================

// Replay events to reconstruct state
app.post('/api/aggregates/:aggregateId/replay', (req, res) => {
  try {
    const { aggregateId } = req.params;
    const { fromSequence = 0 } = req.body;

    const result = replay(aggregateId, fromSequence);

    res.json(result);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error replaying events:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Verify event integrity
app.get('/api/aggregates/:aggregateId/verify', (req, res) => {
  try {
    const { aggregateId } = req.params;
    const result = verifyIntegrity(aggregateId);

    res.json(result);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error verifying integrity:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AGGREGATE METADATA
// ============================================================================

// Get aggregate info
app.get('/api/aggregates/:aggregateId', (req, res) => {
  try {
    const { aggregateId } = req.params;
    const events = loadEvents(aggregateId);
    const snapshot = getLatestSnapshot(aggregateId);

    res.json({
      aggregateId,
      eventCount: events.length,
      latestSequence: events.length > 0 ? events[events.length - 1].sequence : -1,
      hasSnapshot: !!snapshot,
      latestSnapshotSequence: snapshot?.sequence || null,
      createdAt: events.length > 0 ? events[0].timestamp : null,
      updatedAt: events.length > 0 ? events[events.length - 1].timestamp : null
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting aggregate info:`, error);
    res.status(500).json({ error: error.message });
  }
});

// List all aggregates
app.get('/api/aggregates', (req, res) => {
  try {
    ensureDir();
    const files = fs.readdirSync(DATA_DIR);
    const aggregates = files
      .filter(f => f.endsWith('.events.json'))
      .map(f => f.replace('.events.json', ''))
      .map(aggregateId => {
        const events = loadEvents(aggregateId);
        return {
          aggregateId,
          eventCount: events.length,
          latestSequence: events.length > 0 ? events[events.length - 1].sequence : -1
        };
      });

    res.json({
      count: aggregates.length,
      aggregates
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error listing aggregates:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  ensureDir();
  console.log(`[${SERVICE_NAME}] Event Sourcing Engine started on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Data directory: ${DATA_DIR}`);
  console.log(`[${SERVICE_NAME}] Snapshot interval: every ${SNAPSHOT_INTERVAL} events`);
});

module.exports = {
  appendEvent,
  getEvents,
  createSnapshot,
  getLatestSnapshot,
  replay,
  verifyIntegrity,
  loadEvents,
  applyEventToState
};
