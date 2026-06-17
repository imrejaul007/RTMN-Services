import mongoose, { Document, Schema } from 'mongoose';

export interface IMetric extends Document {
  id: string;
  name: string;
  category: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  unit: string;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  target?: number;
  upperThreshold?: number;
  lowerThreshold?: number;
  status: 'on-track' | 'at-risk' | 'off-track' | 'exceeding';
  metadata?: Record<string, unknown>;
  history: MetricHistoryEntry[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MetricHistoryEntry {
  timestamp: Date;
  value: number;
  change?: number;
  changePercent?: number;
}

const MetricHistorySchema = new Schema<MetricHistoryEntry>(
  {
    timestamp: { type: Date, required: true },
    value: { type: Number, required: true },
    change: { type: Number },
    changePercent: { type: Number }
  },
  { _id: false }
);

const MetricSchema = new Schema<IMetric>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    value: { type: Number, required: true },
    previousValue: { type: Number, required: true },
    change: { type: Number, required: true },
    changePercent: { type: Number, required: true },
    unit: { type: String, default: 'count' },
    frequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    target: { type: Number },
    upperThreshold: { type: Number },
    lowerThreshold: { type: Number },
    status: {
      type: String,
      enum: ['on-track', 'at-risk', 'off-track', 'exceeding'],
      default: 'on-track',
      index: true
    },
    metadata: { type: Schema.Types.Mixed },
    history: [MetricHistorySchema],
    lastUpdated: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
MetricSchema.index({ category: 1, name: 1 });
MetricSchema.index({ status: 1, lastUpdated: -1 });
MetricSchema.index({ frequency: 1, lastUpdated: -1 });

// Virtual for trend
MetricSchema.virtual('trend').get(function () {
  if (this.change > 0) return 'up';
  if (this.change < 0) return 'down';
  return 'stable';
});

// Method to update metric value
MetricSchema.methods.updateValue = async function (
  newValue: number,
  timestamp?: Date
): Promise<void> {
  const now = timestamp || new Date();
  this.previousValue = this.value;
  this.change = newValue - this.previousValue;
  this.changePercent = this.previousValue !== 0
    ? (this.change / this.previousValue) * 100
    : 0;
  this.value = newValue;
  this.lastUpdated = now;

  // Add to history (keep last 365 entries)
  this.history.push({
    timestamp: now,
    value: newValue,
    change: this.change,
    changePercent: this.changePercent
  });

  if (this.history.length > 365) {
    this.history = this.history.slice(-365);
  }

  // Update status based on thresholds
  this.updateStatus();

  await this.save();
};

// Method to calculate status
MetricSchema.methods.updateStatus = function (): void {
  if (this.target !== undefined) {
    const variance = ((this.value - this.target) / this.target) * 100;
    if (variance > 10) {
      this.status = 'exceeding';
    } else if (variance >= -5 && variance <= 10) {
      this.status = 'on-track';
    } else if (variance >= -15) {
      this.status = 'at-risk';
    } else {
      this.status = 'off-track';
    }
  } else if (this.upperThreshold && this.lowerThreshold) {
    if (this.value > this.upperThreshold) {
      this.status = 'exceeding';
    } else if (this.value < this.lowerThreshold) {
      this.status = 'off-track';
    } else {
      this.status = 'on-track';
    }
  }
};

// Static method to get metrics by category
MetricSchema.statics.getByCategory = async function (
  category: string
): Promise<IMetric[]> {
  return this.find({ category }).sort({ name: 1 }).exec();
};

// Static method to get at-risk metrics
MetricSchema.statics.getAtRisk = async function (): Promise<IMetric[]> {
  return this.find({ status: { $in: ['at-risk', 'off-track'] } })
    .sort({ lastUpdated: -1 })
    .exec();
};

export const Metric = mongoose.model<IMetric>('Metric', MetricSchema);
export default Metric;
