/**
 * Nexha CorpID Sync Service
 *
 * This service integrates Nexha Commerce Network with CorpID v2.0:
 * - Every merchant, supplier, distributor gets a CorpID
 * - Trust relationships are tracked across the commerce network
 * - CorpID assertions validate business credentials
 *
 * Entity Types:
 * - CI-SUP: Supplier
 * - CI-MER: Merchant (Nexha franchise)
 * - CI-FRN: Franchise
 * - CI-DST: Distributor
 * - CI-MFG: Manufacturer
 */

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { randomBytes } from 'crypto';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Config
const PORT = parseInt(process.env.PORT || '4390', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexha-corpid';

// CorpID Service
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const CORPID_TOKEN = process.env.CORPID_TOKEN || 'corpid-internal-token';

// Nexha Service URLs
const DISTRIBUTION_URL = process.env.DISTRIBUTION_URL || 'http://localhost:4300';
const FRANCHISE_URL = process.env.FRANCHISE_URL || 'http://localhost:4310';
const PROCUREMENT_URL = process.env.PROCUREMENT_URL || 'http://localhost:4320';
const MANUFACTURING_URL = process.env.MANUFACTURING_URL || 'http://localhost:4330';

// =============================================================================
// MODELS - Local sync tracking
// =============================================================================

const entityMappingSchema = new mongoose.Schema({
  nexhaEntityId: { type: String, required: true, unique: true, index: true },
  nexhaEntityType: {
    type: String,
    enum: ['MERCHANT', 'SUPPLIER', 'DISTRIBUTOR', 'FRANCHISE', 'MANUFACTURER'],
    required: true
  },
  corpId: { type: String, required: true, index: true },
  entityName: String,
  status: { type: String, enum: ['PENDING', 'SYNCED', 'ERROR'], default: 'PENDING' },
  lastSyncAt: Date,
  syncError: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const EntityMapping = mongoose.model('EntityMapping', entityMappingSchema);

// CorpID Entity type mapping
const ENTITY_TYPE_MAP: Record<string, string> = {
  MERCHANT: 'MERCHANT',      // CI-MER
  SUPPLIER: 'SUPPLIER',      // CI-SUP
  DISTRIBUTOR: 'SUPPLIER',   // CI-SUP (similar)
  FRANCHISE: 'FRANCHISE',    // CI-FRN
  MANUFACTURER: 'BUSINESS'   // CI-BIZ
};

// =============================================================================
// HELPERS
// =============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

async function createCorpId(entityType: string, data: any): Promise<string | null> {
  try {
    const url = `${CORPID_URL}/identities/${entityType.toLowerCase()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': CORPID_TOKEN
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (result.success && result.data?.corpId) {
      return result.data.corpId;
    }
    return null;
  } catch (error) {
    console.error('Failed to create CorpID:', error);
    return null;
  }
}

async function getCorpIdDetails(corpId: string): Promise<any> {
  try {
    const response = await fetch(`${CORPID_URL}/identities/${corpId}`, {
      method: 'GET',
      headers: {
        'x-internal-token': CORPID_TOKEN
      }
    });
    return await response.json();
  } catch {
    return null;
  }
}

async function createTrustRelationship(fromCorpId: string, toCorpId: string, type: string): Promise<boolean> {
  try {
    const response = await fetch(`${CORPID_URL}/relationships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': CORPID_TOKEN
      },
      body: JSON.stringify({
        fromCorpId,
        toCorpId,
        relationshipType: type,
        metadata: { source: 'nexha', syncedAt: new Date().toISOString() }
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// ROUTES
// =============================================================================

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'nexha-corpid-sync',
    tagline: 'Connecting Nexha Commerce Network to CorpID',
    timestamp: new Date().toISOString()
  });
});

// Info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Nexha CorpID Sync Service',
    tagline: 'Universal Identity for Commerce Networks',
    description: 'Every merchant, supplier, distributor gets a CorpID',
    entityTypes: {
      'MERCHANT': 'CI-MER - Nexha franchise merchants',
      'SUPPLIER': 'CI-SUP - Raw material suppliers',
      'DISTRIBUTOR': 'CI-SUP - Wholesale distributors',
      'FRANCHISE': 'CI-FRN - Multi-location franchises',
      'MANUFACTURER': 'CI-BIZ - Manufacturing partners'
    },
    endpoints: {
      'POST /sync/entity': 'Sync entity from Nexha to CorpID',
      'POST /sync/bulk': 'Bulk sync multiple entities',
      'GET /entity/:nexhaId': 'Get CorpID for Nexha entity',
      'GET /corpId/:corpId': 'Get Nexha entity for CorpID',
      'POST /relationships': 'Create trust relationship',
      'GET /network/:corpId': 'Get trust network',
      'GET /stats': 'Sync statistics'
    }
  });
});

// =============================================================================
// SYNC ENTITY
// =============================================================================

app.post('/sync/entity', async (req: Request, res: Response) => {
  try {
    const { nexhaEntityId, nexhaEntityType, entityName, metadata } = req.body;

    if (!nexhaEntityId || !nexhaEntityType) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'nexhaEntityId and nexhaEntityType are required' }
      });
    }

    // Check if already synced
    const existing = await EntityMapping.findOne({ nexhaEntityId });
    if (existing) {
      return res.json({
        success: true,
        data: {
          alreadySynced: true,
          nexhaEntityId: existing.nexhaEntityId,
          corpId: existing.corpId,
          status: existing.status
        }
      });
    }

    // Map to CorpID entity type
    const corpIdEntityType = ENTITY_TYPE_MAP[nexhaEntityType] || 'BUSINESS';

    // Create CorpID
    const corpIdData = {
      name: entityName || nexhaEntityId,
      type: corpIdEntityType,
      metadata: {
        source: 'nexha',
        nexhaEntityType,
        nexhaEntityId,
        ...metadata
      }
    };

    const corpId = await createCorpId(corpIdEntityType, corpIdData);

    if (!corpId) {
      return res.status(500).json({
        success: false,
        error: { code: 'CORPID_ERROR', message: 'Failed to create CorpID' }
      });
    }

    // Save mapping
    const mapping = new EntityMapping({
      nexhaEntityId,
      nexhaEntityType,
      corpId,
      entityName,
      status: 'SYNCED',
      lastSyncAt: new Date(),
      metadata
    });

    await mapping.save();

    res.status(201).json({
      success: true,
      data: {
        nexhaEntityId,
        nexhaEntityType,
        corpId,
        corpIdEntityType,
        status: 'SYNCED',
        message: `${nexhaEntityType} now has CorpID: ${corpId}`
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// =============================================================================
// BULK SYNC
// =============================================================================

app.post('/sync/bulk', async (req: Request, res: Response) => {
  try {
    const { entities } = req.body;

    if (!entities || !Array.isArray(entities)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'entities array is required' }
      });
    }

    const results = [];
    let synced = 0;
    let failed = 0;

    for (const entity of entities) {
      try {
        // Check if exists
        const existing = await EntityMapping.findOne({ nexhaEntityId: entity.nexhaEntityId });

        if (existing) {
          results.push({
            nexhaEntityId: entity.nexhaEntityId,
            status: 'ALREADY_EXISTS',
            corpId: existing.corpId
          });
          continue;
        }

        const corpIdEntityType = ENTITY_TYPE_MAP[entity.nexhaEntityType] || 'BUSINESS';
        const corpId = await createCorpId(corpIdEntityType, {
          name: entity.entityName || entity.nexhaEntityId,
          type: corpIdEntityType,
          metadata: {
            source: 'nexha',
            nexhaEntityType: entity.nexhaEntityType,
            nexhaEntityId: entity.nexhaEntityId,
            ...entity.metadata
          }
        });

        if (corpId) {
          const mapping = new EntityMapping({
            nexhaEntityId: entity.nexhaEntityId,
            nexhaEntityType: entity.nexhaEntityType,
            corpId,
            entityName: entity.entityName,
            status: 'SYNCED',
            lastSyncAt: new Date(),
            metadata: entity.metadata
          });

          await mapping.save();
          results.push({ nexhaEntityId: entity.nexhaEntityId, status: 'SYNCED', corpId });
          synced++;
        } else {
          results.push({ nexhaEntityId: entity.nexhaEntityId, status: 'FAILED' });
          failed++;
        }
      } catch {
        results.push({ nexhaEntityId: entity.nexhaEntityId, status: 'FAILED' });
        failed++;
      }
    }

    res.status(201).json({
      success: true,
      data: {
        total: entities.length,
        synced,
        failed,
        alreadyExists: entities.length - synced - failed,
        results
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// =============================================================================
// GET CORPID FOR NEXHA ENTITY
// =============================================================================

app.get('/entity/:nexhaId', async (req: Request, res: Response) => {
  try {
    const { nexhaId } = req.params;

    const mapping = await EntityMapping.findOne({ nexhaEntityId: nexhaId });

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Entity not synced with CorpID' }
      });
    }

    // Get full CorpID details
    const corpIdDetails = await getCorpIdDetails(mapping.corpId);

    res.json({
      success: true,
      data: {
        nexhaEntityId: mapping.nexhaEntityId,
        nexhaEntityType: mapping.nexhaEntityType,
        corpId: mapping.corpId,
        entityName: mapping.entityName,
        status: mapping.status,
        lastSyncAt: mapping.lastSyncAt,
        corpIdDetails: corpIdDetails?.data || null
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// =============================================================================
// GET NEXHA ENTITY FOR CORPID
// =============================================================================

app.get('/corpId/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;

    const mapping = await EntityMapping.findOne({ corpId });

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'CorpID not mapped to Nexha' }
      });
    }

    res.json({
      success: true,
      data: {
        corpId: mapping.corpId,
        nexhaEntityId: mapping.nexhaEntityId,
        nexhaEntityType: mapping.nexhaEntityType,
        entityName: mapping.entityName,
        status: mapping.status
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// =============================================================================
// CREATE TRUST RELATIONSHIP
// =============================================================================

app.post('/relationships', async (req: Request, res: Response) => {
  try {
    const { fromNexhaId, toNexhaId, relationshipType, metadata } = req.body;

    // Get CorpIDs
    const [fromMapping, toMapping] = await Promise.all([
      EntityMapping.findOne({ nexhaEntityId: fromNexhaId }),
      EntityMapping.findOne({ nexhaEntityId: toNexhaId })
    ]);

    if (!fromMapping || !toMapping) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'One or both entities not synced with CorpID' }
      });
    }

    // Map Nexha relationship type to CorpID relationship type
    const relationshipTypeMap: Record<string, string> = {
      'SUPPLIES_TO': 'SUPPLIES_TO',
      'DISTRIBUTES_TO': 'SUPPLIES_TO',
      'WORKS_WITH': 'WORKS_WITH',
      'FRANCHISED_TO': 'CLIENT_OF',
      'MANUFACTURES_FOR': 'SUPPLIES_TO'
    };

    const corpIdRelationType = relationshipTypeMap[relationshipType] || relationshipType;

    const success = await createTrustRelationship(
      fromMapping.corpId,
      toMapping.corpId,
      corpIdRelationType
    );

    if (success) {
      res.status(201).json({
        success: true,
        data: {
          fromCorpId: fromMapping.corpId,
          toCorpId: toMapping.corpId,
          relationshipType: corpIdRelationType,
          message: 'Trust relationship created'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: { code: 'CORPID_ERROR', message: 'Failed to create relationship' }
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// =============================================================================
// GET TRUST NETWORK
// =============================================================================

app.get('/network/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;

    // Get CorpID graph
    try {
      const response = await fetch(`${CORPID_URL}/graph/${corpId}?depth=2`, {
        method: 'GET',
        headers: {
          'x-internal-token': CORPID_TOKEN
        }
      });

      const graphData = await response.json();

      // Map CorpIDs back to Nexha entities
      const network = [];
      if (graphData.data?.relationships) {
        for (const rel of graphData.data.relationships) {
          const mapping = await EntityMapping.findOne({ corpId: rel.toCorpId });
          network.push({
            ...rel,
            nexhaEntityId: mapping?.nexhaEntityId || null,
            nexhaEntityType: mapping?.nexhaEntityType || null,
            entityName: mapping?.entityName || null
          });
        }
      }

      res.json({
        success: true,
        data: {
          corpId,
          network,
          graph: graphData.data
        }
      });
    } catch {
      res.status(502).json({
        success: false,
        error: { code: 'CORPID_ERROR', message: 'Failed to fetch CorpID graph' }
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// =============================================================================
// STATISTICS
// =============================================================================

app.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [total, synced, pending, error, byType] = await Promise.all([
      EntityMapping.countDocuments(),
      EntityMapping.countDocuments({ status: 'SYNCED' }),
      EntityMapping.countDocuments({ status: 'PENDING' }),
      EntityMapping.countDocuments({ status: 'ERROR' }),
      EntityMapping.aggregate([
        { $group: { _id: '$nexhaEntityType', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalEntities: total,
        synced: synced,
        pending: pending,
        errors: error,
        syncRate: total > 0 ? `${((synced / total) * 100).toFixed(1)}%` : 'N/A',
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// =============================================================================
// SYNC FROM NEXHA SERVICES
// =============================================================================

// Sync from DistributionOS
app.post('/sync/distribution/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Fetch from DistributionOS
    try {
      const response = await fetch(`${DISTRIBUTION_URL}/distributors/${entityId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        return res.status(502).json({
          success: false,
          error: { code: 'DISTRIBUTION_ERROR', message: 'Failed to fetch from DistributionOS' }
        });
      }

      const data = await response.json();

      // Sync to CorpID
      const mapping = new EntityMapping({
        nexhaEntityId: entityId,
        nexhaEntityType: 'DISTRIBUTOR',
        corpId: '', // Will be filled by sync
        entityName: data.name || data.companyName,
        status: 'PENDING'
      });

      // Create CorpID
      const corpId = await createCorpId('SUPPLIER', {
        name: data.name || data.companyName,
        type: 'SUPPLIER',
        metadata: {
          source: 'nexha',
          nexhaEntityType: 'DISTRIBUTOR',
          nexhaEntityId: entityId,
          ...data
        }
      });

      if (corpId) {
        mapping.corpId = corpId;
        mapping.status = 'SYNCED';
        mapping.lastSyncAt = new Date();
      }

      await mapping.save();

      res.json({
        success: true,
        data: {
          nexhaEntityId: entityId,
          entityType: 'DISTRIBUTOR',
          corpId: mapping.corpId || null,
          status: mapping.status
        }
      });
    } catch {
      res.status(502).json({
        success: false,
        error: { code: 'CONNECTION_ERROR', message: 'Failed to connect to DistributionOS' }
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Nexha CorpID Sync Error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message }
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' }
  });
});

// =============================================================================
// START SERVER
// =============================================================================

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await EntityMapping.createIndexes();

    app.listen(PORT, () => {
      logger.info(
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   NEXHA CORPID SYNC SERVICE                                        ║
║   Universal Identity for Commerce Networks                          ║
║                                                                      ║
║   Port: ${PORT}                                                      ║
║                                                                      ║
║   Entity Types:                                                     ║
║   • MERCHANT (CI-MER) - Nexha franchises                           ║
║   • SUPPLIER (CI-SUP) - Raw material suppliers                    ║
║   • DISTRIBUTOR (CI-SUP) - Wholesale distributors                  ║
║   • FRANCHISE (CI-FRN) - Multi-location franchises                ║
║   • MANUFACTURER (CI-BIZ) - Manufacturing partners                ║
║                                                                      ║
║   Integration:                                                      ║
║   • CorpID: ${CORPID_URL}                         ║
║   • DistributionOS: ${DISTRIBUTION_URL}     ║
║   • FranchiseOS: ${FRANCHISE_URL}              ║
║   • ProcurementOS: ${PROCUREMENT_URL}          ║
║   • ManufacturingOS: ${MANUFACTURING_URL}   ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, EntityMapping };
