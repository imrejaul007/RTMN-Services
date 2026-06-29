/**
 * Ontology Routes - API endpoints for the Ontology Engine
 */

import { Router, Request, Response, NextFunction } from 'express';
import { classService } from '../services/classService.js';
import { propertyService } from '../services/propertyService.js';
import { relationshipTypeService } from '../services/relationshipTypeService.js';
import { constraintService } from '../services/constraintService.js';
import { validationService } from '../services/validationService.js';
import { inferenceEngine } from '../inference/inferenceEngine.js';
import { taxonomyService } from '../services/taxonomyService.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import type {
  CreateClassRequest,
  UpdateClassRequest,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  CreateConstraintRequest,
  ValidateEntityRequest,
  InferRequest,
  TaxonomyCreateRequest,
  TaxonomyUpdateRequest,
  TraversalOptions
} from '../models/types.js';

const router = Router();

// ============================================
// HEALTH & INFO ENDPOINTS
// ============================================

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ontology-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    capabilities: [
      'classes',
      'properties',
      'relationships',
      'constraints',
      'validation',
      'inference',
      'taxonomy'
    ]
  });
});

router.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ============================================
// CLASS ENDPOINTS
// ============================================

// Create a class
router.post('/ontology/classes', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: CreateClassRequest = req.body;
    if (!data.name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const classData = await classService.create(data);
    res.status(201).json(classData);
  } catch (error) {
    next(error);
  }
});

// Get all classes
router.get('/ontology/classes', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { includeProperties, includeInherited } = req.query;
    const classes = await classService.getAll({
      includeProperties: includeProperties === 'true',
      includeInherited: includeInherited === 'true'
    });
    res.json({ classes, total: classes.length });
  } catch (error) {
    next(error);
  }
});

// Get a class by ID
router.get('/ontology/classes/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classData = await classService.getById(req.params.id);
    if (!classData) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }
    res.json(classData);
  } catch (error) {
    next(error);
  }
});

// Update a class
router.put('/ontology/classes/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: UpdateClassRequest = req.body;
    const classData = await classService.update(req.params.id, data);
    if (!classData) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }
    res.json(classData);
  } catch (error) {
    next(error);
  }
});

// Delete a class
router.delete('/ontology/classes/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await classService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get class hierarchy (ancestors)
router.get('/ontology/classes/:id/hierarchy', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchy = await classService.getHierarchy(req.params.id);
    res.json({ hierarchy, total: hierarchy.length });
  } catch (error) {
    next(error);
  }
});

// Get class children
router.get('/ontology/classes/:id/children', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const children = await classService.getChildren(req.params.id);
    res.json({ children, total: children.length });
  } catch (error) {
    next(error);
  }
});

// Get class lineage (root to this class)
router.get('/ontology/classes/:id/lineage', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lineage = await classService.getLineage(req.params.id);
    res.json({ lineage, total: lineage.length });
  } catch (error) {
    next(error);
  }
});

// Check if class is subclass of another
router.get('/ontology/classes/:id/is-subclass-of/:ancestorId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isSubclass = await classService.isSubclassOf(req.params.id, req.params.ancestorId);
    res.json({ isSubclassOf: isSubclass });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PROPERTY ENDPOINTS
// ============================================

// Create a property
router.post('/ontology/properties', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: CreatePropertyRequest = req.body;
    if (!data.name || !data.classId || !data.dataType) {
      res.status(400).json({ error: 'name, classId, and dataType are required' });
      return;
    }

    const property = await propertyService.create(data);
    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
});

// Get all properties for a class
router.get('/ontology/properties', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId, includeInherited } = req.query;

    if (!classId) {
      res.status(400).json({ error: 'classId query parameter is required' });
      return;
    }

    const properties = includeInherited === 'true'
      ? await propertyService.getAllForClassIncludingInherited(classId as string)
      : await propertyService.getByClassId(classId as string);

    res.json({ properties, total: properties.length });
  } catch (error) {
    next(error);
  }
});

// Get a property by ID
router.get('/ontology/properties/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const property = await propertyService.getById(req.params.id);
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    res.json(property);
  } catch (error) {
    next(error);
  }
});

// Update a property
router.put('/ontology/properties/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: UpdatePropertyRequest = req.body;
    const property = await propertyService.update(req.params.id, data);
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    res.json(property);
  } catch (error) {
    next(error);
  }
});

// Delete a property
router.delete('/ontology/properties/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await propertyService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get constraints for a property
router.get('/ontology/properties/:id/constraints', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const constraints = await propertyService.getConstraints(req.params.id);
    res.json({ constraints, total: constraints.length });
  } catch (error) {
    next(error);
  }
});

// Add constraint to property
router.post('/ontology/properties/:id/constraints', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { constraintType, value, errorMessage } = req.body;
    if (!constraintType || value === undefined) {
      res.status(400).json({ error: 'constraintType and value are required' });
      return;
    }

    const constraint = await propertyService.addConstraint(req.params.id, constraintType, value, errorMessage);
    res.status(201).json(constraint);
  } catch (error) {
    next(error);
  }
});

// ============================================
// CONSTRAINT ENDPOINTS
// ============================================

// Get all constraints
router.get('/ontology/constraints', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.query;

    const constraints = type
      ? await constraintService.getByType(type as string)
      : await constraintService.getAll();

    res.json({ constraints, total: constraints.length });
  } catch (error) {
    next(error);
  }
});

// Get a constraint by ID
router.get('/ontology/constraints/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const constraint = await constraintService.getById(req.params.id);
    if (!constraint) {
      res.status(404).json({ error: 'Constraint not found' });
      return;
    }
    res.json(constraint);
  } catch (error) {
    next(error);
  }
});

// Create a constraint
router.post('/ontology/constraints', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: CreateConstraintRequest = req.body;
    if (!data.constraintType || data.value === undefined) {
      res.status(400).json({ error: 'constraintType and value are required' });
      return;
    }
    if (!data.propertyId && !data.relationshipTypeId) {
      res.status(400).json({ error: 'Either propertyId or relationshipTypeId is required' });
      return;
    }

    const constraint = await constraintService.create(data);
    res.status(201).json(constraint);
  } catch (error) {
    next(error);
  }
});

// Update a constraint
router.put('/ontology/constraints/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, errorMessage, metadata } = req.body;
    const constraint = await constraintService.update(req.params.id, { value, errorMessage, metadata });
    if (!constraint) {
      res.status(404).json({ error: 'Constraint not found' });
      return;
    }
    res.json(constraint);
  } catch (error) {
    next(error);
  }
});

// Delete a constraint
router.delete('/ontology/constraints/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await constraintService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Constraint not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// VALIDATION ENDPOINTS
// ============================================

// Validate entity against class
router.post('/ontology/validate', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: ValidateEntityRequest = req.body;
    if (!data.classId || !data.data) {
      res.status(400).json({ error: 'classId and data are required' });
      return;
    }

    const result = await validationService.validate(data.classId, data.data, data.strict ?? false);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// INFERENCE ENDPOINTS
// ============================================

// Run inference
router.post('/ontology/infer', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: InferRequest = req.body;
    if (!data.facts) {
      res.status(400).json({ error: 'facts array is required' });
      return;
    }

    // Initialize engine if needed
    await inferenceEngine.initialize();

    const result = await inferenceEngine.infer(data.facts, data.rules, data.maxDepth, data.context);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get inference stats
router.get('/ontology/infer/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await inferenceEngine.initialize();
    const stats = inferenceEngine.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============================================
// TAXONOMY ENDPOINTS
// ============================================

// Create taxonomy node
router.post('/ontology/taxonomy', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: TaxonomyCreateRequest = req.body;
    if (!data.name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const node = await taxonomyService.create(data);
    res.status(201).json(node);
  } catch (error) {
    next(error);
  }
});

// Get all taxonomy nodes
router.get('/ontology/taxonomy', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rootOnly, depth } = req.query;

    const nodes = rootOnly === 'true'
      ? await taxonomyService.getRootNodes()
      : depth !== undefined
        ? await taxonomyService.getByDepth(parseInt(depth as string))
        : await taxonomyService.getAll();

    res.json({ nodes, total: nodes.length });
  } catch (error) {
    next(error);
  }
});

// Get taxonomy node by ID
router.get('/ontology/taxonomy/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const node = await taxonomyService.getById(req.params.id);
    if (!node) {
      res.status(404).json({ error: 'Taxonomy node not found' });
      return;
    }
    res.json(node);
  } catch (error) {
    next(error);
  }
});

// Update taxonomy node
router.put('/ontology/taxonomy/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: TaxonomyUpdateRequest = req.body;
    const node = await taxonomyService.update(req.params.id, data);
    if (!node) {
      res.status(404).json({ error: 'Taxonomy node not found' });
      return;
    }
    res.json(node);
  } catch (error) {
    next(error);
  }
});

// Delete taxonomy node
router.delete('/ontology/taxonomy/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await taxonomyService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Taxonomy node not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get taxonomy node children
router.get('/ontology/taxonomy/:id/children', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const children = await taxonomyService.getChildren(req.params.id);
    res.json({ children, total: children.length });
  } catch (error) {
    next(error);
  }
});

// Get taxonomy node ancestors
router.get('/ontology/taxonomy/:id/ancestors', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ancestors = await taxonomyService.getAncestors(req.params.id);
    res.json({ ancestors, total: ancestors.length });
  } catch (error) {
    next(error);
  }
});

// Get taxonomy node descendants
router.get('/ontology/taxonomy/:id/descendants', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maxDepth } = req.query;
    const options: TraversalOptions = maxDepth ? { maxDepth: parseInt(maxDepth as string) } : undefined;
    const descendants = await taxonomyService.getDescendants(req.params.id);
    res.json({ descendants, total: descendants.length });
  } catch (error) {
    next(error);
  }
});

// Get taxonomy subtree
router.get('/ontology/taxonomy/:id/subtree', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maxDepth } = req.query;
    const options: TraversalOptions = maxDepth ? { maxDepth: parseInt(maxDepth as string) } : undefined;
    const subtree = await taxonomyService.getSubtree(req.params.id, options);
    res.json(subtree);
  } catch (error) {
    next(error);
  }
});

// Get taxonomy node siblings
router.get('/ontology/taxonomy/:id/siblings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const siblings = await taxonomyService.getSiblings(req.params.id);
    res.json({ siblings, total: siblings.length });
  } catch (error) {
    next(error);
  }
});

// Get taxonomy path
router.get('/ontology/taxonomy/:id/path', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const path = await taxonomyService.getPath(req.params.id);
    res.json({ path, length: path.length });
  } catch (error) {
    next(error);
  }
});

// Traverse taxonomy
router.post('/ontology/taxonomy/traverse', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options: TraversalOptions = req.body;
    const nodes = await taxonomyService.traverse(options);
    res.json({ nodes, total: nodes.length });
  } catch (error) {
    next(error);
  }
});

// Get taxonomy statistics
router.get('/ontology/taxonomy/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await taxonomyService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============================================
// ERROR HANDLER
// ============================================

router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[OntologyEngine Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default router;
