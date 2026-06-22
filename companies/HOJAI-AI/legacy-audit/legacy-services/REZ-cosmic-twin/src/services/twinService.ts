import { v4 as uuidv4 } from 'uuid';
import { Twin, CreateTwinInput, UpdateTwinInput, toTwinResponse, TwinResponse } from '../models/Twin.js';
import { eventService } from './eventService.js';
import { logger } from '../utils/logger.js';

export class TwinService {
  /**
   * Create a new digital twin
   */
  async createTwin(input: CreateTwinInput, source: string = 'api'): Promise<TwinResponse> {
    const twinId = uuidv4();
    const now = new Date();

    const twin = new Twin({
      twinId,
      type: input.type,
      name: input.name,
      state: input.state || {},
      metadata: input.metadata || {},
      version: 1,
      tenantId: input.tenantId,
      lastSync: now,
    });

    await twin.save();
    logger.info(`Created twin: ${twinId}`, { type: input.type, name: input.name });

    // Record creation event
    await eventService.recordEvent({
      twinId,
      action: 'create',
      previousState: null,
      newState: twin.state,
      source,
      metadata: { type: input.type },
    });

    return toTwinResponse(twin);
  }

  /**
   * Get a twin by ID
   */
  async getTwinById(twinId: string): Promise<TwinResponse | null> {
    const twin = await Twin.findOne({ twinId });
    if (!twin) {
      return null;
    }
    return toTwinResponse(twin);
  }

  /**
   * Get twin with all relationships
   */
  async getTwinWithRelationships(twinId: string): Promise<{
    twin: TwinResponse | null;
    relationships: import('../models/Relationship.js').RelationshipResponse[];
    incomingRelationships: import('../models/Relationship.js').RelationshipResponse[];
  } | null> {
    const { Relationship, toRelationshipResponse } = await import('../models/Relationship.js');

    const twin = await Twin.findOne({ twinId });
    if (!twin) {
      return null;
    }

    const outgoing = await Relationship.find({ sourceTwinId: twinId });
    const incoming = await Relationship.find({ targetTwinId: twinId });

    return {
      twin: toTwinResponse(twin),
      relationships: outgoing.map(r => toRelationshipResponse(r as import('../models/Relationship.js').IRelationship)),
      incomingRelationships: incoming.map(r => toRelationshipResponse(r as import('../models/Relationship.js').IRelationship)),
    };
  }

  /**
   * Update a twin's state or metadata
   */
  async updateTwin(twinId: string, input: UpdateTwinInput, source: string = 'api'): Promise<TwinResponse | null> {
    const twin = await Twin.findOne({ twinId });
    if (!twin) {
      return null;
    }

    const previousState = { ...twin.state };
    const previousMetadata = { ...twin.metadata };

    // Update fields
    if (input.state !== undefined) {
      twin.state = { ...twin.state, ...input.state };
    }
    if (input.metadata !== undefined) {
      twin.metadata = { ...twin.metadata, ...input.metadata };
    }
    if (input.name !== undefined) {
      twin.name = input.name;
    }

    twin.version += 1;
    twin.lastSync = new Date();

    await twin.save();
    logger.info(`Updated twin: ${twinId}`, { version: twin.version, source });

    // Record update event
    await eventService.recordEvent({
      twinId,
      action: 'update',
      previousState,
      newState: twin.state,
      source,
      metadata: {
        metadataChanges: input.metadata ? previousMetadata : undefined,
      },
    });

    return toTwinResponse(twin);
  }

  /**
   * Update specific state fields
   */
  async patchTwinState(
    twinId: string,
    statePatch: Record<string, unknown>,
    source: string = 'api'
  ): Promise<TwinResponse | null> {
    const twin = await Twin.findOne({ twinId });
    if (!twin) {
      return null;
    }

    const previousState = { ...twin.state };

    // Deep merge the state patch
    twin.state = this.deepMerge(twin.state, statePatch);
    twin.version += 1;
    twin.lastSync = new Date();

    await twin.save();
    logger.info(`Patched twin state: ${twinId}`, { patchKeys: Object.keys(statePatch), source });

    await eventService.recordEvent({
      twinId,
      action: 'update',
      previousState,
      newState: twin.state,
      source,
    });

    return toTwinResponse(twin);
  }

  /**
   * Delete a twin (soft delete by recording event)
   */
  async deleteTwin(twinId: string, source: string = 'api'): Promise<boolean> {
    const twin = await Twin.findOne({ twinId });
    if (!twin) {
      return false;
    }

    await eventService.recordEvent({
      twinId,
      action: 'delete',
      previousState: twin.state,
      newState: null,
      source,
    });

    await Twin.deleteOne({ twinId });
    logger.info(`Deleted twin: ${twinId}`);

    return true;
  }

  /**
   * List twins with optional filtering
   */
  async listTwins(options: {
    type?: string;
    tenantId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ twins: TwinResponse[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (options.type) {
      filter.type = options.type;
    }
    if (options.tenantId) {
      filter.tenantId = options.tenantId;
    }

    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    const [twins, total] = await Promise.all([
      Twin.find(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit),
      Twin.countDocuments(filter),
    ]);

    return {
      twins: twins.map(toTwinResponse),
      total,
    };
  }

  /**
   * Check if twin exists
   */
  async twinExists(twinId: string): Promise<boolean> {
    const count = await Twin.countDocuments({ twinId });
    return count > 0;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (typeof result[key] === 'object' && result[key] !== null) {
          result[key] = this.deepMerge(
            result[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          );
        } else {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

export const twinService = new TwinService();
