import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { twinService } from '../services/twinService.js';
import { eventService } from '../services/eventService.js';
import { snapshotService } from '../services/snapshotService.js';
import { syncService } from '../services/syncService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation schemas
const CreateTwinSchema = z.object({
  type: z.enum(['company', 'person', 'product', 'location', 'event']),
  name: z.string().min(1).max(255),
  state: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tenantId: z.string().optional(),
});

const UpdateTwinSchema = z.object({
  state: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  name: z.string().min(1).max(255).optional(),
});

const PatchStateSchema = z.object({
  patch: z.record(z.unknown()),
});

/**
 * POST /twins - Create a new digital twin
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = CreateTwinSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
      return;
    }

    const twin = await twinService.createTwin(validation.data, 'api');

    // Broadcast creation event
    await syncService.broadcastStateUpdate(twin.id, twin.state, twin.version);

    res.status(201).json(twin);
  } catch (error) {
    logger.error('Error creating twin:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to create twin' });
  }
});

/**
 * GET /twins - List all twins with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, tenantId, limit, offset } = req.query;

    const result = await twinService.listTwins({
      type: type as string,
      tenantId: tenantId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error listing twins:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to list twins' });
  }
});

/**
 * GET /twins/:id - Get a twin by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const twin = await twinService.getTwinById(req.params.id);

    if (!twin) {
      res.status(404).json({ error: 'Twin not found' });
      return;
    }

    res.json(twin);
  } catch (error) {
    logger.error('Error getting twin:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get twin' });
  }
});

/**
 * GET /twins/:id/full - Get twin with relationships
 */
router.get('/:id/full', async (req: Request, res: Response) => {
  try {
    const result = await twinService.getTwinWithRelationships(req.params.id);

    if (!result) {
      res.status(404).json({ error: 'Twin not found' });
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error('Error getting twin with relationships:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get twin details' });
  }
});

/**
 * PATCH /twins/:id - Update a twin
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const validation = UpdateTwinSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
      return;
    }

    const twin = await twinService.updateTwin(req.params.id, validation.data, 'api');

    if (!twin) {
      res.status(404).json({ error: 'Twin not found' });
      return;
    }

    // Broadcast update
    await syncService.broadcastStateUpdate(twin.id, twin.state, twin.version);

    res.json(twin);
  } catch (error) {
    logger.error('Error updating twin:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to update twin' });
  }
});

/**
 * PUT /twins/:id/state - Full state replacement
 */
router.put('/:id/state', async (req: Request, res: Response) => {
  try {
    const twin = await twinService.updateTwin(
      req.params.id,
      { state: req.body },
      'api'
    );

    if (!twin) {
      res.status(404).json({ error: 'Twin not found' });
      return;
    }

    // Broadcast update
    await syncService.broadcastStateUpdate(twin.id, twin.state, twin.version);

    res.json(twin);
  } catch (error) {
    logger.error('Error replacing twin state:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to replace twin state' });
  }
});

/**
 * PATCH /twins/:id/state - Partial state update
 */
router.patch('/:id/state', async (req: Request, res: Response) => {
  try {
    const validation = PatchStateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
      return;
    }

    const twin = await twinService.patchTwinState(req.params.id, validation.data.patch, 'api');

    if (!twin) {
      res.status(404).json({ error: 'Twin not found' });
      return;
    }

    // Broadcast update
    await syncService.broadcastStateUpdate(twin.id, twin.state, twin.version);

    res.json(twin);
  } catch (error) {
    logger.error('Error patching twin state:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to patch twin state' });
  }
});

/**
 * DELETE /twins/:id - Delete a twin
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await twinService.deleteTwin(req.params.id, 'api');

    if (!deleted) {
      res.status(404).json({ error: 'Twin not found' });
      return;
    }

    // Broadcast deletion
    await syncService.broadcastTwinDeleted(req.params.id);

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting twin:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to delete twin' });
  }
});

/**
 * GET /twins/:id/history - Get event history
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { action, since, until, limit, offset } = req.query;

    const result = await eventService.getEventHistory(req.params.id, {
      action: action as string,
      since: since ? new Date(since as string) : undefined,
      until: until ? new Date(until as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error getting event history:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get event history' });
  }
});

/**
 * GET /twins/:id/history/stats - Get event statistics
 */
router.get('/:id/history/stats', async (req: Request, res: Response) => {
  try {
    const stats = await eventService.getEventStats(req.params.id);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting event stats:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get event stats' });
  }
});

/**
 * GET /twins/:id/snapshot - Get latest snapshot or create one
 */
router.get('/:id/snapshot', async (req: Request, res: Response) => {
  try {
    const { create, label } = req.query;

    if (create === 'true') {
      // Create a new snapshot
      const snapshot = await snapshotService.createSnapshot(req.params.id, {
        label: label as string,
      });

      if (!snapshot) {
        res.status(404).json({ error: 'Twin not found' });
        return;
      }

      // Broadcast snapshot creation
      await syncService.broadcastSnapshotCreated(req.params.id, snapshot as unknown as Record<string, unknown>);

      res.status(201).json(snapshot);
    } else {
      // Get latest snapshot
      const snapshot = await snapshotService.getLatestSnapshot(req.params.id);

      if (!snapshot) {
        res.status(404).json({ error: 'No snapshot found for this twin' });
        return;
      }

      res.json(snapshot);
    }
  } catch (error) {
    logger.error('Error getting/creating snapshot:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get/create snapshot' });
  }
});

/**
 * GET /twins/:id/snapshots - List all snapshots
 */
router.get('/:id/snapshots', async (req: Request, res: Response) => {
  try {
    const { since, until, limit, offset } = req.query;

    const result = await snapshotService.getSnapshots(req.params.id, {
      since: since ? new Date(since as string) : undefined,
      until: until ? new Date(until as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error listing snapshots:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to list snapshots' });
  }
});

/**
 * POST /twins/:id/restore - Restore to a snapshot
 */
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { snapshotId, version } = req.body;

    let result;
    if (snapshotId) {
      result = await snapshotService.restoreSnapshot(req.params.id, snapshotId, 'api');
    } else if (version !== undefined) {
      result = await snapshotService.restoreToVersion(req.params.id, version, 'api');
    } else {
      res.status(400).json({ error: 'Either snapshotId or version is required' });
      return;
    }

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Broadcast state update after restore
    if (result.twin) {
      await syncService.broadcastStateUpdate(req.params.id, result.twin.state, result.twin.version);
    }

    res.json(result.twin);
  } catch (error) {
    logger.error('Error restoring twin:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to restore twin' });
  }
});

/**
 * GET /twins/:id/state-at - Get state at a specific point in time
 */
router.get('/:id/state-at', async (req: Request, res: Response) => {
  try {
    const { timestamp } = req.query;

    if (!timestamp) {
      res.status(400).json({ error: 'timestamp query parameter is required' });
      return;
    }

    const state = await eventService.getStateAtTime(req.params.id, new Date(timestamp as string));

    if (!state) {
      res.status(404).json({ error: 'No state found at the specified time' });
      return;
    }

    res.json({ twinId: req.params.id, timestamp, state });
  } catch (error) {
    logger.error('Error getting state at time:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get state at time' });
  }
});

/**
 * GET /twins/:id/relationships - Get relationships (implemented in relationships.ts)
 * This route is registered here for completeness but handled in relationships.ts
 */

export default router;
