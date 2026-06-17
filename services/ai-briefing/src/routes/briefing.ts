import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BriefingModel } from '../models/Briefing';
import { AlertModel } from '../models/Alert';
import { BriefingGenerator } from '../services/generator';
import { Notifier } from '../services/notifier';
import { Briefing, GenerateBriefingRequest, ApiResponse } from '../types';

const router = Router();
const generator = new BriefingGenerator();
const notifier = new Notifier();

// Get all briefings for a tenant
router.get('/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { limit = '10', skip = '0', date, status } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (date) query.date = new Date(date as string);
    if (status) query.status = status;

    const briefings = await BriefingModel.find(query)
      .sort({ date: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await BriefingModel.countDocuments(query);

    const response: ApiResponse<{ briefings: Briefing[]; total: number }> = {
      success: true,
      data: { briefings: briefings as unknown as Briefing[], total }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching briefings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch briefings'
    });
  }
});

// Get single briefing by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const briefing = await BriefingModel.findOne({ id: req.params.id });

    if (!briefing) {
      return res.status(404).json({
        success: false,
        error: 'Briefing not found'
      });
    }

    const response: ApiResponse<Briefing> = {
      success: true,
      data: briefing as unknown as Briefing
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching briefing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch briefing'
    });
  }
});

// Get briefing by tenant and date
router.get('/tenant/:tenantId/date/:date', async (req: Request, res: Response) => {
  try {
    const { tenantId, date } = req.params;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const briefing = await BriefingModel.findOne({
      tenantId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!briefing) {
      return res.status(404).json({
        success: false,
        error: 'Briefing not found for this date'
      });
    }

    const response: ApiResponse<Briefing> = {
      success: true,
      data: briefing as unknown as Briefing
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching briefing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch briefing'
    });
  }
});

// Generate new briefing
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { tenantId, date, forceRegenerate } = req.body as GenerateBriefingRequest;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    const briefingDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(briefingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(briefingDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for existing briefing
    if (!forceRegenerate) {
      const existing = await BriefingModel.findOne({
        tenantId,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      if (existing && existing.status === 'completed') {
        return res.status(200).json({
          success: true,
          data: existing,
          message: 'Briefing already exists for this date'
        });
      }
    }

    // Create briefing record with generating status
    const briefingId = uuidv4();
    const newBriefing = new BriefingModel({
      id: briefingId,
      tenantId,
      date: briefingDate,
      generatedAt: new Date(),
      status: 'generating',
      summary: { headline: '', keyHighlights: [], executiveSummary: '', quickWins: [] },
      riskAnalysis: { overallRiskScore: 0, riskLevel: 'low', risks: [], trendingRisks: [] },
      opportunities: { totalOpportunities: 0, opportunities: [], topPriority: [] },
      recommendations: [],
      pendingApprovals: [],
      alerts: [],
      metrics: {
        revenue: { value: 0, change: 0, trend: 'stable' },
        customers: { value: 0, change: 0, trend: 'stable' },
        operations: { value: 0, change: 0, trend: 'stable' },
        market: { value: 0, change: 0, trend: 'stable' }
      },
      deliveryStatus: [],
      metadata: { dataSources: [], confidence: 0, processingTime: 0, version: '1.0.0' }
    });

    await newBriefing.save();

    // Generate briefing asynchronously
    generator.generate(tenantId, briefingId, briefingDate)
      .then(async (result) => {
        await BriefingModel.findOneAndUpdate(
          { id: briefingId },
          { ...result, status: 'completed' }
        );
        console.log(`Briefing ${briefingId} generated successfully`);
      })
      .catch(async (error) => {
        await BriefingModel.findOneAndUpdate(
          { id: briefingId },
          { status: 'failed' }
        );
        console.error(`Briefing ${briefingId} generation failed:`, error);
      });

    const response: ApiResponse<{ id: string; status: string }> = {
      success: true,
      data: { id: briefingId, status: 'generating' },
      message: 'Briefing generation started'
    };

    res.status(202).json(response);
  } catch (error) {
    console.error('Error generating briefing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start briefing generation'
    });
  }
});

// Send briefing
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { channels, recipients } = req.body;

    const briefing = await BriefingModel.findOne({ id });

    if (!briefing) {
      return res.status(404).json({
        success: false,
        error: 'Briefing not found'
      });
    }

    if (briefing.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Briefing must be completed before sending'
      });
    }

    // Send notifications
    const results = await notifier.sendBriefing(
      briefing as unknown as Briefing,
      channels || ['email'],
      recipients
    );

    // Update delivery status
    await BriefingModel.findOneAndUpdate(
      { id },
      {
        deliveryStatus: results,
        status: 'sent'
      }
    );

    const response: ApiResponse<{ deliveryStatus: unknown[] }> = {
      success: true,
      data: { deliveryStatus: results }
    };

    res.json(response);
  } catch (error) {
    console.error('Error sending briefing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send briefing'
    });
  }
});

// Get briefing statistics
router.get('/stats/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { period = '7d' } = req.query;

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const stats = await BriefingModel.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalBriefings: { $sum: 1 },
          avgRiskScore: { $avg: '$riskAnalysis.overallRiskScore' },
          avgConfidence: { $avg: '$metadata.confidence' },
          totalOpportunities: { $sum: '$opportunities.totalOpportunities' },
          totalRecommendations: { $sum: { $size: '$recommendations' } },
          avgProcessingTime: { $avg: '$metadata.processingTime' }
        }
      }
    ]);

    const response: ApiResponse<unknown> = {
      success: true,
      data: stats[0] || {
        totalBriefings: 0,
        avgRiskScore: 0,
        avgConfidence: 0,
        totalOpportunities: 0,
        totalRecommendations: 0,
        avgProcessingTime: 0
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching briefing stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

export default router;
