import mongoose, { Document, Schema } from 'mongoose';
import { ServiceType } from './Worker';

// Job status enum
export enum JobStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Job priority enum
export enum JobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5,
}

// Voice data interface for VOICE type jobs
export interface IVoiceJobData {
  customerPhone: string;
  customerName?: string;
  campaignId?: string;
  script?: string;
  disposition?: string;
  notes?: string;
}

// Job requirements interface
export interface IJobRequirements {
  skills?: ServiceType[];
  languages?: string[];
  minRating?: number;
  certifications?: string[];
  experience?: string;
}

// Job document interface
export interface IJob extends Document {
  tenantId: string;
  jobId: string;
  type: ServiceType;
  clientId: string;
  clientName?: string;
  title: string;
  description: string;
  requirements: IJobRequirements;
  priority: JobPriority;
  status: JobStatus;
  worker?: mongoose.Types.ObjectId;
  workerName?: string;
  ticketId?: string;
  voiceData?: IVoiceJobData;
  data?: Record<string, unknown>;
  output?: Record<string, unknown>;
  rating?: number;
  feedback?: string;
  completedAt?: Date;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  payment?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Job schema
const JobSchema = new Schema<IJob>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    jobId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(ServiceType),
    },
    clientId: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: {
      skills: {
        type: [String],
        enum: Object.values(ServiceType),
      },
      languages: [String],
      minRating: { type: Number, min: 0, max: 5 },
      certifications: [String],
      experience: String,
    },
    priority: {
      type: Number,
      enum: Object.values(JobPriority).filter((v) => typeof v === 'number') as number[],
      default: JobPriority.NORMAL,
    },
    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.PENDING,
    },
    worker: {
      type: Schema.Types.ObjectId,
      ref: 'Worker',
    },
    workerName: {
      type: String,
    },
    ticketId: {
      type: String,
    },
    voiceData: {
      customerPhone: { type: String, required: true },
      customerName: String,
      campaignId: String,
      script: String,
      disposition: String,
      notes: String,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    output: {
      type: Schema.Types.Mixed,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    feedback: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
    estimatedDuration: {
      type: Number,
    },
    actualDuration: {
      type: Number,
    },
    payment: {
      type: Number,
      default: 0,
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
JobSchema.index({ tenantId: 1, jobId: 1 });
JobSchema.index({ tenantId: 1, status: 1 });
JobSchema.index({ tenantId: 1, type: 1 });
JobSchema.index({ tenantId: 1, priority: -1 });
JobSchema.index({ tenantId: 1, clientId: 1 });
JobSchema.index({ tenantId: 1, worker: 1 });
JobSchema.index({ tenantId: 1, createdAt: -1 });
JobSchema.index({ status: 1, priority: -1, createdAt: 1 });

// Pre-save hook to generate jobId
JobSchema.pre('save', async function (next) {
  if (this.isNew && !this.jobId) {
    const count = await mongoose.model('Job').countDocuments({ tenantId: this.tenantId });
    this.jobId = `BPO-${this.tenantId.substring(0, 4).toUpperCase()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Instance methods
JobSchema.methods.assignToWorker = async function (
  workerId: mongoose.Types.ObjectId,
  workerName: string
) {
  this.worker = workerId;
  this.workerName = workerName;
  this.status = JobStatus.ASSIGNED;
  return this.save();
};

JobSchema.methods.startWork = async function () {
  this.status = JobStatus.IN_PROGRESS;
  return this.save();
};

JobSchema.methods.complete = async function (output?: Record<string, unknown>) {
  this.status = JobStatus.COMPLETED;
  this.completedAt = new Date();
  if (output) {
    this.output = output;
  }
  return this.save();
};

JobSchema.methods.cancel = async function () {
  this.status = JobStatus.CANCELLED;
  return this.save();
};

// Static methods
JobSchema.statics.findPendingJobs = function (tenantId: string, limit = 10) {
  return this.find({ tenantId, status: JobStatus.PENDING })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

JobSchema.statics.findWorkerJobs = function (tenantId: string, workerId: string) {
  return this.find({
    tenantId,
    worker: workerId,
    status: { $in: [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS] },
  }).sort({ priority: -1, createdAt: 1 });
};

export const Job = mongoose.model<IJob>('Job', JobSchema);