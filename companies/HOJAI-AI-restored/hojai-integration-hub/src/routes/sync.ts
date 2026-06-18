import { Router, Request, Response } from 'express';
import { SyncLog } from '../models/SyncLog';
import { Connector } from '../models/Connector';
import { ShopifyConnector } from '../connectors/shopify';
import { StripeConnector } from '../connectors/stripe';

const router = Router();

// Get all sync logs
router.get('/', async (req: Request, res: Response) => {
  try {
    const { connector, entityType, status, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (connector) query.connectorName = connector;
    if (entityType) query.entityType = entityType;
    if (status) query.status = status;

    const logs = await SyncLog.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('connector', 'name displayName type');

    const total = await SyncLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// Get sync log by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const log = await SyncLog.findById(req.params.id).populate('connector', 'name displayName type');
    if (!log) {
      return res.status(404).json({ error: 'Sync log not found' });
    }
    res.json(log);
  } catch (error) {
    console.error('Error fetching sync log:', error);
    res.status(500).json({ error: 'Failed to fetch sync log' });
  }
});

// Trigger sync for a connector
router.post('/trigger/:connector/:entity', async (req: Request, res: Response) => {
  try {
    const { connector: connectorName, entity } = req.params;
    const { direction = 'pull', options = {} } = req.body;

    const connector = await Connector.findOne({ name: connectorName });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    if (connector.status !== 'connected') {
      return res.status(400).json({ error: 'Connector not connected' });
    }

    // Create sync log
    const syncLog = new SyncLog({
      connector: connector._id,
      connectorName,
      entityType: entity,
      direction,
      status: 'in_progress'
    });
    await syncLog.start();

    try {
      // Get connector instance
      let instance;
      switch (connectorName) {
        case 'shopify':
          instance = new ShopifyConnector(connector.credentials as any);
          break;
        case 'stripe':
          instance = new StripeConnector(connector.credentials as any);
          break;
        default:
          throw new Error(`Unsupported connector: ${connectorName}`);
      }

      // Perform sync
      const result = await instance.sync(entity, direction);

      // Complete sync log
      await syncLog.complete({
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsFailed: result.recordsFailed
      });

      // Update connector
      connector.markSyncComplete();

      res.json({
        success: true,
        syncLog,
        result
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      await syncLog.fail(errorMessage);
      connector.markError(errorMessage);

      res.status(500).json({
        success: false,
        syncLog,
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// Trigger bidirectional sync (full sync)
router.post('/full/:connector', async (req: Request, res: Response) => {
  try {
    const { connector: connectorName } = req.params;
    const { entities } = req.body;

    const connector = await Connector.findOne({ name: connectorName });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    if (connector.status !== 'connected') {
      return res.status(400).json({ error: 'Connector not connected' });
    }

    // Get entity types
    let instance;
    switch (connectorName) {
      case 'shopify':
        instance = new ShopifyConnector(connector.credentials as any);
        break;
      case 'stripe':
        instance = new StripeConnector(connector.credentials as any);
        break;
      default:
        return res.status(400).json({ error: `Unsupported connector: ${connectorName}` });
    }

    const entityTypes = entities || instance.getEntityTypes();
    const results = [];

    for (const entity of entityTypes) {
      const syncLog = new SyncLog({
        connector: connector._id,
        connectorName,
        entityType: entity,
        direction: 'bidirectional',
        status: 'in_progress'
      });
      await syncLog.start();

      try {
        const result = await instance.sync(entity, 'bidirectional');
        await syncLog.complete({
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          recordsFailed: result.recordsFailed
        });

        results.push({ entity, success: true, result, syncLog });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sync failed';
        await syncLog.fail(errorMessage);
        results.push({ entity, success: false, error: errorMessage, syncLog });
      }
    }

    // Update connector
    connector.markSyncComplete();

    res.json({
      success: true,
      connector: connectorName,
      entityCount: results.length,
      results
    });
  } catch (error) {
    console.error('Error triggering full sync:', error);
    res.status(500).json({ error: 'Failed to trigger full sync' });
  }
});

// Get sync stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { connector, period = '7d' } = req.query;

    const query: any = {};
    if (connector) query.connectorName = connector;

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    query.createdAt = { $gte: startDate };

    // Aggregate stats
    const stats = await SyncLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: { status: '$status', connector: '$connectorName' },
          count: { $sum: 1 },
          totalRecords: { $sum: '$recordsProcessed' },
          totalCreated: { $sum: '$recordsCreated' },
          totalUpdated: { $sum: '$recordsUpdated' },
          totalFailed: { $sum: '$recordsFailed' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    // Summary by connector
    const byConnector = await SyncLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$connectorName',
          totalSyncs: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          totalRecords: { $sum: '$recordsProcessed' }
        }
      }
    ]);

    // Recent activity
    const recent = await SyncLog.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('connector', 'name displayName');

    res.json({
      period,
      stats,
      byConnector,
      recent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sync stats:', error);
    res.status(500).json({ error: 'Failed to fetch sync stats' });
  }
});

// Delete sync log
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const log = await SyncLog.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Sync log not found' });
    }
    res.json({ message: 'Sync log deleted', log });
  } catch (error) {
    console.error('Error deleting sync log:', error);
    res.status(500).json({ error: 'Failed to delete sync log' });
  }
});

// Clean old sync logs
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { olderThanDays = 30, status } = req.body;

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const query: any = { createdAt: { $lt: cutoffDate } };
    if (status) query.status = status;

    const result = await SyncLog.deleteMany(query);

    res.json({
      success: true,
      deleted: result.deletedCount,
      olderThan: olderThanDays,
      status: status || 'all'
    });
  } catch (error) {
    console.error('Error cleaning up sync logs:', error);
    res.status(500).json({ error: 'Failed to cleanup sync logs' });
  }
});

export { router as syncRoutes };
