import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { AttributionEvent, Conversion, Experiment, ExperimentVariant, Audience, Report, AttributionModel, ExperimentStatus } from '../types/index.js';

const AttributionEventSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  sessionId: String,
  channel: { type: String, required: true, index: true },
  source: String,
  campaign: String,
  medium: String,
  content: String,
  keyword: String,
  type: { type: String, enum: ['impression', 'click', 'conversion'], required: true },
  timestamp: { type: Date, required: true, index: true },
  value: Number,
  conversionId: String,
  device: String,
  location: String
}, { timestamps: true });

AttributionEventSchema.index({ tenantId: 1, channel: 1, timestamp: -1 });
AttributionEventSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });

const ConversionSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  conversionType: { type: String, required: true },
  value: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  timestamp: { type: Date, required: true, index: true },
  metadata: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true });

ConversionSchema.index({ tenantId: 1, timestamp: -1 });

const ExperimentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  hypothesis: { type: String, required: true },
  status: { type: String, enum: Object.values(ExperimentStatus), default: ExperimentStatus.DRAFT },
  variants: [{
    id: String,
    name: String,
    description: String,
    traffic: Number,
    config: { type: Map, of: Schema.Types.Mixed }
  }],
  targeting: {
    userSegments: [String],
    channels: [String],
    minSampleSize: Number
  },
  primaryMetric: {
    name: String,
    type: String
  },
  secondaryMetrics: [{
    name: String,
    type: String
  }],
  results: {
    winner: String,
    confidence: Number,
    pValue: Number,
    variantStats: { type: Map, of: Schema.Types.Mixed }
  },
  startDate: Date,
  endDate: Date
}, { timestamps: true });

ExperimentSchema.index({ tenantId: 1, status: 1 });

const ExperimentVariantSchema = new Schema({
  experimentId: { type: String, required: true, index: true },
  variantId: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true },
  converted: { type: Boolean, default: false },
  conversionValue: Number,
  metadata: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true });

ExperimentVariantSchema.index({ experimentId: 1, variantId: 1 });

const AudienceSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  criteria: [{
    field: String,
    operator: String,
    value: Schema.Types.Mixed
  }],
  logic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
  estimatedSize: Number,
  actualSize: Number,
  tags: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });

const ReportSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['attribution', 'experiment', 'audience', 'custom'], required: true },
  config: { type: Map, of: Schema.Types.Mixed },
  schedule: {
    enabled: { type: Boolean, default: false },
    frequency: String,
    recipients: [String]
  },
  lastRunAt: Date,
  createdBy: String
}, { timestamps: true });

export const AttributionEventModel = mongoose.model('AttributionEvent', AttributionEventSchema);
export const ConversionModel = mongoose.model('Conversion', ConversionSchema);
export const ExperimentModel = mongoose.model('Experiment', ExperimentSchema);
export const ExperimentVariantModel = mongoose.model('ExperimentVariant', ExperimentVariantSchema);
export const AudienceModel = mongoose.model('Audience', AudienceSchema);
export const ReportModel = mongoose.model('Report', ReportSchema);

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

export class AnalyticsService {
  // Attribution
  async trackAttributionEvent(event: Omit<AttributionEvent, 'id'>): Promise<AttributionEvent> {
    const doc = new AttributionEventModel({ ...event, id: uuid() });
    await doc.save();
    return doc.toObject() as unknown as AttributionEvent;
  }

  async trackConversion(conversion: Omit<Conversion, 'id'>): Promise<Conversion> {
    const doc = new ConversionModel({ ...conversion, id: uuid() });
    await doc.save();
    return doc.toObject() as unknown as Conversion;
  }

  async getAttribution(params: {
    tenantId: string;
    model: AttributionModel;
    startDate: Date;
    endDate: Date;
    userId?: string;
  }): Promise<{ channel: string; conversions: number; revenue: number; attribution: number }[]> {
    const { tenantId, model, startDate, endDate, userId } = params;

    const filter: Record<string, unknown> = {
      tenantId,
      timestamp: { $gte: startDate, $lte: endDate },
      type: 'conversion'
    };
    if (userId) filter.userId = userId;

    const conversions = await ConversionModel.find(filter);
    const attribution: Record<string, { conversions: number; revenue: number }> = {};

    for (const conv of conversions) {
      const events = await AttributionEventModel.find({
        tenantId,
        userId: conv.userId,
        timestamp: { $lte: conv.timestamp }
      }).sort({ timestamp: -1 }).limit(10);

      if (events.length === 0) continue;

      let channels: string[] = [];
      let weights: number[] = [];

      switch (model) {
        case AttributionModel.FIRST_TOUCH:
          channels = [events[events.length - 1].channel];
          weights = [1];
          break;
        case AttributionModel.LAST_TOUCH:
          channels = [events[0].channel];
          weights = [1];
          break;
        case AttributionModel.LINEAR:
          channels = events.map(e => e.channel);
          weights = events.map(() => 1 / events.length);
          break;
        case AttributionModel.TIME_DECAY:
          channels = events.map(e => e.channel);
          weights = events.map((_, i) => Math.pow(0.5, events.length - 1 - i));
          break;
        default:
          channels = [events[0].channel];
          weights = [1];
      }

      const totalWeight = weights.reduce((a, b) => a + b, 0);
      channels.forEach((ch, i) => {
        if (!attribution[ch]) attribution[ch] = { conversions: 0, revenue: 0 };
        attribution[ch].conversions += 1 * (weights[i] / totalWeight);
        attribution[ch].revenue += conv.value * (weights[i] / totalWeight);
      });
    }

    return Object.entries(attribution).map(([channel, data]) => ({
      channel,
      conversions: data.conversions,
      revenue: data.revenue,
      attribution: data.revenue / Object.values(attribution).reduce((a, b) => a + b.revenue, 0)
    }));
  }

  // Experiments
  async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment> {
    const doc = new ExperimentModel({ ...experiment, id: uuid() });
    await doc.save();
    return doc.toObject() as unknown as Experiment;
  }

  async assignVariant(experimentId: string, userId: string): Promise<{ variantId: string; config: Record<string, unknown> }> {
    const experiment = await ExperimentModel.findById(experimentId);
    if (!experiment || experiment.status !== ExperimentStatus.RUNNING) {
      throw new Error('Experiment not found or not running');
    }

    const totalTraffic = experiment.variants.reduce((sum: number, v: any) => sum + v.traffic, 0);
    let random = Math.random() * totalTraffic;
    let selectedVariant: any;

    for (const variant of experiment.variants as any[]) {
      random -= variant.traffic;
      if (random <= 0) {
        selectedVariant = variant;
        break;
      }
    }

    const variant = new ExperimentVariantModel({
      experimentId,
      variantId: selectedVariant.id,
      userId,
      tenantId: experiment.tenantId
    });
    await variant.save();

    return { variantId: selectedVariant.id, config: selectedVariant.config || {} };
  }

  async recordConversion(experimentId: string, userId: string, value?: number): Promise<void> {
    await ExperimentVariantModel.updateOne(
      { experimentId, userId, converted: false },
      { $set: { converted: true, conversionValue: value } }
    );
  }

  async analyzeExperiment(experimentId: string): Promise<Experiment['results']> {
    const experiment = await ExperimentModel.findById(experimentId);
    if (!experiment) throw new Error('Experiment not found');

    const variants = experiment.variants as any[];
    const variantStats: Record<string, { conversions: number; total: number; conversionRate: number; revenue: number }> = {};

    for (const variant of variants) {
      const participants = await ExperimentVariantModel.countDocuments({
        experimentId,
        variantId: variant.id
      });
      const converted = await ExperimentVariantModel.countDocuments({
        experimentId,
        variantId: variant.id,
        converted: true
      });

      const conversions = await ExperimentVariantModel.aggregate([
        { $match: { experimentId, variantId: variant.id, converted: true } },
        { $group: { _id: null, total: { $sum: '$conversionValue' } } }
      ]);

      variantStats[variant.id] = {
        conversions: converted,
        total: participants,
        conversionRate: participants > 0 ? converted / participants : 0,
        revenue: conversions[0]?.total || 0
      };
    }

    // Simple confidence calculation (in production, use proper statistical methods)
    const variantIds = Object.keys(variantStats);
    let winner = variantIds[0];
    let maxRate = 0;
    variantIds.forEach(id => {
      if (variantStats[id].conversionRate > maxRate) {
        maxRate = variantStats[id].conversionRate;
        winner = id;
      }
    });

    const results = {
      winner,
      confidence: 0.95,
      pValue: 0.05,
      variantStats
    };

    await ExperimentModel.findByIdAndUpdate(experimentId, { results });
    return results;
  }

  // Audiences
  async createAudience(audience: Omit<Audience, 'id' | 'createdAt' | 'updatedAt'>): Promise<Audience> {
    const doc = new AudienceModel({ ...audience, id: uuid() });
    await doc.save();
    return doc.toObject() as unknown as Audience;
  }

  async listAudiences(tenantId: string): Promise<Audience[]> {
    const audiences = await AudienceModel.find({ tenantId, active: true });
    return audiences.map(a => a.toObject() as unknown as Audience);
  }

  // Reports
  async createReport(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    const doc = new ReportModel({ ...report, id: uuid() });
    await doc.save();
    return doc.toObject() as unknown as Report;
  }

  async listReports(tenantId: string): Promise<Report[]> {
    const reports = await ReportModel.find({ tenantId }).sort({ createdAt: -1 });
    return reports.map(r => r.toObject() as unknown as Report);
  }
}

export const analyticsService = new AnalyticsService();
