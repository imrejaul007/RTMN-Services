import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// In-memory entity store
interface KGNode {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const entityStore: Map<string, KGNode> = new Map([
  ['company-1', { id: 'company-1', type: 'company', name: 'TechCorp Inc', properties: { industry: 'Technology', employees: 5000, founded: 2010, revenue: '$500M' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
  ['company-2', { id: 'company-2', type: 'company', name: 'HealthFirst Medical', properties: { industry: 'Healthcare', employees: 1200, founded: 2005, revenue: '$200M' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
  ['company-3', { id: 'company-3', type: 'company', name: 'Global Retail Chain', properties: { industry: 'Retail', employees: 15000, founded: 1990, revenue: '$5B' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
  ['person-1', { id: 'person-1', type: 'person', name: 'Sarah Johnson', properties: { title: 'CEO', company: 'TechCorp Inc' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
  ['person-2', { id: 'person-2', type: 'person', name: 'Michael Chen', properties: { title: 'VP Sales', company: 'TechCorp Inc' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
  ['product-1', { id: 'product-1', type: 'product', name: 'CloudPlatform', properties: { company: 'TechCorp Inc', category: 'SaaS', price: '$999/mo' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
]);

// GET /entity/:id - Get entity by ID
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const entity = entityStore.get(id);

  if (!entity) {
    res.status(404).json({
      success: false,
      error: `Entity ${id} not found`
    });
    return;
  }

  res.json({
    success: true,
    data: entity
  });
});

// POST /entity - Create entity
router.post('/', (req: Request, res: Response) => {
  const { type, name, properties } = req.body;

  if (!type || !name) {
    res.status(400).json({
      success: false,
      error: 'type and name are required'
    });
    return;
  }

  const id = `${type}-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const entity: KGNode = {
    id,
    type: type.toLowerCase(),
    name,
    properties: properties || {},
    created_at: now,
    updated_at: now
  };

  entityStore.set(id, entity);

  res.status(201).json({
    success: true,
    data: entity
  });
});

// PUT /entity/:id - Update entity
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, properties } = req.body;

  const existing = entityStore.get(id);

  if (!existing) {
    res.status(404).json({
      success: false,
      error: `Entity ${id} not found`
    });
    return;
  }

  const updated: KGNode = {
    ...existing,
    name: name || existing.name,
    properties: { ...existing.properties, ...properties },
    updated_at: new Date().toISOString()
  };

  entityStore.set(id, updated);

  res.json({
    success: true,
    data: updated
  });
});

// DELETE /entity/:id - Delete entity
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!entityStore.has(id)) {
    res.status(404).json({
      success: false,
      error: `Entity ${id} not found`
    });
    return;
  }

  entityStore.delete(id);

  res.json({
    success: true,
    message: `Entity ${id} deleted`
  });
});

export default router;
