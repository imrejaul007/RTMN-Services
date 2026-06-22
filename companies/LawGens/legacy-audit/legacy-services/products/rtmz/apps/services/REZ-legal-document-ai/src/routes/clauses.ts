import { Router, Request, Response } from 'express';
import { ClauseModel, IStandardClause, CLAUSE_TYPES, RISK_LEVELS } from '../models/Clause';
import { addToClauseLibrary, getStandardClause, listStandardClauses } from '../services/ragService';
import { AuthenticatedRequest, requireTenant } from '../middleware/tenant';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /clauses/library
 * Get standard clause library
 */
router.get('/library', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
      riskLevel,
      keyword,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: Record<string, unknown> = { isActive: true };

    if (type) {
      query.type = type;
    }

    if (riskLevel) {
      query.riskLevel = riskLevel;
    }

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword as string, $options: 'i' } },
        { keywords: { $in: [new RegExp(keyword as string, 'i')] } },
        { summary: { $regex: keyword as string, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sortObj: Record<string, 1 | -1> = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const [clauses, total] = await Promise.all([
      ClauseModel.find(query)
        .select('-embedding')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      ClauseModel.countDocuments(query)
    ]);

    res.json({
      success: true,
      clauses,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      },
      filters: {
        types: CLAUSE_TYPES,
        riskLevels: RISK_LEVELS
      }
    });
  } catch (error) {
    logger.error('Failed to list standard clauses', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list standard clauses'
    });
  }
});

/**
 * GET /clauses/library/:clauseId
 * Get a specific standard clause
 */
router.get('/library/:clauseId', async (req: Request, res: Response) => {
  try {
    const { clauseId } = req.params;

    const clause = await ClauseModel.findOne({ clauseId, isActive: true }).lean();

    if (!clause) {
      res.status(404).json({
        success: false,
        error: 'Standard clause not found'
      });
      return;
    }

    res.json({
      success: true,
      clause
    });
  } catch (error) {
    logger.error('Failed to get standard clause', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get standard clause'
    });
  }
});

/**
 * POST /clauses/library
 * Add a clause to the standard library
 */
router.post('/library', async (req: Request, res: Response) => {
  try {
    const {
      title,
      type,
      content,
      summary,
      keywords,
      riskLevel,
      riskFactors,
      recommendations,
      complianceMappings,
      usageExamples,
      jurisdiction,
      version
    } = req.body;

    // Validate required fields
    if (!title || !type || !content || !summary) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: title, type, content, summary are required'
      });
      return;
    }

    // Validate clause type
    if (!CLAUSE_TYPES.includes(type)) {
      res.status(400).json({
        success: false,
        error: `Invalid clause type. Must be one of: ${CLAUSE_TYPES.join(', ')}`
      });
      return;
    }

    // Validate risk level
    if (riskLevel && !RISK_LEVELS.includes(riskLevel)) {
      res.status(400).json({
        success: false,
        error: `Invalid risk level. Must be one of: ${RISK_LEVELS.join(', ')}`
      });
      return;
    }

    const newClause = await addToClauseLibrary(
      {
        title,
        type,
        content,
        summary,
        keywords: keywords || [],
        riskLevel: riskLevel || 'low',
        riskFactors: riskFactors || [],
        recommendations: recommendations || [],
        complianceMappings: complianceMappings || [],
        usageExamples: usageExamples || [],
        jurisdiction: jurisdiction || [],
        version: version || '1.0.0'
      },
      'system'
    );

    logger.info('Standard clause added', { clauseId: newClause.clauseId });

    res.status(201).json({
      success: true,
      clause: newClause
    });
  } catch (error) {
    logger.error('Failed to add standard clause', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to add standard clause',
      message: (error as Error).message
    });
  }
});

/**
 * PUT /clauses/library/:clauseId
 * Update a standard clause
 */
router.put('/library/:clauseId', async (req: Request, res: Response) => {
  try {
    const { clauseId } = req.params;
    const updates = req.body;

    // Prevent changing clauseId
    delete updates.clauseId;
    delete updates._id;
    delete updates.createdAt;

    const clause = await ClauseModel.findOneAndUpdate(
      { clauseId, isActive: true },
      {
        ...updates,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!clause) {
      res.status(404).json({
        success: false,
        error: 'Standard clause not found'
      });
      return;
    }

    logger.info('Standard clause updated', { clauseId });

    res.json({
      success: true,
      clause
    });
  } catch (error) {
    logger.error('Failed to update standard clause', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update standard clause',
      message: (error as Error).message
    });
  }
});

/**
 * DELETE /clauses/library/:clauseId
 * Soft delete a standard clause
 */
router.delete('/library/:clauseId', async (req: Request, res: Response) => {
  try {
    const { clauseId } = req.params;

    const clause = await ClauseModel.findOneAndUpdate(
      { clauseId, isActive: true },
      {
        isActive: false,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!clause) {
      res.status(404).json({
        success: false,
        error: 'Standard clause not found'
      });
      return;
    }

    logger.info('Standard clause deactivated', { clauseId });

    res.json({
      success: true,
      message: 'Standard clause removed from library'
    });
  } catch (error) {
    logger.error('Failed to delete standard clause', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete standard clause'
    });
  }
});

/**
 * GET /clauses/types
 * Get all available clause types
 */
router.get('/types', (req: Request, res: Response) => {
  res.json({
    success: true,
    types: CLAUSE_TYPES.map(type => ({
      value: type,
      label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }))
  });
});

/**
 * GET /clauses/search
 * Search standard clauses
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      q,
      type,
      riskLevel,
      limit = '5'
    } = req.query;

    if (!q) {
      res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
      return;
    }

    const result = await listStandardClauses({
      type: type as string,
      riskLevel: riskLevel as string,
      limit: parseInt(limit as string)
    });

    // Filter by search query (basic keyword matching)
    const query = (q as string).toLowerCase();
    const filteredClauses = result.clauses.filter(clause =>
      clause.title.toLowerCase().includes(query) ||
      clause.summary.toLowerCase().includes(query) ||
      clause.keywords.some(k => k.toLowerCase().includes(query))
    );

    res.json({
      success: true,
      query: q,
      results: filteredClauses,
      total: filteredClauses.length
    });
  } catch (error) {
    logger.error('Clause search failed', { error });
    res.status(500).json({
      success: false,
      error: 'Clause search failed'
    });
  }
});

/**
 * POST /clauses/compare
 * Compare two clauses
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { clause1Id, clause2Id, content1, content2, type1, type2 } = req.body;

    if (!((clause1Id || content1) && (clause2Id || content2))) {
      res.status(400).json({
        success: false,
        error: 'Either clause IDs or content must be provided for both clauses'
      });
      return;
    }

    let clause1: IStandardClause | null = null;
    let clause2: IStandardClause | null = null;

    if (clause1Id) {
      clause1 = await getStandardClause(clause1Id);
    }

    if (clause2Id) {
      clause2 = await getStandardClause(clause2Id);
    }

    // If content provided but not found, use content directly
    if (!clause1 && content1) {
      clause1 = {
        clauseId: 'custom_1',
        title: 'Custom Clause',
        type: type1 || 'other',
        content: content1,
        summary: content1.substring(0, 200),
        keywords: [],
        riskLevel: 'medium',
        riskFactors: [],
        recommendations: [],
        complianceMappings: [],
        usageExamples: [],
        jurisdiction: [],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };
    }

    if (!clause2 && content2) {
      clause2 = {
        clauseId: 'custom_2',
        title: 'Custom Clause',
        type: type2 || 'other',
        content: content2,
        summary: content2.substring(0, 200),
        keywords: [],
        riskLevel: 'medium',
        riskFactors: [],
        recommendations: [],
        complianceMappings: [],
        usageExamples: [],
        jurisdiction: [],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };
    }

    if (!clause1 || !clause2) {
      res.status(404).json({
        success: false,
        error: 'One or both clauses not found'
      });
      return;
    }

    // Generate comparison
    const comparison = {
      clause1: {
        id: clause1.clauseId,
        type: clause1.type,
        title: clause1.title,
        riskLevel: clause1.riskLevel,
        summary: clause1.summary
      },
      clause2: {
        id: clause2.clauseId,
        type: clause2.type,
        title: clause2.title,
        riskLevel: clause2.riskLevel,
        summary: clause2.summary
      },
      typeMatch: clause1.type === clause2.type,
      riskMatch: clause1.riskLevel === clause2.riskLevel,
      differences: [] as string[],
      similarity: 0
    };

    // Calculate basic similarity
    const words1 = new Set(clause1.content.toLowerCase().split(/\s+/));
    const words2 = new Set(clause2.content.toLowerCase().split(/\s+/));
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);
    comparison.similarity = union.size > 0 ? intersection.length / union.size : 0;

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    logger.error('Clause comparison failed', { error });
    res.status(500).json({
      success: false,
      error: 'Clause comparison failed',
      message: (error as Error).message
    });
  }
});

/**
 * GET /clauses/stats
 * Get statistics about the clause library
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await ClauseModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byType: { $push: '$type' },
          byRiskLevel: { $push: '$riskLevel' },
          avgKeywords: { $avg: { $size: { $ifNull: ['$keywords', []] } } }
        }
      }
    ]);

    const result = stats[0] || { total: 0, byType: [], byRiskLevel: [], avgKeywords: 0 };

    // Count by type
    const byType: Record<string, number> = {};
    for (const type of result.byType) {
      byType[type] = (byType[type] || 0) + 1;
    }

    // Count by risk level
    const byRiskLevel: Record<string, number> = {};
    for (const level of result.byRiskLevel) {
      byRiskLevel[level] = (byRiskLevel[level] || 0) + 1;
    }

    res.json({
      success: true,
      stats: {
        total: result.total,
        byType,
        byRiskLevel,
        avgKeywords: Math.round(result.avgKeywords * 10) / 10
      }
    });
  } catch (error) {
    logger.error('Failed to get clause stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get clause statistics'
    });
  }
});

export default router;
