import mongoose, { Document, Schema } from 'mongoose';
import { IndustryType } from './IndustryProfile';

// Performance tier
export type PerformanceTier = 'bottom' | 'below_average' | 'average' | 'above_average' | 'top';

// Benchmark data point
export interface BenchmarkDataPoint {
  metricName: string;
  value: number;
  unit: string;
  percentile: number;
  sampleSize: number;
  period: string;
}

// Performance comparison
export interface PerformanceComparison {
  metricName: string;
  yourValue: number;
  industryAverage: number;
  top25Percentile: number;
  top10Percentile: number;
  unit: string;
  trend: 'improving' | 'stable' | 'declining';
  gap: number;
}

// Benchmark configuration
export interface BenchmarkConfig {
  metricName: string;
  description: string;
  calculation: string;
  dataSource: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
}

// Industry benchmark document
export interface IBenchmark extends Document {
  tenantId: string;
  industryType: IndustryType;
  businessSize?: string;
  region?: string;
  quarter: string;
  year: number;
  benchmarks: BenchmarkDataPoint[];
  performanceComparisons: PerformanceComparison[];
  topPerformers: {
    metricName: string;
    value: number;
    practices: string[];
  }[];
  improvementAreas: {
    metricName: string;
    gap: number;
    recommendations: string[];
  }[];
  overallScore: number;
  scoreChange: number;
  competitorsAverage: number;
  createdAt: Date;
  updatedAt: Date;
}

const BenchmarkSchema = new Schema<IBenchmark>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    industryType: {
      type: String,
      required: true,
      enum: ['restaurant', 'hotel', 'healthcare', 'retail', 'manufacturing', 'fintech'],
      index: true
    },
    businessSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'enterprise'],
      default: 'medium'
    },
    region: {
      type: String,
      default: 'global'
    },
    quarter: {
      type: String,
      required: true,
      enum: ['Q1', 'Q2', 'Q3', 'Q4']
    },
    year: {
      type: Number,
      required: true
    },
    benchmarks: [{
      metricName: { type: String, required: true },
      value: { type: Number, required: true },
      unit: { type: String, required: true },
      percentile: { type: Number, default: 50 },
      sampleSize: { type: Number, default: 100 },
      period: { type: String }
    }],
    performanceComparisons: [{
      metricName: { type: String, required: true },
      yourValue: { type: Number, required: true },
      industryAverage: { type: Number, required: true },
      top25Percentile: { type: Number, required: true },
      top10Percentile: { type: Number, required: true },
      unit: { type: String, required: true },
      trend: {
        type: String,
        enum: ['improving', 'stable', 'declining'],
        default: 'stable'
      },
      gap: { type: Number, default: 0 }
    }],
    topPerformers: [{
      metricName: { type: String, required: true },
      value: { type: Number, required: true },
      practices: [{ type: String }]
    }],
    improvementAreas: [{
      metricName: { type: String, required: true },
      gap: { type: Number, required: true },
      recommendations: [{ type: String }]
    }],
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    scoreChange: {
      type: Number,
      default: 0
    },
    competitorsAverage: {
      type: Number,
      default: 50
    }
  },
  {
    timestamps: true,
    collection: 'benchmarks'
  }
);

// Indexes
BenchmarkSchema.index({ tenantId: 1, industryType: 1, year: 1, quarter: 1 });
BenchmarkSchema.index({ industryType: 1, year: 1, quarter: 1 });

// Instance methods
BenchmarkSchema.methods.getTier = function(score: number): PerformanceTier {
  if (score >= 90) return 'top';
  if (score >= 75) return 'above_average';
  if (score >= 50) return 'average';
  if (score >= 25) return 'below_average';
  return 'bottom';
};

BenchmarkSchema.methods.getMetricPerformance = function(metricName: string): PerformanceComparison | null {
  return this.performanceComparisons.find(p => p.metricName === metricName) || null;
};

// Static methods
BenchmarkSchema.statics.getLatest = function(
  tenantId: string,
  industryType: IndustryType
): Promise<IBenchmark | null> {
  return this.findOne({ tenantId, industryType })
    .sort({ year: -1, quarter: -1 });
};

BenchmarkSchema.statics.getHistorical = function(
  tenantId: string,
  industryType: IndustryType,
  limit: number = 4
): Promise<IBenchmark[]> {
  return this.find({ tenantId, industryType })
    .sort({ year: -1, quarter: -1 })
    .limit(limit);
};

BenchmarkSchema.statics.getIndustryAverage = function(
  industryType: IndustryType,
  year: number,
  quarter: string
): Promise<IBenchmark | null> {
  return this.findOne({ industryType, year, quarter, tenantId: '__industry_average__' });
};

export const Benchmark = mongoose.model<IBenchmark>('Benchmark', BenchmarkSchema);

export default Benchmark;
