import mongoose, { Schema, Document } from 'mongoose';
import { InstallationDocument } from '../types';

export interface IInstallation extends InstallationDocument, Document {}

const InstallationSchema = new Schema<IInstallation>(
  {
    installationId: { type: String, required: true, unique: true, index: true },
    workflowId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    config: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'active', 'paused', 'failed'],
      default: 'pending',
    },
    installedAt: { type: Date, default: Date.now },
    lastTriggered: { type: Date },
    triggerCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique installation per client/workflow
InstallationSchema.index({ workflowId: 1, clientId: 1 }, { unique: true });

export const Installation = mongoose.model<IInstallation>(
  'Installation',
  InstallationSchema
);
