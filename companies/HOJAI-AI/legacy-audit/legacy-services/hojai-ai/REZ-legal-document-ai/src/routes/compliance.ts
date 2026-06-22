import { Router, Request, Response } from 'express';
import { DocumentModel } from '../models/Document';
import { DocumentAnalysisModel } from '../models/DocumentAnalysis';
import { mapToComplianceFrameworks, getSupportedFrameworks, checkClauseComplianceByType } from '../services/complianceMapper';
import { AuthenticatedRequest, requireTenant } from '../middleware/tenant';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /compliance/frameworks
 * Get all supported compliance frameworks
 */
router.get('/frameworks', async (req: Request, res: Response) => {
  try {
    const frameworks = getSupportedFrameworks();

    res.json({
      success: true,
      frameworks
    });
  } catch (error) {
    logger.error('Failed to get compliance frameworks', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance frameworks'
    });
  }
});

/**
 * POST /compliance/check
 * Check compliance for a document against frameworks
 */
router.post('/check', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const { documentId, frameworks } = req.body;

    if (!documentId) {
      res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
      return;
    }

    // Find document
    const document = await DocumentModel.findOne({ documentId, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    // Get analysis
    const analysis = await DocumentAnalysisModel.findOne({ documentId });
    if (!analysis) {
      res.status(400).json({
        success: false,
        error: 'Document has not been analyzed yet'
      });
      return;
    }

    const frameworkList = frameworks || ['GDPR', 'SOC2', 'ISO27001'];
    const results = await mapToComplianceFrameworks(analysis.clauses, frameworkList);

    // Calculate overall compliance score
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const overallScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

    const compliantCount = results.filter(r => r.overallStatus === 'compliant').length;
    const nonCompliantCount = results.filter(r => r.overallStatus === 'non_compliant').length;
    const partialCount = results.filter(r => r.overallStatus === 'partial').length;

    logger.info('Compliance check completed', {
      documentId,
      tenantId,
      frameworkCount: results.length,
      overallScore
    });

    res.json({
      success: true,
      documentId,
      overallScore,
      summary: {
        totalFrameworks: results.length,
        compliant: compliantCount,
        nonCompliant: nonCompliantCount,
        partial: partialCount
      },
      results
    });
  } catch (error) {
    logger.error('Compliance check failed', { error });
    res.status(500).json({
      success: false,
      error: 'Compliance check failed',
      message: (error as Error).message
    });
  }
});

/**
 * POST /compliance/check/clause
 * Check compliance for a specific clause
 */
router.post('/check/clause', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clause, framework } = req.body;

    if (!clause || !framework) {
      res.status(400).json({
        success: false,
        error: 'Clause and framework are required'
      });
      return;
    }

    const result = checkClauseComplianceByType(clause as any, framework);

    res.json({
      success: true,
      clause,
      framework,
      isCompliant: result.isCompliant,
      issues: result.issues
    });
  } catch (error) {
    logger.error('Clause compliance check failed', { error });
    res.status(500).json({
      success: false,
      error: 'Clause compliance check failed',
      message: (error as Error).message
    });
  }
});

/**
 * GET /compliance/report/:documentId
 * Get detailed compliance report for a document
 */
router.get('/report/:documentId', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const tenantId = req.tenant!.tenantId;
    const { frameworks } = req.query;

    const document = await DocumentModel.findOne({ documentId, tenantId });
    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    const analysis = await DocumentAnalysisModel.findOne({ documentId });
    if (!analysis) {
      res.status(400).json({
        success: false,
        error: 'Document has not been analyzed yet'
      });
      return;
    }

    const frameworkList = frameworks
      ? (frameworks as string).split(',')
      : ['GDPR', 'SOC2', 'ISO27001', 'CCPA'];

    const results = await mapToComplianceFrameworks(analysis.clauses, frameworkList);

    // Build detailed report
    const report = {
      document: {
        documentId: document.documentId,
        title: document.title,
        type: document.type,
        analyzedAt: analysis.analyzedAt
      },
      overallSummary: {
        totalFrameworks: results.length,
        compliantFrameworks: results.filter(r => r.overallStatus === 'compliant').length,
        nonCompliantFrameworks: results.filter(r => r.overallStatus === 'non_compliant').length,
        partialComplianceFrameworks: results.filter(r => r.overallStatus === 'partial').length
      },
      frameworkResults: results.map(r => ({
        framework: r.framework,
        status: r.overallStatus,
        score: r.score,
        applicableClauses: r.applicableClauses.length,
        compliantClauses: r.compliantClauses.length,
        nonCompliantClauses: r.nonCompliantClauses.length,
        issues: r.issues.map(i => ({
          clauseTitle: i.clauseTitle,
          requirement: i.requirement,
          issue: i.issue,
          severity: i.severity,
          recommendation: i.recommendation
        })),
        recommendations: r.recommendations,
        details: r.details
      })),
      criticalIssues: results
        .flatMap(r => r.issues)
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .map(i => ({
          framework: results.find(r => r.issues.includes(i))?.framework,
          clauseTitle: i.clauseTitle,
          issue: i.issue,
          severity: i.severity,
          recommendation: i.recommendation
        })),
      generatedAt: new Date()
    };

    res.json({
      success: true,
      report
    });
  } catch (error) {
    logger.error('Failed to generate compliance report', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate compliance report',
      message: (error as Error).message
    });
  }
});

/**
 * GET /compliance/dashboard
 * Get compliance dashboard data for tenant
 */
router.get('/dashboard', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;

    // Get all analyzed documents for tenant
    const documents = await DocumentModel.find({
      tenantId,
      status: 'completed',
      analysisId: { $exists: true }
    }).lean();

    const dashboardData = {
      totalDocuments: documents.length,
      byType: {} as Record<string, number>,
      byFramework: {} as Record<string, { compliant: number; nonCompliant: number; partial: number }>,
      recentAnalyses: [] as Array<{
        documentId: string;
        title: string;
        type: string;
        analyzedAt: Date;
      }>
    };

    // Count by type
    for (const doc of documents) {
      dashboardData.byType[doc.type] = (dashboardData.byType[doc.type] || 0) + 1;
    }

    // Get compliance data for recent documents
    const recentDocs = documents.slice(0, 5);
    for (const doc of recentDocs) {
      const analysis = await DocumentAnalysisModel.findOne({ documentId: doc.documentId });
      if (analysis) {
        const results = await mapToComplianceFrameworks(analysis.clauses, ['GDPR', 'SOC2', 'ISO27001']);

        for (const result of results) {
          if (!dashboardData.byFramework[result.framework]) {
            dashboardData.byFramework[result.framework] = { compliant: 0, nonCompliant: 0, partial: 0 };
          }

          if (result.overallStatus === 'compliant') {
            dashboardData.byFramework[result.framework].compliant++;
          } else if (result.overallStatus === 'non_compliant') {
            dashboardData.byFramework[result.framework].nonCompliant++;
          } else {
            dashboardData.byFramework[result.framework].partial++;
          }
        }

        dashboardData.recentAnalyses.push({
          documentId: doc.documentId,
          title: doc.title,
          type: doc.type,
          analyzedAt: doc.metadata.analyzedAt || new Date()
        });
      }
    }

    res.json({
      success: true,
      dashboard: dashboardData
    });
  } catch (error) {
    logger.error('Failed to get compliance dashboard', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance dashboard'
    });
  }
});

/**
 * POST /compliance/batch
 * Check compliance for multiple documents
 */
router.post('/batch', requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const { documentIds, frameworks } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Document IDs array is required'
      });
      return;
    }

    const frameworkList = frameworks || ['GDPR', 'SOC2', 'ISO27001'];
    const results: Array<{
      documentId: string;
      title: string;
      overallScore: number;
      status: string;
      compliantFrameworks: number;
      nonCompliantFrameworks: number;
    }> = [];

    for (const documentId of documentIds) {
      const document = await DocumentModel.findOne({ documentId, tenantId });
      if (!document || !document.analysisId) {
        continue;
      }

      const analysis = await DocumentAnalysisModel.findOne({ documentId });
      if (!analysis) {
        continue;
      }

      const complianceResults = await mapToComplianceFrameworks(analysis.clauses, frameworkList);

      const totalScore = complianceResults.reduce((sum, r) => sum + r.score, 0);
      const overallScore = complianceResults.length > 0 ? Math.round(totalScore / complianceResults.length) : 0;

      results.push({
        documentId,
        title: document.title,
        overallScore,
        status: overallScore >= 80 ? 'compliant' : overallScore >= 50 ? 'partial' : 'non_compliant',
        compliantFrameworks: complianceResults.filter(r => r.overallStatus === 'compliant').length,
        nonCompliantFrameworks: complianceResults.filter(r => r.overallStatus === 'non_compliant').length
      });
    }

    logger.info('Batch compliance check completed', {
      tenantId,
      documentCount: results.length
    });

    res.json({
      success: true,
      totalChecked: results.length,
      results
    });
  } catch (error) {
    logger.error('Batch compliance check failed', { error });
    res.status(500).json({
      success: false,
      error: 'Batch compliance check failed',
      message: (error as Error).message
    });
  }
});

export default router;
