import { v4 as uuidv4 } from 'uuid';
import mongoose, { Schema, Document } from 'mongoose';
import { Twin, toTwinResponse } from '../models/Twin.js';
import { eventService } from './eventService.js';
import { logger } from '../utils/logger.js';

// Snapshot schema for persistence
interface ISnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  snapshotId: string;
  twinId: string;
  state: Record<string, unknown>;
  metadata: Record<string, unknown>;
  version: number;
  timestamp: Date;
  label?: string;
  createdAt: Date;
}

const SnapshotSchema = new Schema<ISnapshot>({
  snapshotId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  twinId: {
    type: String,
    required: true,
    index: true,
  },
  state: {
    type: Schema.Types.Mixed,
    required: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  version: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  label: {
    type: String,
  },
});

SnapshotSchema.index({ twinId: 1, version: -1 });
SnapshotSchema.index({ twinId: 1, timestamp: -1 });

const Snapshot = mongoose.model<ISnapshot>('Snapshot', SnapshotSchema);

export interface SnapshotResponse {
  id: string;
  twinId: string;
  state: Record<string, unknown>;
  metadata: Record<string, unknown>;
  version: number;
  timestamp: Date;
  label?: string;
}

export class SnapshotService {
  /**
   * Create a snapshot of current twin state
   */
  async createSnapshot(
    twinId: string,
    options: {
      label?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<SnapshotResponse | null> {
    const twin = await Twin.findOne({ twinId });
    if (!twin) {
      logger.warn(`Cannot create snapshot: twin ${twinId} not found`);
      return null;
    }

    const snapshot = new Snapshot({
      snapshotId: uuidv4(),
      twinId,
      state: twin.state,
      metadata: {
        ...twin.metadata,
        ...options.metadata,
        type: twin.type,
        name: twin.name,
      },
      version: twin.version,
      timestamp: new Date(),
      label: options.label,
    });

    await snapshot.save();
    logger.info(`Created snapshot for twin: ${twinId}`, { snapshotId: snapshot.snapshotId, version: twin.version });

    // Record snapshot event
    await eventService.recordEvent({
      twinId,
      action: 'snapshot_created',
      previousState: null,
      newState: twin.state,
      source: 'snapshot_service',
      metadata: { snapshotId: snapshot.snapshotId, label: options.label },
    });

    return this.toSnapshotResponse(snapshot);
  }

  /**
   * Restore twin to a specific snapshot
   */
  async restoreSnapshot(
    twinId: string,
    snapshotId: string,
    source: string = 'api'
  ): Promise<{ success: boolean; twin?: ReturnType<typeof toTwinResponse>; error?: string }> {
    const snapshot = await Snapshot.findOne({ snapshotId, twinId });
    if (!snapshot) {
      return { success: false, error: 'Snapshot not found' };
    }

    const twin = await Twin.findOne({ twinId });
    if (!twin) {
      return { success: false, error: 'Twin not found' };
    }

    const previousState = { ...twin.state };

    // Restore state
    twin.state = snapshot.state;
    twin.metadata = { ...snapshot.metadata };
    twin.version += 1;
    twin.lastSync = new Date();

    await twin.save();
    logger.info(`Restored twin ${twinId} to snapshot ${snapshotId}`, { source });

    // Record restore event
    await eventService.recordEvent({
      twinId,
      action: 'snapshot_restored',
      previousState,
      newState: twin.state,
      source,
      metadata: { snapshotId, restoredVersion: snapshot.version },
    });

    return { success: true, twin: toTwinResponse(twin) };
  }

  /**
   * Restore twin to a specific version
   */
  async restoreToVersion(
    twinId: string,
    version: number,
    source: string = 'api'
  ): Promise<{ success: boolean; twin?: ReturnType<typeof toTwinResponse>; error?: string }> {
    // Find the snapshot closest to the requested version
    const snapshot = await Snapshot.findOne({
      twinId,
      version: { $lte: version },
    }).sort({ version: -1 });

    if (snapshot) {
      return this.restoreSnapshot(twinId, snapshot.snapshotId, source);
    }

    // No snapshot found, try to reconstruct from events
    const latestEvent = await eventService.getLatestEvent(twinId);
    if (!latestEvent) {
      return { success: false, error: 'No events found for this twin' };
    }

    const stateAtVersion = await this.reconstructStateAtVersion(twinId, version);
    if (!stateAtVersion) {
      return { success: false, error: `Could not reconstruct state at version ${version}` };
    }

    const twin = await Twin.findOne({ twinId });
    if (!twin) {
      return { success: false, error: 'Twin not found' };
    }

    const previousState = { ...twin.state };

    twin.state = stateAtVersion;
    twin.version += 1;
    twin.lastSync = new Date();

    await twin.save();

    await eventService.recordEvent({
      twinId,
      action: 'restore',
      previousState,
      newState: twin.state,
      source,
      metadata: { reconstructedVersion: version },
    });

    return { success: true, twin: toTwinResponse(twin) };
  }

  /**
   * Get a snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<SnapshotResponse | null> {
    const snapshot = await Snapshot.findOne({ snapshotId });
    return snapshot ? this.toSnapshotResponse(snapshot) : null;
  }

  /**
   * Get all snapshots for a twin
   */
  async getSnapshots(
    twinId: string,
    options: {
      limit?: number;
      offset?: number;
      since?: Date;
      until?: Date;
    } = {}
  ): Promise<{ snapshots: SnapshotResponse[]; total: number }> {
    const filter: Record<string, unknown> = { twinId };

    if (options.since || options.until) {
      filter.timestamp = {};
      if (options.since) {
        (filter.timestamp as Record<string, Date>).$gte = options.since;
      }
      if (options.until) {
        (filter.timestamp as Record<string, Date>).$lte = options.until;
      }
    }

    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    const [snapshots, total] = await Promise.all([
      Snapshot.find(filter).sort({ timestamp: -1 }).skip(offset).limit(limit),
      Snapshot.countDocuments(filter),
    ]);

    return {
      snapshots: snapshots.map(s => this.toSnapshotResponse(s)),
      total,
    };
  }

  /**
   * Get the latest snapshot for a twin
   */
  async getLatestSnapshot(twinId: string): Promise<SnapshotResponse | null> {
    const snapshot = await Snapshot.findOne({ twinId }).sort({ timestamp: -1 });
    return snapshot ? this.toSnapshotResponse(snapshot) : null;
  }

  /**
   * Delete old snapshots
   */
  async deleteOldSnapshots(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await Snapshot.deleteMany({
      timestamp: { $lt: cutoff },
    });

    logger.info(`Deleted ${result.deletedCount} old snapshots older than ${retentionDays} days`);
    return result.deletedCount;
  }

  /**
   * Delete a specific snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const result = await Snapshot.deleteOne({ snapshotId });
    return result.deletedCount > 0;
  }

  /**
   * Compare two snapshots
   */
  async compareSnapshots(
    snapshotId1: string,
    snapshotId2: string
  ): Promise<{ identical: boolean; differences: Record<string, { v1: unknown; v2: unknown }> } | null> {
    const [snapshot1, snapshot2] = await Promise.all([
      Snapshot.findOne({ snapshotId: snapshotId1 }),
      Snapshot.findOne({ snapshotId: snapshotId2 }),
    ]);

    if (!snapshot1 || !snapshot2) {
      return null;
    }

    const differences: Record<string, { v1: unknown; v2: unknown }> = {};
    const allKeys = new Set([...Object.keys(snapshot1.state), ...Object.keys(snapshot2.state)]);

    for (const key of allKeys) {
      const v1 = snapshot1.state[key];
      const v2 = snapshot2.state[key];
      if (JSON.stringify(v1) !== JSON.stringify(v2)) {
        differences[key] = { v1, v2 };
      }
    }

    return {
      identical: Object.keys(differences).length === 0,
      differences,
    };
  }

  /**
   * Reconstruct state at a specific version from events
   */
  private async reconstructStateAtVersion(
    twinId: string,
    targetVersion: number
  ): Promise<Record<string, unknown> | null> {
    const { TwinEvent } = await import('../models/Event.js');

    const events = await TwinEvent.find({
      twinId,
      version: { $lte: targetVersion },
    }).sort({ version: 1 });

    if (events.length === 0) {
      return null;
    }

    let state: Record<string, unknown> = {};

    for (const event of events) {
      const typedEvent = event as unknown as { action: string; newState: Record<string, unknown> | null };
      if (typedEvent.action === 'create') {
        state = typedEvent.newState || {};
      } else if (typedEvent.action === 'update') {
        state = { ...state, ...(typedEvent.newState || {}) };
      }
    }

    return state;
  }

  private toSnapshotResponse(snapshot: ISnapshot): SnapshotResponse {
    return {
      id: snapshot.snapshotId,
      twinId: snapshot.twinId,
      state: snapshot.state,
      metadata: snapshot.metadata,
      version: snapshot.version,
      timestamp: snapshot.timestamp,
      label: snapshot.label,
    };
  }
}

export const snapshotService = new SnapshotService();
