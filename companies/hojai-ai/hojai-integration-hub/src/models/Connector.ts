import mongoose, { Schema, Document } from 'mongoose';

export type ConnectorStatus = 'connected' | 'disconnected' | 'error' | 'syncing';
export type ConnectorType = 'ecommerce' | 'payments' | 'accounting' | 'messaging' | 'crm' | 'other';

export interface IConnector extends Document {
  name: string;
  displayName: string;
  type: ConnectorType;
  status: ConnectorStatus;
  isActive: boolean;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    [key: string]: any;
  };
  config: {
    webhookUrl?: string;
    endpoints?: string[];
    syncFrequency?: number;
    [key: string]: any;
  };
  metadata: Record<string, any>;
  lastSyncAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  connect(credentials: Record<string, string>): Promise<void>;
  disconnect(): Promise<void>;
  markSyncing(): Promise<void>;
  markSyncComplete(): Promise<void>;
  markError(error: string): Promise<void>;
  isTokenExpired(): boolean;
}

const ConnectorSchema = new Schema<IConnector>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    displayName: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['ecommerce', 'payments', 'accounting', 'messaging', 'crm', 'other'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'syncing'],
      default: 'disconnected',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    credentials: {
      apiKey: String,
      apiSecret: String,
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    config: {
      webhookUrl: String,
      endpoints: [String],
      syncFrequency: Number
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    },
    lastSyncAt: {
      type: Date
    },
    error: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Methods
ConnectorSchema.methods.connect = async function(credentials: Record<string, string>) {
  this.credentials = { ...this.credentials, ...credentials };
  this.status = 'connected';
  this.error = undefined;
  await this.save();
};

ConnectorSchema.methods.disconnect = async function() {
  this.status = 'disconnected';
  this.credentials = {};
  await this.save();
};

ConnectorSchema.methods.markSyncing = async function() {
  this.status = 'syncing';
  await this.save();
};

ConnectorSchema.methods.markSyncComplete = async function() {
  this.status = 'connected';
  this.lastSyncAt = new Date();
  this.error = undefined;
  await this.save();
};

ConnectorSchema.methods.markError = async function(error: string) {
  this.status = 'error';
  this.error = error;
  await this.save();
};

ConnectorSchema.methods.isTokenExpired = function(): boolean {
  if (!this.credentials.expiresAt) return false;
  return new Date() >= this.credentials.expiresAt;
};

export const Connector = mongoose.model<IConnector>('Connector', ConnectorSchema);