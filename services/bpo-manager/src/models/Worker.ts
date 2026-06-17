import mongoose, { Document, Schema } from 'mongoose';

// Worker status enum
export enum WorkerStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  BREAK = 'BREAK',
}

// Service types supported
export enum ServiceType {
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  DATA_ENTRY = 'DATA_ENTRY',
  CONTENT_MODERATION = 'CONTENT_MODERATION',
  TRANSCRIPTION = 'TRANSCRIPTION',
  IMAGE_ANNOTATION = 'IMAGE_ANNOTATION',
  RESEARCH = 'RESEARCH',
  VOICE = 'VOICE',
}

// Worker statistics interface
export interface IWorkerStats {
  totalJobsCompleted: number;
  totalJobsAssigned: number;
  averageRating: number;
  totalRatingCount: number;
  averageCompletionTime: number; // in minutes
  earnings: number;
  lastActiveAt: Date;
}

// Worker document interface
export interface IWorker extends Document {
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  skills: ServiceType[];
  languages: string[];
  certifications: string[];
  status: WorkerStatus;
  stats: IWorkerStats;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Worker stats schema
const WorkerStatsSchema = new Schema<IWorkerStats>(
  {
    totalJobsCompleted: { type: Number, default: 0 },
    totalJobsAssigned: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatingCount: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Worker schema
const WorkerSchema = new Schema<IWorker>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      enum: Object.values(ServiceType),
      default: [],
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    certifications: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(WorkerStatus),
      default: WorkerStatus.OFFLINE,
    },
    stats: {
      type: WorkerStatsSchema,
      default: () => ({}),
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
WorkerSchema.index({ tenantId: 1, email: 1 });
WorkerSchema.index({ tenantId: 1, status: 1 });
WorkerSchema.index({ tenantId: 1, skills: 1 });
WorkerSchema.index({ tenantId: 1, 'stats.lastActiveAt': -1 });

// Instance methods
WorkerSchema.methods.updateStats = async function (updates: Partial<IWorkerStats>) {
  Object.assign(this.stats, updates);
  this.stats.lastActiveAt = new Date();
  return this.save();
};

WorkerSchema.methods.addCompletedJob = async function (rating?: number, completionTime?: number) {
  this.stats.totalJobsCompleted += 1;
  this.stats.lastActiveAt = new Date();

  if (rating !== undefined) {
    const totalRating = this.stats.averageRating * this.stats.totalRatingCount + rating;
    this.stats.totalRatingCount += 1;
    this.stats.averageRating = totalRating / this.stats.totalRatingCount;
  }

  if (completionTime !== undefined) {
    const completedJobs = this.stats.totalJobsCompleted;
    const currentAvg = this.stats.averageCompletionTime;
    this.stats.averageCompletionTime =
      (currentAvg * (completedJobs - 1) + completionTime) / completedJobs;
  }

  return this.save();
};

// Static methods
WorkerSchema.statics.findAvailableWorkers = function (
  tenantId: string,
  skills?: ServiceType[],
  languages?: string[]
) {
  const query: Record<string, unknown> = {
    tenantId,
    status: WorkerStatus.AVAILABLE,
  };

  if (skills && skills.length > 0) {
    query.skills = { $in: skills };
  }

  if (languages && languages.length > 0) {
    query.languages = { $in: languages };
  }

  return this.find(query).sort({ 'stats.averageRating': -1, 'stats.totalJobsCompleted': -1 });
};

export const Worker = mongoose.model<IWorker>('Worker', WorkerSchema);