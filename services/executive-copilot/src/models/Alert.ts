import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  id: string;
  type: 'risk' | 'opportunity' | 'milestone' | 'warning' | 'info';
  title: string;
  message: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  read: boolean;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata?: Record<string, unknown>;
  actionRequired: boolean;
  actionTaken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['risk', 'opportunity', 'milestone', 'warning', 'info'],
      required: true,
      index: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
    timestamp: { type: Date, default: Date.now, index: true },
    read: { type: Boolean, default: false, index: true },
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: String },
    metadata: { type: Schema.Types.Mixed },
    actionRequired: { type: Boolean, default: false },
    actionTaken: { type: String }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound indexes for efficient queries
AlertSchema.index({ read: 1, acknowledged: 1, timestamp: -1 });
AlertSchema.index({ type: 1, severity: 1, timestamp: -1 });
AlertSchema.index({ actionRequired: 1, acknowledged: 1 });

// Virtual for checking if alert is new
AlertSchema.virtual('isNew').get(function () {
  return !this.read && Date.now() - this.timestamp.getTime() < 24 * 60 * 60 * 1000;
});

// Static method to get unread count
AlertSchema.statics.getUnreadCount = async function (): Promise<number> {
  return this.countDocuments({ read: false });
};

// Static method to get alerts requiring action
AlertSchema.statics.getActionRequired = async function (): Promise<IAlert[]> {
  return this.find({ actionRequired: true, acknowledged: false })
    .sort({ severity: 1, timestamp: -1 })
    .exec();
};

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
export default Alert;
