import { Router, Request, Response } from 'express';
import { experimentModel } from '../models/Experiment';
import { variantModel } from '../models/Variant';
import { resultModel, ExperimentResult } from '../models/Result';
import { calculateStatisticalSignificance, calculateUplift } from '../services/stats';

const router = Router();

// Get experiment results
router.get('/experiment/:experimentId', async (req: Request, res: Response) => {
  try {
    const experiment = experimentModel.findById(req.params.experimentId);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    const variants = variantModel.findByExperiment(req.params.experimentId);
    const aggregated = resultModel.aggregateByVariant(req.params.experimentId);
    const uniqueUsers = resultModel.getUniqueUsers(req.params.experimentId);

    // Find control variant
    const controlVariant = variants.find(v => v.isControl);
    const controlData = controlVariant ? aggregated.get(controlVariant.id) : null;
    const controlRate = controlData && controlData.impressions > 0
      ? controlData.conversions / controlData.impressions
      : 0;

    const results: ExperimentResult[] = variants.map(variant => {
      const data = aggregated.get(variant.id) || { impressions: 0, conversions: 0, events: [] };
      const conversionRate = data.impressions > 0
        ? data.conversions / data.impressions
        : 0;

      const uplift = calculateUplift(conversionRate, controlRate);
      const { confidence, isSignificant } = calculateStatisticalSignificance(
        data.impressions,
        data.conversions,
        controlData?.impressions || 0,
        controlData?.conversions || 0,
        variant.isControl ? 0 : controlRate
      );

      return {
        experimentId: req.params.experimentId,
        variantId: variant.id,
        variantName: variant.name,
        impressions: data.impressions,
        conversions: data.conversions,
        conversionRate,
        uplift: variant.isControl ? undefined : uplift,
        confidence,
        isSignificant,
      };
    });

    res.json({
      experiment: {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
      },
      summary: {
        totalImpressions: results.reduce((sum, r) => sum + r.impressions, 0),
        totalConversions: results.reduce((sum, r) => sum + r.conversions, 0),
        uniqueUsers: uniqueUsers.size,
        experimentDuration: experiment.startDate
          ? Math.ceil((Date.now() - new Date(experiment.startDate).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      },
      variants: results,
    });
  } catch (error) {
    console.error('Results error:', error);
    res.status(500).json({ error: 'Failed to get experiment results' });
  }
});

// Get time series data
router.get('/experiment/:experimentId/timeseries', async (req: Request, res: Response) => {
  try {
    const experiment = experimentModel.findById(req.params.experimentId);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    const granularity = (req.query.granularity as 'hour' | 'day') || 'day';
    const timeSeries = resultModel.getTimeSeries(req.params.experimentId, granularity);

    const variants = variantModel.findByExperiment(req.params.experimentId);
    const seriesData: Record<string, { variantName: string; data: Record<string, { impressions: number; conversions: number }> }> = {};

    for (const variant of variants) {
      const variantData = timeSeries.get(variant.id);
      if (variantData) {
        seriesData[variant.id] = {
          variantName: variant.name,
          data: Object.fromEntries(variantData),
        };
      }
    }

    res.json({
      experimentId: req.params.experimentId,
      granularity,
      series: seriesData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get time series data' });
  }
});

// Get variant details
router.get('/variant/:variantId', async (req: Request, res: Response) => {
  try {
    const variant = variantModel.findById(req.params.variantId);
    if (!variant) {
      res.status(404).json({ error: 'Variant not found' });
      return;
    }

    const stats = variantModel.getStats(req.params.variantId);
    const events = resultModel.findByVariant(req.params.variantId);

    res.json({
      variant,
      stats,
      eventCount: events.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get variant details' });
  }
});

// Get leaderboard (best performing experiments)
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const experiments = experimentModel.findAll({ status: 'running' });
    const leaderboard: Array<{
      experimentId: string;
      experimentName: string;
      totalImpressions: number;
      totalConversions: number;
      bestVariant: string;
      bestRate: number;
    }> = [];

    for (const experiment of experiments) {
      const variants = variantModel.findByExperiment(experiment.id);
      const aggregated = resultModel.aggregateByVariant(experiment.id);

      let totalImpressions = 0;
      let totalConversions = 0;
      let bestVariant = '';
      let bestRate = 0;

      for (const variant of variants) {
        const data = aggregated.get(variant.id) || { impressions: 0, conversions: 0 };
        totalImpressions += data.impressions;
        totalConversions += data.conversions;

        const rate = data.impressions > 0 ? data.conversions / data.impressions : 0;
        if (rate > bestRate) {
          bestRate = rate;
          bestVariant = variant.name;
        }
      }

      leaderboard.push({
        experimentId: experiment.id,
        experimentName: experiment.name,
        totalImpressions,
        totalConversions,
        bestVariant,
        bestRate,
      });
    }

    // Sort by conversion rate
    leaderboard.sort((a, b) => {
      const rateA = a.totalImpressions > 0 ? a.totalConversions / a.totalImpressions : 0;
      const rateB = b.totalImpressions > 0 ? b.totalConversions / b.totalImpressions : 0;
      return rateB - rateA;
    });

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;
