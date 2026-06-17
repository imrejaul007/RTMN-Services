import { Router, Request, Response } from 'express';
import { legalProfileStore, ComplianceItem } from '../models/LegalProfile';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { LegalSyncService } from '../services/legalSync';
import winston from 'winston';

export function complianceRouter(
  customerOpsBridge: CustomerOpsBridge,
  legalSyncService: LegalSyncService,
  logger: winston.Logger
): Router {
  const router = Router();

  // Get all compliance items
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { profileId, contractId, status, type, priority } = req.query;
      let items = legalProfileStore.getAllComplianceItems();

      if (profileId) {
        items = items.filter(i => i.profileId === profileId);
      }
      if (contractId) {
        items = items.filter(i => i.contractId === contractId);
      }
      if (status) {
        items = items.filter(i => i.status === status);
      }
      if (type) {
        items = items.filter(i => i.type === type);
      }
      if (priority) {
        items = items.filter(i => i.priority === priority);
      }

      res.json({ complianceItems: items, count: items.length });
    } catch (error) {
      logger.error('Error fetching compliance items:', error);
      res.status(500).json({ error: 'Failed to fetch compliance items' });
    }
  });

  // Get compliance item by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const item = legalProfileStore.getComplianceItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Compliance item not found' });
      }
      res.json(item);
    } catch (error) {
      logger.error('Error fetching compliance item:', error);
      res.status(500).json({ error: 'Failed to fetch compliance item' });
    }
  });

  // Create compliance item
  router.post('/', async (req: Request, res: Response) => {
    try {
      const itemData = req.body;

      // Validate required fields
      if (!itemData.profileId || !itemData.title || !itemData.type || !itemData.category) {
        return res.status(400).json({
          error: 'Missing required fields: profileId, title, type, category'
        });
      }

      const item = legalProfileStore.createComplianceItem({
        ...itemData,
        status: 'not_started',
        priority: itemData.priority || 'medium',
        dueDate: itemData.dueDate ? new Date(itemData.dueDate) : undefined,
        completedAt: undefined,
        evidence: [],
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Sync to Knowledge Twin
      await legalSyncService.syncComplianceToKnowledgeTwin(item);

      // Sync to Industry Twin for legal compliance standards
      await legalSyncService.syncComplianceToIndustryTwin(item);

      // Publish event
      await customerOpsBridge.publishEvent('compliance.created', {
        complianceId: item.id,
        profileId: item.profileId,
        type: item.type,
        priority: item.priority
      });

      logger.info(`Compliance item created: ${item.id}`);
      res.status(201).json(item);
    } catch (error) {
      logger.error('Error creating compliance item:', error);
      res.status(500).json({ error: 'Failed to create compliance item' });
    }
  });

  // Update compliance item
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const existing = legalProfileStore.getComplianceItem(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Compliance item not found' });
      }

      const updates: Partial<ComplianceItem> = { ...req.body };
      if (req.body.dueDate) {
        updates.dueDate = new Date(req.body.dueDate);
      }

      const updated = legalProfileStore.updateComplianceItem(req.params.id, updates);
      if (!updated) {
        return res.status(500).json({ error: 'Failed to update compliance item' });
      }

      // Sync updates
      await legalSyncService.syncComplianceToKnowledgeTwin(updated);
      await legalSyncService.syncComplianceToIndustryTwin(updated);

      // Publish update event
      await customerOpsBridge.publishEvent('compliance.updated', {
        complianceId: updated.id,
        changes: Object.keys(req.body),
        status: updated.status
      });

      logger.info(`Compliance item updated: ${updated.id}`);
      res.json(updated);
    } catch (error) {
      logger.error('Error updating compliance item:', error);
      res.status(500).json({ error: 'Failed to update compliance item' });
    }
  });

  // Mark compliance item as complete
  router.post('/:id/complete', async (req: Request, res: Response) => {
    try {
      const existing = legalProfileStore.getComplianceItem(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Compliance item not found' });
      }

      const evidence = req.body.evidence || [];

      const updated = legalProfileStore.updateComplianceItem(req.params.id, {
        status: 'compliant',
        completedAt: new Date(),
        evidence: [...existing.evidence, ...evidence],
        notes: req.body.notes || existing.notes
      });

      // Sync completion to twins
      await legalSyncService.syncComplianceToKnowledgeTwin(updated!);
      await legalSyncService.syncComplianceToIndustryTwin(updated!);

      await customerOpsBridge.publishEvent('compliance.completed', {
        complianceId: updated!.id,
        profileId: updated!.profileId,
        completedAt: updated!.completedAt
      });

      logger.info(`Compliance item completed: ${updated!.id}`);
      res.json(updated);
    } catch (error) {
      logger.error('Error completing compliance item:', error);
      res.status(500).json({ error: 'Failed to complete compliance item' });
    }
  });

  // Get compliance dashboard
  router.get('/dashboard/summary', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.query;
      let items = legalProfileStore.getAllComplianceItems();

      if (profileId) {
        items = items.filter(i => i.profileId === profileId);
      }

      const summary = {
        total: items.length,
        byStatus: {
          notStarted: items.filter(i => i.status === 'not_started').length,
          inProgress: items.filter(i => i.status === 'in_progress').length,
          pendingReview: items.filter(i => i.status === 'pending_review').length,
          compliant: items.filter(i => i.status === 'compliant').length,
          partiallyCompliant: items.filter(i => i.status === 'partially_compliant').length,
          nonCompliant: items.filter(i => i.status === 'non_compliant').length,
          expired: items.filter(i => i.status === 'expired').length
        },
        byPriority: {
          critical: items.filter(i => i.priority === 'critical').length,
          high: items.filter(i => i.priority === 'high').length,
          medium: items.filter(i => i.priority === 'medium').length,
          low: items.filter(i => i.priority === 'low').length
        },
        byType: items.reduce((acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        upcomingDeadlines: items
          .filter(i => i.dueDate && new Date(i.dueDate) > new Date() && i.status !== 'compliant')
          .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
          .slice(0, 10)
          .map(i => ({
            id: i.id,
            title: i.title,
            type: i.type,
            priority: i.priority,
            dueDate: i.dueDate,
            status: i.status
          })),
        overdueItems: items
          .filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'compliant')
          .map(i => ({
            id: i.id,
            title: i.title,
            type: i.type,
            priority: i.priority,
            dueDate: i.dueDate,
            daysOverdue: Math.ceil((Date.now() - new Date(i.dueDate!).getTime()) / (1000 * 60 * 60 * 24))
          }))
      };

      res.json(summary);
    } catch (error) {
      logger.error('Error fetching compliance dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch compliance dashboard' });
    }
  });

  // Get compliance by regulatory category
  router.get('/regulatory/:category', async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const items = legalProfileStore.getAllComplianceItems()
        .filter(i => i.type === 'regulatory' && i.category === category);

      res.json({ category, items, count: items.length });
    } catch (error) {
      logger.error('Error fetching regulatory items:', error);
      res.status(500).json({ error: 'Failed to fetch regulatory items' });
    }
  });

  // Get risk assessment
  router.get('/risk-assessment', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.query;
      let items = legalProfileStore.getAllComplianceItems();

      if (profileId) {
        items = items.filter(i => i.profileId === profileId);
      }

      const riskAssessment = {
        overallRisk: calculateOverallRisk(items),
        riskByCategory: calculateRiskByCategory(items),
        riskByType: calculateRiskByType(items),
        recommendations: generateRecommendations(items),
        complianceScore: calculateComplianceScore(items)
      };

      res.json(riskAssessment);
    } catch (error) {
      logger.error('Error generating risk assessment:', error);
      res.status(500).json({ error: 'Failed to generate risk assessment' });
    }
  });

  // Delete compliance item
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const item = legalProfileStore.getComplianceItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Compliance item not found' });
      }

      // Update status instead of hard delete
      legalProfileStore.updateComplianceItem(req.params.id, {
        status: 'waived',
        notes: `Waived at ${new Date().toISOString()}: ${req.body.reason || 'No reason provided'}`
      });

      await customerOpsBridge.publishEvent('compliance.waived', {
        complianceId: item.id,
        reason: req.body.reason
      });

      res.json({ status: 'compliance_waived', id: item.id });
    } catch (error) {
      logger.error('Error waiving compliance item:', error);
      res.status(500).json({ error: 'Failed to waive compliance item' });
    }
  });

  return router;
}

// Helper functions for risk assessment
function calculateOverallRisk(items: ComplianceItem[]): string {
  const critical = items.filter(i => i.priority === 'critical' && i.status !== 'compliant').length;
  const high = items.filter(i => i.priority === 'high' && i.status !== 'compliant').length;
  const overdue = items.filter(i =>
    i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'compliant'
  ).length;

  if (critical > 0 || overdue > 5) return 'critical';
  if (high > 3 || overdue > 2) return 'high';
  if (high > 0 || overdue > 0) return 'medium';
  return 'low';
}

function calculateRiskByCategory(items: ComplianceItem[]): Record<string, { risk: string; count: number }> {
  const categories = [...new Set(items.map(i => i.category))];
  const result: Record<string, { risk: string; count: number }> = {};

  for (const cat of categories) {
    const catItems = items.filter(i => i.category === cat);
    const nonCompliant = catItems.filter(i => i.status === 'non_compliant').length;
    const overdue = catItems.filter(i =>
      i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'compliant'
    ).length;

    let risk = 'low';
    if (nonCompliant > 0 || overdue > 2) risk = 'critical';
    else if (catItems.filter(i => i.priority === 'high').length > 1) risk = 'high';
    else if (overdue > 0 || catItems.filter(i => i.priority === 'high').length > 0) risk = 'medium';

    result[cat] = { risk, count: catItems.length };
  }

  return result;
}

function calculateRiskByType(items: ComplianceItem[]): Record<string, { risk: string; count: number }> {
  const types = [...new Set(items.map(i => i.type))];
  const result: Record<string, { risk: string; count: number }> = {};

  for (const type of types) {
    const typeItems = items.filter(i => i.type === type);
    const nonCompliant = typeItems.filter(i => i.status === 'non_compliant').length;

    let risk = 'low';
    if (nonCompliant > typeItems.length * 0.5) risk = 'critical';
    else if (nonCompliant > typeItems.length * 0.25) risk = 'high';
    else if (nonCompliant > 0) risk = 'medium';

    result[type] = { risk, count: typeItems.length };
  }

  return result;
}

function generateRecommendations(items: ComplianceItem[]): string[] {
  const recommendations: string[] = [];

  const overdue = items.filter(i =>
    i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'compliant'
  );

  if (overdue.length > 0) {
    recommendations.push(`Address ${overdue.length} overdue compliance items immediately`);
  }

  const nonCompliant = items.filter(i => i.status === 'non_compliant');
  if (nonCompliant.length > 0) {
    recommendations.push(`${nonCompliant.length} items are non-compliant - require urgent attention`);
  }

  const critical = items.filter(i => i.priority === 'critical' && i.status !== 'compliant');
  if (critical.length > 0) {
    recommendations.push(`Critical priority items (${critical.length}) need immediate action`);
  }

  const expiringContracts = items.filter(i =>
    i.type === 'contractual' && i.status === 'pending_review'
  );
  if (expiringContracts.length > 0) {
    recommendations.push(`Review ${expiringContracts.length} contractual items up for renewal`);
  }

  return recommendations;
}

function calculateComplianceScore(items: ComplianceItem[]): number {
  if (items.length === 0) return 100;

  const compliant = items.filter(i => i.status === 'compliant').length;
  const partiallyCompliant = items.filter(i => i.status === 'partially_compliant').length;
  const inProgress = items.filter(i => i.status === 'in_progress').length;
  const notStarted = items.filter(i => i.status === 'not_started').length;
  const nonCompliant = items.filter(i => i.status === 'non_compliant').length;

  const score = (
    (compliant * 1) +
    (partiallyCompliant * 0.5) +
    (inProgress * 0.3) +
    (notStarted * 0) +
    (nonCompliant * 0)
  ) / items.length * 100;

  return Math.round(score);
}
