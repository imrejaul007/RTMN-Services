import mongoose, { Schema, Document } from 'mongoose';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'whatsapp';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

export interface INotification extends Document {
  recipient: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: Record<string, string>;
  status: NotificationStatus;
  metadata: {
    templateId?: mongoose.Types.ObjectId;
    templateName?: string;
    userId?: string;
    orderId?: string;
    [key: string]: any;
  };
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: String,
      required: true,
      index: true
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'push', 'whatsapp'],
      required: true,
      index: true
    },
    subject: {
      type: String,
      default: ''
    },
    body: {
      type: String,
      required: true
    },
    variables: {
      type: Map,
      of: String,
      default: {}
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
      default: 'pending',
      index: true
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    },
    sentAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    error: {
      type: String
    },
    retryCount: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    scheduledAt: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ status: 1, scheduledAt: 1 });
NotificationSchema.index({ 'metadata.userId': 1 });
NotificationSchema.index({ 'metadata.orderId': 1 });

// Methods
NotificationSchema.methods.markAsSent = async function() {
  this.status = 'sent';
  this.sentAt = new Date();
  await this.save();
};

NotificationSchema.methods.markAsDelivered = async function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  await this.save();
};

NotificationSchema.methods.markAsFailed = async function(error: string) {
  this.status = 'failed';
  this.error = error;
  await this.save();
};

NotificationSchema.methods.incrementRetry = async function() {
  this.retryCount += 1;
  if (this.retryCount >= this.maxRetries) {
    this.status = 'failed';
  }
  await this.save();
};

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
