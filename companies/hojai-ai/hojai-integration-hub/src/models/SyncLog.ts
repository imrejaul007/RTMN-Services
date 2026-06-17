import mongoose, { Schema, Document } from 'mongoose';

export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type SyncDirection = 'push' | 'pull' | 'bidirectional';

export interface ISyncLog extends Document {
  connector: mongoose.Types.ObjectId;
  connectorName: string;
  entityType: string;
  direction: SyncDirection;
  status: SyncStatus;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  syncErrors: { record?: string; error: string; timestamp: Date }[];
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  start(): Promise<void>;
  complete(stats: { recordsProcessed: number; recordsCreated: number; recordsUpdated: number; recordsFailed: number }): Promise<void>;
  fail(error: string, record?: string): Promise<void>;
  addError(error: string, record?: string): Promise<void>;
  addSuccess(created?: number, updated?: number): Promise<void>;
}

const SyncLogSchema = new Schema<ISyncLog>(
  {
    connector: {
      type: Schema.Types.ObjectId,
      ref: 'Connector',
      required: true,
      index: true
    },
    connectorName: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      index: true
    },
    direction: {
      type: String,
      enum: ['push', 'pull', 'bidirectional'],
      default: 'pull'
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    recordsProcessed: {
      type: Number,
      default: 0
    },
    recordsCreated: {
      type: Number,
      default: 0
    },
    recordsUpdated: {
      type: Number,
      default: 0
    },
    recordsFailed: {
      type: Number,
      default: 0
    },
    syncErrors: [{
      record: String,
      error: String,
      timestamp: { type: Date, default: Date.now }
    }],
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    },
    duration: {
      type: Number
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes
SyncLogSchema.index({ createdAt: -1 });
SyncLogSchema.index({ connector: 1, entityType: 1 });
SyncLogSchema.index({ status: 1, createdAt: -1 });

// Methods
SyncLogSchema.methods.start = async function() {
  this.status = 'in_progress';
  this.startedAt = new Date();
  await this.save();
};

SyncLogSchema.methods.complete = async function(stats: {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  this.recordsProcessed = stats.recordsProcessed;
  this.recordsCreated = stats.recordsCreated;
  this.recordsUpdated = stats.recordsUpdated;
  this.recordsFailed = stats.recordsFailed;
  await this.save();
};

SyncLogSchema.methods.fail = async function(error: string, record?: string) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  this.syncErrors.push({ record, error, timestamp: new Date() });
  await this.save();
};

SyncLogSchema.methods.addError = async function(error: string, record?: string) {
  this.syncErrors.push({ record, error, timestamp: new Date() });
  await this.save();
};

SyncLogSchema.methods.addSuccess = async function(created: number = 0, updated: number = 0) {
  this.recordsCreated += created;
  this.recordsUpdated += updated;
  this.recordsProcessed += created + updated;
  await this.save();
};

export const SyncLog = mongoose.model<ISyncLog>('SyncLog', SyncLogSchema);
