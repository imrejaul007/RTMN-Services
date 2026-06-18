import { Router, Request, Response } from 'express';
import { Connector } from '../models/Connector';
import { SyncLog } from '../models/SyncLog';
import { ShopifyConnector } from '../connectors/shopify';
import { StripeConnector } from '../connectors/stripe';

const router = Router();

// In-memory connector instances
const connectorInstances: Record<string, any> = {};

// Get all connectors
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, status, isActive } = req.query;

    const query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const connectors = await Connector.find(query).sort({ displayName: 1 });
    res.json({ connectors });
  } catch (error) {
    console.error('Error fetching connectors:', error);
    res.status(500).json({ error: 'Failed to fetch connectors' });
  }
});

// Get connector by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const connector = await Connector.findById(req.params.id);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }
    res.json(connector);
  } catch (error) {
    console.error('Error fetching connector:', error);
    res.status(500).json({ error: 'Failed to fetch connector' });
  }
});

// Get connector by name
router.get('/name/:name', async (req: Request, res: Response) => {
  try {
    const connector = await Connector.findOne({ name: req.params.name });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }
    res.json(connector);
  } catch (error) {
    console.error('Error fetching connector:', error);
    res.status(500).json({ error: 'Failed to fetch connector' });
  }
});

// Connect (configure) a connector
router.post('/:name/connect', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { credentials, config } = req.body;

    if (!credentials) {
      return res.status(400).json({ error: 'Credentials required' });
    }

    const connector = await Connector.findOne({ name });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    // Initialize connector instance
    let instance;
    switch (name) {
      case 'shopify':
        instance = new ShopifyConnector({ ...credentials, shopName: credentials.shopName });
        break;
      case 'stripe':
        instance = new StripeConnector(credentials);
        break;
      default:
        return res.status(400).json({ error: `Unsupported connector: ${name}` });
    }

    // Test connection
    const testResult = await instance.testConnection();
    if (!testResult.success) {
      return res.status(400).json({ error: `Connection test failed: ${testResult.error}` });
    }

    // Update connector
    connector.credentials = { ...connector.credentials, ...credentials };
    if (config) connector.config = { ...connector.config, ...config };
    connector.status = 'connected';
    await connector.save();

    // Store instance
    connectorInstances[name] = instance;

    res.json({
      success: true,
      connector,
      message: `${name} connected successfully`
    });
  } catch (error) {
    console.error('Error connecting:', error);
    res.status(500).json({ error: 'Failed to connect' });
  }
});

// Disconnect a connector
router.post('/:name/disconnect', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const connector = await Connector.findOne({ name });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    connector.status = 'disconnected';
    connector.credentials = {};
    await connector.save();

    // Remove instance
    delete connectorInstances[name];

    res.json({
      success: true,
      connector,
      message: `${name} disconnected successfully`
    });
  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Test connection
router.get('/:name/test', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const connector = await Connector.findOne({ name });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    if (connector.status !== 'connected') {
      return res.json({
        success: false,
        error: 'Connector not connected'
      });
    }

    // Get or create instance
    let instance = connectorInstances[name];
    if (!instance) {
      switch (name) {
        case 'shopify':
          instance = new ShopifyConnector(connector.credentials as any);
          break;
        case 'stripe':
          instance = new StripeConnector(connector.credentials as any);
          break;
        default:
          return res.status(400).json({ error: `Unsupported connector: ${name}` });
      }
      connectorInstances[name] = instance;
    }

    const result = await instance.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Get connector entities
router.get('/:name/entities', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const connector = await Connector.findOne({ name });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    // Get or create instance
    let instance = connectorInstances[name];
    if (!instance) {
      switch (name) {
        case 'shopify':
          instance = new ShopifyConnector(connector.credentials as any);
          break;
        case 'stripe':
          instance = new StripeConnector(connector.credentials as any);
          break;
        default:
          return res.status(400).json({ error: `Unsupported connector: ${name}` });
      }
      connectorInstances[name] = instance;
    }

    const entities = instance.getEntityTypes();
    res.json({ connector: name, entities });
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// Fetch data from connector
router.get('/:name/fetch/:entity', async (req: Request, res: Response) => {
  const { name, entity } = req.params;
  const { limit, since_id } = req.query;

  try {
    const connector = await Connector.findOne({ name });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    // Get or create instance
    let instance = connectorInstances[name];
    if (!instance) {
      switch (name) {
        case 'shopify':
          instance = new ShopifyConnector(connector.credentials as any);
          break;
        case 'stripe':
          instance = new StripeConnector(connector.credentials as any);
          break;
        default:
          return res.status(400).json({ error: `Unsupported connector: ${name}` });
      }
      connectorInstances[name] = instance;
    }

    const data = await instance.fetch(entity, { limit, since_id });
    res.json({ connector: name, entity, count: data.length, data });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: `Failed to fetch ${entity}` });
  }
});

// Push data to connector
router.post('/:name/push/:entity', async (req: Request, res: Response) => {
  const { name, entity } = req.params;
  const { data } = req.body;

  try {
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Data array required' });
    }

    const connector = await Connector.findOne({ name });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    // Get or create instance
    let instance = connectorInstances[name];
    if (!instance) {
      switch (name) {
        case 'shopify':
          instance = new ShopifyConnector(connector.credentials as any);
          break;
        case 'stripe':
          instance = new StripeConnector(connector.credentials as any);
          break;
        default:
          return res.status(400).json({ error: `Unsupported connector: ${name}` });
      }
      connectorInstances[name] = instance;
    }

    const result = await instance.push(entity, data);
    res.json({ connector: name, entity, result });
  } catch (error) {
    console.error('Error pushing data:', error);
    res.status(500).json({ error: `Failed to push ${entity}` });
  }
});

// Update connector config
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { displayName, config, isActive } = req.body;

    const connector = await Connector.findById(req.params.id);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    if (displayName) connector.displayName = displayName;
    if (config) connector.config = { ...connector.config, ...config };
    if (isActive !== undefined) connector.isActive = isActive;

    await connector.save();
    res.json(connector);
  } catch (error) {
    console.error('Error updating connector:', error);
    res.status(500).json({ error: 'Failed to update connector' });
  }
});

// Delete connector
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const connector = await Connector.findByIdAndDelete(req.params.id);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    // Remove instance
    delete connectorInstances[connector.name];

    res.json({ message: 'Connector deleted', connector });
  } catch (error) {
    console.error('Error deleting connector:', error);
    res.status(500).json({ error: 'Failed to delete connector' });
  }
});

// Get connector stats
router.get('/:name/stats', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const connector = await Connector.findOne({ name });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    const syncStats = await SyncLog.aggregate([
      { $match: { connectorName: name } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRecords: { $sum: '$recordsProcessed' }
        }
      }
    ]);

    const recentSyncs = await SyncLog.find({ connectorName: name })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      connector: name,
      status: connector.status,
      lastSync: connector.lastSyncAt,
      syncStats,
      recentSyncs
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export { router as integrationRoutes };
