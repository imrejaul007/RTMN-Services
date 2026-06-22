import { v4 as uuidv4 } from 'uuid';
import { TwinEvent, ITwinEvent, CreateEventInput, toEventResponse, TwinEventResponse } from '../models/Event.js';
import { logger } from '../utils/logger.js';

export class EventService {
  /**
   * Record a new event for a twin
   */
  async recordEvent(input: CreateEventInput): Promise<TwinEventResponse> {
    const { Twin } = await import('../models/Twin.js');

    // Get current version from twin
    const twin = await Twin.findOne({ twinId: input.twinId });
    const version = twin?.version || 1;

    const event = new TwinEvent({
      eventId: uuidv4(),
      twinId: input.twinId,
      action: input.action,
      previousState: input.previousState ?? null,
      newState: input.newState ?? null,
      source: input.source,
      metadata: input.metadata || {},
      version: version,
      timestamp: new Date(),
    });

    await event.save();
    logger.debug(`Recorded event: ${input.twinId}`, { action: input.action, version });

    return toEventResponse(event);
  }

  /**
   * Get event history for a twin
   */
  async getEventHistory(
    twinId: string,
    options: {
      limit?: number;
      offset?: number;
      action?: string;
      since?: Date;
      until?: Date;
    } = {}
  ): Promise<{ events: TwinEventResponse[]; total: number }> {
    const filter: Record<string, unknown> = { twinId };

    if (options.action) {
      filter.action = options.action;
    }

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

    const [events, total] = await Promise.all([
      TwinEvent.find(filter).sort({ timestamp: -1 }).skip(offset).limit(limit),
      TwinEvent.countDocuments(filter),
    ]);

    return {
      events: events.map(e => toEventResponse(e as ITwinEvent)),
      total,
    };
  }

  /**
   * Get events in a time range
   */
  async getEventsInRange(
    twinId: string,
    since: Date,
    until: Date
  ): Promise<TwinEventResponse[]> {
    const events = await TwinEvent.find({
      twinId,
      timestamp: { $gte: since, $lte: until },
    }).sort({ timestamp: 1 });

    return events.map(e => toEventResponse(e as ITwinEvent));
  }

  /**
   * Get the state at a specific point in time
   */
  async getStateAtTime(twinId: string, timestamp: Date): Promise<Record<string, unknown> | null> {
    // Find the most recent event before or at the timestamp
    const event = await TwinEvent.findOne({
      twinId,
      timestamp: { $lte: timestamp },
    }).sort({ timestamp: -1 });

    if (!event) {
      return null;
    }

    // Replay events up to this point
    const events = await TwinEvent.find({
      twinId,
      timestamp: { $lte: timestamp },
    }).sort({ timestamp: 1 });

    return this.replayEvents(events.map(e => e as ITwinEvent));
  }

  /**
   * Get the event that caused a specific version
   */
  async getEventForVersion(twinId: string, version: number): Promise<TwinEventResponse | null> {
    const event = await TwinEvent.findOne({ twinId, version });
    return event ? toEventResponse(event as ITwinEvent) : null;
  }

  /**
   * Replay events to reconstruct state
   */
  private replayEvents(events: ITwinEvent[]): Record<string, unknown> {
    let state: Record<string, unknown> = {};

    for (const event of events) {
      if (event.action === 'create') {
        state = event.newState || {};
      } else if (event.action === 'update') {
        state = { ...state, ...(event.newState || {}) };
      } else if (event.action === 'snapshot_restored') {
        state = event.newState || {};
      }
      // 'delete' events don't modify state, they just mark the twin as deleted
    }

    return state;
  }

  /**
   * Get event statistics
   */
  async getEventStats(twinId: string): Promise<{
    totalEvents: number;
    firstEvent: Date | null;
    lastEvent: Date | null;
    eventsByAction: Record<string, number>;
  }> {
    const stats = await TwinEvent.aggregate([
      { $match: { twinId } },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          firstEvent: { $min: '$timestamp' },
          lastEvent: { $max: '$timestamp' },
          actions: { $push: '$action' },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalEvents: 0,
        firstEvent: null,
        lastEvent: null,
        eventsByAction: {},
      };
    }

    const eventsByAction: Record<string, number> = {};
    for (const action of stats[0].actions) {
      eventsByAction[action] = (eventsByAction[action] || 0) + 1;
    }

    return {
      totalEvents: stats[0].totalEvents,
      firstEvent: stats[0].firstEvent,
      lastEvent: stats[0].lastEvent,
      eventsByAction,
    };
  }

  /**
   * Delete old events (for cleanup/maintenance)
   */
  async deleteEventsBefore(twinId: string, before: Date): Promise<number> {
    const result = await TwinEvent.deleteMany({
      twinId,
      timestamp: { $lt: before },
    });
    return result.deletedCount;
  }

  /**
   * Get latest event for a twin
   */
  async getLatestEvent(twinId: string): Promise<TwinEventResponse | null> {
    const event = await TwinEvent.findOne({ twinId }).sort({ timestamp: -1 });
    return event ? toEventResponse(event as ITwinEvent) : null;
  }

  /**
   * Search events by metadata
   */
  async searchEvents(
    twinId: string,
    metadataKey: string,
    metadataValue: unknown
  ): Promise<TwinEventResponse[]> {
    const events = await TwinEvent.find({
      twinId,
      [`metadata.${metadataKey}`]: metadataValue,
    }).sort({ timestamp: -1 });

    return events.map(e => toEventResponse(e as ITwinEvent));
  }
}

export const eventService = new EventService();
