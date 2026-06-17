import mongoose, { Schema, model } from 'mongoose';
import { InstallationDocument, Industry } from '../types';

const InstallationSchema = new Schema<InstallationDocument>({
  installationId: { type: String, required: true, unique: true, index: true },
  knowledgeId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true },
  clientName: { type: String, required: true },
  industry: {
    type: String,
    required: true,
    enum: [
      'hospitality', 'healthcare', 'retail', 'hotel', 'legal',
      'education', 'agriculture', 'automotive', 'beauty', 'fashion',
      'fitness', 'gaming', 'government', 'home-services', 'manufacturing',
      'non-profit', 'professional', 'sports', 'travel', 'entertainment',
      'construction', 'financial', 'real-estate', 'transport'
    ]
  },
  installedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'paused', 'uninstalled'], default: 'active' },
  lastUsedAt: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Compound indexes
InstallationSchema.index({ clientId: 1, knowledgeId: 1 }, { unique: true });
InstallationSchema.index({ knowledgeId: 1, status: 1 });
InstallationSchema.index({ clientId: 1, status: 1 });

export const Installation = model<InstallationDocument>('Installation', InstallationSchema);
