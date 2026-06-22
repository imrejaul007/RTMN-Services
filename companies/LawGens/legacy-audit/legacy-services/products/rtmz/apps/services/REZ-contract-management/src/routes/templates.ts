import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { templateService } from '../services/templateService';
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
    body('name').isString().trim().notEmpty().withMessage('Template name is required'),
    body('type').isIn(['nda', 'msa', 'sow', 'employment', 'vendor', 'custom']).withMessage('Invalid template type'),
    body('description').optional().isString(),
    body('content').isString().withMessage('Template content is required'),
    body('variables').optional().isArray(),
    body('variables.*.name').optional().isString(),
    body('variables.*.label').optional().isString(),
    body('variables.*.type').optional().isIn(['string', 'number', 'date', 'email', 'boolean', 'select']),
    body('variables.*.required').optional().isBoolean(),
    body('variables.*.defaultValue').optional(),
    body('variables.*.options').optional().isArray()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string || 'system';

      const template = await templateService.create({
        name: req.body.name,
        type: req.body.type,
        description: req.body.description,
        content: req.body.content,
        variables: req.body.variables,
        createdBy: userId,
        tenantId
      });

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error creating template', { error });
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
    query('type').optional().isIn(['nda', 'msa', 'sow', 'employment', 'vendor', 'custom']),
    query('isActive').optional().isBoolean(),
    query('search').optional().isString()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { page, limit, type, isActive, search } = req.query;

      const result = await templateService.findAll({
        tenantId,
        type: type as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20
      });

      res.json({
        success: true,
        data: result.templates,
        pagination: {
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 20,
          total: result.total,
          pages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 20))
        }
      });
    } catch (error) {
      logger.error('Error fetching templates', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/active',
  [
    query('type').optional().isIn(['nda', 'msa', 'sow', 'employment', 'vendor', 'custom'])
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const templates = await templateService.findAllActive(tenantId, req.query.type as string);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error fetching active templates', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
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

      const template = await templateService.findByIdWithContent(req.params.id, tenantId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error fetching template', { error });
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
    body('type').optional().isIn(['nda', 'msa', 'sow', 'employment', 'vendor', 'custom']),
    body('description').optional().isString(),
    body('content').optional().isString(),
    body('variables').optional().isArray(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const template = await templateService.update(req.params.id, tenantId, req.body);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error updating template', { error });
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

      const deleted = await templateService.delete(req.params.id, tenantId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting template', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/:id/render',
  [
    param('id').isString().trim().notEmpty(),
    body('variables').isObject().withMessage('Variables object is required')
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const renderedContent = await templateService.renderTemplate(
        req.params.id,
        tenantId,
        req.body.variables
      );

      res.json({
        success: true,
        data: {
          content: renderedContent,
          templateId: req.params.id
        }
      });
    } catch (error) {
      logger.error('Error rendering template', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/:id/variables',
  [
    param('id').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const variables = await templateService.getVariableSchema(req.params.id, tenantId);

      if (!variables) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: variables
      });
    } catch (error) {
      logger.error('Error fetching template variables', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/load-from-file',
  [
    body('path').isString().trim().notEmpty().withMessage('File path is required')
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string || 'system';

      const template = await templateService.loadFromFile(
        req.body.path,
        tenantId,
        userId
      );

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error loading template from file', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

export default router;
