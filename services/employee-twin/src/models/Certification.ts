import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schema
export const CertificationValidationSchema = z.object({
  tenantId: z.string().min(1),
  employeeId: z.string().min(1),
  certificationName: z.string().min(1),
  issuingOrganization: z.string().min(1),
  issueDate: z.date(),
  expiryDate: z.date().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(),
  status: z.enum(['active', 'expired', 'pending', 'revoked']),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional()
});

// MongoDB schema
const CertificationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  certificationName: { type: String, required: true },
  issuingOrganization: { type: String, required: true },
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date },
  credentialId: { type: String },
  credentialUrl: { type: String },
  status: {
    type: String,
    enum: ['active', 'expired', 'pending', 'revoked'],
    default: 'active'
  },
  category: { type: String },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert']
  },
  verified: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Indexes
CertificationSchema.index({ tenantId: 1, employeeId: 1 });
CertificationSchema.index({ tenantId: 1, certificationName: 1 });
CertificationSchema.index({ tenantId: 1, status: 1 });
CertificationSchema.index({ expiryDate: 1 }, { sparse: true });

export interface ICertification extends Document {
  tenantId: string;
  employeeId: string;
  certificationName: string;
  issuingOrganization: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
  status: 'active' | 'expired' | 'pending' | 'revoked';
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const Certification = mongoose.model<ICertification>('Certification', CertificationSchema);
