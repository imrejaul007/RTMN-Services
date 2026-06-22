import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Clause } from '../models/Clause';
import { logger } from '../utils/logger';

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

router.post('/',
  [
    body('name').isString().trim().notEmpty().withMessage('Clause name is required'),
    body('category').isIn([
      'confidentiality',
      'termination',
      'liability',
      'payment',
      'intellectual_property',
      'compliance',
      'dispute',
      'general'
    ]).withMessage('Invalid clause category'),
    body('content').isString().withMessage('Clause content is required'),
    body('description').optional().isString(),
    body('tags').optional().isArray()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string || 'system';

      const clauseId = `CLS-${uuidv4().substring(0, 8).toUpperCase()}`;

      const clause = new Clause({
        clauseId,
        name: req.body.name,
        category: req.body.category,
        content: req.body.content,
        description: req.body.description || '',
        tags: req.body.tags || [],
        isActive: true,
        createdBy: userId,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0
        },
        tenantId
      });

      await clause.save();

      logger.info(`Clause created: ${clauseId}`, { clauseId, tenantId });

      res.status(201).json({
        success: true,
        data: clause
      });
    } catch (error) {
      logger.error('Error creating clause', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isIn([
      'confidentiality',
      'termination',
      'liability',
      'payment',
      'intellectual_property',
      'compliance',
      'dispute',
      'general'
    ]),
    query('isActive').optional().isBoolean(),
    query('search').optional().isString(),
    query('tags').optional().isString()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { page = 1, limit = 20, category, isActive, search, tags } = req.query;

      const filter: Record<string, unknown> = { tenantId };

      if (category) filter.category = category;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ];
      }
      if (tags) {
        filter.tags = { $in: (tags as string).split(',').map(t => t.trim()) };
      }

      const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

      const [clauses, total] = await Promise.all([
        Clause.find(filter)
          .sort({ 'metadata.createdAt': -1 })
          .skip(skip)
          .limit(parseInt(limit as string, 10))
          .lean(),
        Clause.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: clauses,
        pagination: {
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
          total,
          pages: Math.ceil(total / parseInt(limit as string, 10))
        }
      });
    } catch (error) {
      logger.error('Error fetching clauses', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/categories',
  async (_req: Request, res: Response): Promise<void> => {
    const categories = [
      { id: 'confidentiality', name: 'Confidentiality', description: 'NDA and confidentiality clauses' },
      { id: 'termination', name: 'Termination', description: 'Contract termination conditions' },
      { id: 'liability', name: 'Liability', description: 'Limitation of liability and indemnification' },
      { id: 'payment', name: 'Payment', description: 'Payment terms and conditions' },
      { id: 'intellectual_property', name: 'Intellectual Property', description: 'IP ownership and licensing' },
      { id: 'compliance', name: 'Compliance', description: 'Regulatory and legal compliance' },
      { id: 'dispute', name: 'Dispute Resolution', description: 'Dispute resolution mechanisms' },
      { id: 'general', name: 'General', description: 'General-purpose clauses' }
    ];

    res.json({
      success: true,
      data: categories
    });
  }
);

router.get('/:id',
  [
    param('id').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const clause = await Clause.findOne({ clauseId: req.params.id, tenantId });

      if (!clause) {
        res.status(404).json({
          success: false,
          error: 'Clause not found'
        });
        return;
      }

      res.json({
        success: true,
        data: clause
      });
    } catch (error) {
      logger.error('Error fetching clause', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.put('/:id',
  [
    param('id').isString().trim().notEmpty(),
    body('name').optional().isString().trim().notEmpty(),
    body('category').optional().isIn([
      'confidentiality',
      'termination',
      'liability',
      'payment',
      'intellectual_property',
      'compliance',
      'dispute',
      'general'
    ]),
    body('content').optional().isString(),
    body('description').optional().isString(),
    body('tags').optional().isArray(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const clause = await Clause.findOne({ clauseId: req.params.id, tenantId });

      if (!clause) {
        res.status(404).json({
          success: false,
          error: 'Clause not found'
        });
        return;
      }

      if (req.body.name) clause.name = req.body.name;
      if (req.body.category) clause.category = req.body.category;
      if (req.body.content) clause.content = req.body.content;
      if (req.body.description !== undefined) clause.description = req.body.description;
      if (req.body.tags) clause.tags = req.body.tags;
      if (req.body.isActive !== undefined) clause.isActive = req.body.isActive;
      clause.metadata.updatedAt = new Date();

      await clause.save();

      logger.info(`Clause updated: ${req.params.id}`, { clauseId: req.params.id, tenantId });

      res.json({
        success: true,
        data: clause
      });
    } catch (error) {
      logger.error('Error updating clause', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.delete('/:id',
  [
    param('id').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const result = await Clause.deleteOne({ clauseId: req.params.id, tenantId });

      if (result.deletedCount === 0) {
        res.status(404).json({
          success: false,
          error: 'Clause not found'
        });
        return;
      }

      logger.info(`Clause deleted: ${req.params.id}`, { clauseId: req.params.id, tenantId });

      res.json({
        success: true,
        message: 'Clause deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting clause', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/:id/duplicate',
  [
    param('id').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string || 'system';

      const originalClause = await Clause.findOne({ clauseId: req.params.id, tenantId });

      if (!originalClause) {
        res.status(404).json({
          success: false,
          error: 'Clause not found'
        });
        return;
      }

      const newClauseId = `CLS-${uuidv4().substring(0, 8).toUpperCase()}`;

      const newClause = new Clause({
        clauseId: newClauseId,
        name: `${originalClause.name} (Copy)`,
        category: originalClause.category,
        content: originalClause.content,
        description: originalClause.description,
        tags: originalClause.tags,
        isActive: true,
        createdBy: userId,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0
        },
        tenantId
      });

      await newClause.save();

      logger.info(`Clause duplicated: ${newClauseId}`, {
        originalId: req.params.id,
        clauseId: newClauseId,
        tenantId
      });

      res.status(201).json({
        success: true,
        data: newClause
      });
    } catch (error) {
      logger.error('Error duplicating clause', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

export default router;
