/**
 * Marketing OS - Unified Dashboard Routes
 * Phase 0: Integration Hub - All services connected
 * Date: July 2, 2026
 */

const express = require('express');
const router = express.Router();
const rtmnHub = require('../services/RTMNMarketingHub');
const logger = require('../config/logger');
const { authenticate } = require('../middleware');

// ============================================
// DASHBOARD OVERVIEW
// ============================================

/**
 * GET /api/dashboard/overview
 * Unified dashboard combining all marketing services
 */
router.get('/overview', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const params = { startDate, endDate };

    // Parallel fetch from all integrated services
    const [
      attributionReport,
      attributionROI,
      agentInsights,
      agentPredictions,
      socialAnalytics,
      growthMetrics
    ] = await Promise.allSettled([
      rtmnHub.getAttributionReport(params),
      rtmnHub.getAttributionROI(),
      rtmnHub.getAgentInsights(req.user.merchantId),
      rtmnHub.getAgentPredictions(req.user.merchantId),
      rtmnHub.getSocialAnalytics(params),
      rtmnHub.getGrowthMetrics()
    ]);

    // Build unified response
    const dashboard = {
      timestamp: new Date().toISOString(),
      period: params,
      attribution: {
        status: attributionReport.status === 'fulfilled',
        data: attributionReport.status === 'fulfilled' ? attributionReport.value.data : null,
        error: attributionReport.status === 'rejected' ? attributionReport.reason.message : null
      },
      roi: {
        status: attributionROI.status === 'fulfilled',
        data: attributionROI.status === 'fulfilled' ? attributionROI.value.data : null,
        error: attributionROI.status === 'rejected' ? attributionROI.reason.message : null
      },
      aiInsights: {
        status: agentInsights.status === 'fulfilled',
        data: agentInsights.status === 'fulfilled' ? agentInsights.value.data : null,
        error: agentInsights.status === 'rejected' ? agentInsights.reason.message : null
      },
      predictions: {
        status: agentPredictions.status === 'fulfilled',
        data: agentPredictions.status === 'fulfilled' ? agentPredictions.value.data : null,
        error: agentPredictions.status === 'rejected' ? agentPredictions.reason.message : null
      },
      social: {
        status: socialAnalytics.status === 'fulfilled',
        data: socialAnalytics.status === 'fulfilled' ? socialAnalytics.value.data : null,
        error: socialAnalytics.status === 'rejected' ? socialAnalytics.reason.message : null
      },
      growth: {
        status: growthMetrics.status === 'fulfilled',
        data: growthMetrics.status === 'fulfilled' ? growthMetrics.value.data : null,
        error: growthMetrics.status === 'rejected' ? growthMetrics.reason.message : null
      }
    };

    // Calculate summary metrics
    dashboard.summary = calculateSummaryMetrics(dashboard);

    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CAMPAIGN ANALYTICS
// ============================================

/**
 * GET /api/dashboard/campaigns
 * Combined campaign data from all sources
 */
router.get('/campaigns', authenticate, async (req, res) => {
  try {
    const { Campaign } = require('../models');
    const { status, channel, startDate, endDate } = req.query;

    // Build campaign query
    const query = {};
    if (status) query.status = status;
    if (channel) query.channel = channel;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get campaigns from database
    const campaigns = await Campaign.find(query).limit(100);

    // Enrich with analytics from all services
    const enrichedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        const campaignId = campaign._id.toString();

        // Parallel fetch analytics
        const [attribution, roi, abTests, adPerformance] = await Promise.allSettled([
          rtmnHub.getAttributionReport({ campaignId }),
          rtmnHub.getAttributionROI(campaignId),
          rtmnHub.getABTestResults(campaignId),
          rtmnHub.getAdCampaignPerformance(campaignId)
        ]);

        return {
          ...campaign.toObject(),
          analytics: {
            attribution: attribution.status === 'fulfilled' ? attribution.value.data : null,
            roi: roi.status === 'fulfilled' ? roi.value.data : null,
            abTests: abTests.status === 'fulfilled' ? abTests.value.data : null,
            adPerformance: adPerformance.status === 'fulfilled' ? adPerformance.value.data : null
          }
        };
      })
    );

    res.json({ success: true, data: enrichedCampaigns, count: campaigns.length });
  } catch (error) {
    logger.error('Dashboard campaigns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// AUDIENCE INSIGHTS
// ============================================

/**
 * GET /api/dashboard/audience
 * Unified audience data from CDP and Intelligence
 */
router.get('/audience', authenticate, async (req, res) => {
  try {
    const { Audience } = require('../models');
    const { segmentId } = req.query;

    // Get audience from database
    const audiences = await Audience.find({
      organizationId: req.user.organizationId
    }).limit(50);

    // Enrich with CDP and AI data
    const enrichedAudiences = await Promise.all(
      audiences.map(async (audience) => {
        const [cdpInsights, intentSignals] = await Promise.allSettled([
          rtmnHub.getCDPAudienceInsights(audience._id.toString()),
          rtmnHub.getIntentSignals(audience._id.toString())
        ]);

        return {
          ...audience.toObject(),
          cdp: cdpInsights.status === 'fulfilled' ? cdpInsights.value.data : null,
          intentSignals: intentSignals.status === 'fulfilled' ? intentSignals.value.data : null
        };
      })
    );

    res.json({ success: true, data: enrichedAudiences, count: audiences.length });
  } catch (error) {
    logger.error('Dashboard audience error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ATTRIBUTION ANALYTICS
// ============================================

/**
 * GET /api/dashboard/attribution
 * Multi-touch attribution from all channels
 */
router.get('/attribution', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, model } = req.query;
    const params = { startDate, endDate, model };

    // Fetch attribution data
    const [report, roi, efficiency] = await Promise.allSettled([
      rtmnHub.getAttributionReport(params),
      rtmnHub.getAttributionROI(),
      rtmnHub.getAttributionEfficiency(params)
    ]);

    res.json({
      success: true,
      data: {
        report: report.status === 'fulfilled' ? report.value.data : null,
        roi: roi.status === 'fulfilled' ? roi.value.data : null,
        efficiency: efficiency.status === 'fulfilled' ? efficiency.value.data : null
      }
    });
  } catch (error) {
    logger.error('Dashboard attribution error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dashboard/attribution/user/:userId
 * Single user journey with all touchpoints
 */
router.get('/attribution/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const [journey, intentProfile] = await Promise.allSettled([
      rtmnHub.getUserJourney(userId),
      rtmnHub.getUserIntentProfile(userId)
    ]);

    res.json({
      success: true,
      data: {
        journey: journey.status === 'fulfilled' ? journey.value.data : null,
        intentProfile: intentProfile.status === 'fulfilled' ? intentProfile.value.data : null
      }
    });
  } catch (error) {
    logger.error('User attribution error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// LEAD ANALYTICS
// ============================================

/**
 * GET /api/dashboard/leads
 * Lead scoring and intelligence
 */
router.get('/leads', authenticate, async (req, res) => {
  try {
    const { Lead } = require('../models');
    const { status, score, limit = 50 } = req.query;

    const query = { organizationId: req.user.organizationId };
    if (status) query.status = status;

    const leads = await Lead.find(query)
      .sort({ score: -1 })
      .limit(parseInt(limit));

    // Enrich with scoring data
    const enrichedLeads = await Promise.all(
      leads.map(async (lead) => {
        const [leadScore, intent, recommendations] = await Promise.allSettled([
          rtmnHub.getLeadScore(lead._id.toString()),
          rtmnHub.getLeadIntent(lead._id.toString()),
          rtmnHub.getLeadRecommendations(lead._id.toString())
        ]);

        return {
          ...lead.toObject(),
          scoring: {
            score: leadScore.status === 'fulfilled' ? leadScore.value.data : null,
            intent: intent.status === 'fulfilled' ? intent.value.data : null,
            recommendations: recommendations.status === 'fulfilled' ? recommendations.value.data : null
          }
        };
      })
    );

    res.json({ success: true, data: enrichedLeads, count: leads.length });
  } catch (error) {
    logger.error('Dashboard leads error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GROWTH ANALYTICS
// ============================================

/**
 * GET /api/dashboard/growth
 * Referral, viral, and growth metrics
 */
router.get('/growth', authenticate, async (req, res) => {
  try {
    const [growthMetrics, viralCoefficients] = await Promise.allSettled([
      rtmnHub.getGrowthMetrics(),
      rtmnHub.getViralCoefficients()
    ]);

    res.json({
      success: true,
      data: {
        metrics: growthMetrics.status === 'fulfilled' ? growthMetrics.value.data : null,
        viral: viralCoefficients.status === 'fulfilled' ? viralCoefficients.value.data : null
      }
    });
  } catch (error) {
    logger.error('Dashboard growth error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// AI ASSISTANT
// ============================================

/**
 * POST /api/dashboard/ai/command
 * Natural language marketing commands
 */
router.post('/ai/command', authenticate, async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ success: false, error: 'Command required' });
    }

    const result = await rtmnHub.sendAgentCommand(command);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('AI command error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/dashboard/ai/chat
 * Chat with marketing AI
 */
router.post('/ai/chat', authenticate, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message required' });
    }

    const result = await rtmnHub.chatWithAgent(message, context);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('AI chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/dashboard/ai/autopilot
 * Toggle marketing autopilot
 */
router.post('/ai/autopilot', authenticate, async (req, res) => {
  try {
    const { action } = req.body; // 'start' or 'stop'

    const result = action === 'start'
      ? await rtmnHub.startAutopilot(req.user.merchantId)
      : await rtmnHub.stopAutopilot(req.user.merchantId);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('AI autopilot error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CROSS-SERVICE ANALYTICS
// ============================================

/**
 * GET /api/dashboard/cross-analytics
 * Combined analytics from multiple services
 */
router.get('/cross-analytics', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, campaignId } = req.query;
    const params = { startDate, endDate, campaignId };

    // Fetch all analytics in parallel
    const [
      attribution,
      abTests,
      cdp,
      growth,
      roi
    ] = await Promise.allSettled([
      rtmnHub.getAttributionReport(params),
      rtmnHub.getABTestResults(campaignId),
      rtmnHub.getCDPAudienceInsights(),
      rtmnHub.getGrowthMetrics(),
      rtmnHub.getAttributionROI()
    ]);

    // Build cross-service analysis
    const analysis = {
      timestamp: new Date().toISOString(),
      period: params,
      totalRevenue: 0,
      totalSpend: 0,
      roi: 0,
      winningVariants: [],
      topSegments: [],
      viralCoefficient: 0,
      services: {
        attribution: attribution.status === 'fulfilled',
        abTests: abTests.status === 'fulfilled',
        cdp: cdp.status === 'fulfilled',
        growth: growth.status === 'fulfilled'
      }
    };

    // Extract metrics from each service
    if (attribution.status === 'fulfilled' && attribution.value.data) {
      const data = attribution.value.data;
      analysis.totalRevenue = data.totalRevenue || 0;
      analysis.totalSpend = data.totalSpend || 0;
      analysis.roi = data.roi || 0;
    }

    if (abTests.status === 'fulfilled' && abTests.value.data) {
      analysis.winningVariants = extractWinningVariants(abTests.value.data);
    }

    if (roi.status === 'fulfilled' && roi.value.data) {
      analysis.roi = roi.value.data.roi || analysis.roi;
    }

    if (growth.status === 'fulfilled' && growth.value.data) {
      analysis.viralCoefficient = growth.value.data.viralCoefficient || 0;
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('Cross-analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SERVICE HEALTH
// ============================================

/**
 * GET /api/dashboard/services/health
 * Health status of all connected services
 */
router.get('/services/health', authenticate, async (req, res) => {
  try {
    const health = await rtmnHub.healthCheck();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Service health error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateSummaryMetrics(dashboard) {
  const summary = {
    connectedServices: 0,
    totalErrors: 0,
    healthScore: 0
  };

  // Count connected services and errors
  const services = ['attribution', 'roi', 'aiInsights', 'predictions', 'social', 'growth'];

  services.forEach(service => {
    if (dashboard[service]?.status) {
      summary.connectedServices++;
    } else {
      summary.totalErrors++;
    }
  });

  // Calculate health score (0-100)
  summary.healthScore = Math.round((summary.connectedServices / services.length) * 100);

  // Extract key metrics if available
  if (dashboard.attribution?.data) {
    summary.totalRevenue = dashboard.attribution.data.totalRevenue || 0;
    summary.totalConversions = dashboard.attribution.data.totalConversions || 0;
  }

  if (dashboard.roi?.data) {
    summary.overallROI = dashboard.roi.data.roi || 0;
  }

  return summary;
}

function extractWinningVariants(abTestData) {
  const variants = [];

  if (Array.isArray(abTestData)) {
    abTestData.forEach(experiment => {
      if (experiment.winner) {
        variants.push({
          experimentId: experiment.experimentId,
          variant: experiment.winner,
          improvement: experiment.improvement
        });
      }
    });
  }

  return variants;
}

module.exports = router;
