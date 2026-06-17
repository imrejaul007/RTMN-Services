import mongoose, { Document, Schema } from 'mongoose';
import { IndustryType } from './IndustryProfile';

// Compliance status
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'in_progress' | 'not_applicable';

// Regulation framework
export interface RegulationFramework {
  name: string;
  description: string;
  region: string;
  authority: string;
  lastUpdated: Date;
}

// Specific regulation
export interface Regulation {
  id: string;
  name: string;
  code: string;
  description: string;
  requirements: string[];
  penalties: string[];
  effectiveDate: Date;
  nextReviewDate?: Date;
}

// Compliance requirement
export interface ComplianceRequirement {
  requirementId: string;
  regulation: string;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'on_demand';
  evidence: string[];
  owner: string;
  status: ComplianceStatus;
  lastAudit?: Date;
  nextAudit?: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Audit finding
export interface AuditFinding {
  id: string;
  date: Date;
  auditor: string;
  requirement: string;
  finding: string;
  severity: 'observation' | 'minor' | 'major' | 'critical';
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolvedDate?: Date;
  evidence?: string[];
}

// Compliance document
export interface ICompliance extends Document {
  tenantId: string;
  industryType: IndustryType;
  framework: RegulationFramework;
  regulations: Regulation[];
  requirements: ComplianceRequirement[];
  auditHistory: AuditFinding[];
  score: number;
  lastAssessment: Date;
  nextAssessment: Date;
  certifications: {
    name: string;
    issuedBy: string;
    issuedDate: Date;
    expiryDate: Date;
    status: 'active' | 'expired' | 'pending';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceSchema = new Schema<ICompliance>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    industryType: {
      type: String,
      required: true,
      enum: ['restaurant', 'hotel', 'healthcare', 'retail', 'manufacturing', 'fintech'],
      index: true
    },
    framework: {
      name: { type: String, required: true },
      description: { type: String },
      region: { type: String, required: true },
      authority: { type: String, required: true },
      lastUpdated: { type: Date, default: Date.now }
    },
    regulations: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      code: { type: String, required: true },
      description: { type: String },
      requirements: [{ type: String }],
      penalties: [{ type: String }],
      effectiveDate: { type: Date, required: true },
      nextReviewDate: { type: Date }
    }],
    requirements: [{
      requirementId: { type: String, required: true },
      regulation: { type: String, required: true },
      description: { type: String, required: true },
      category: { type: String, required: true },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'on_demand'],
        default: 'monthly'
      },
      evidence: [{ type: String }],
      owner: { type: String },
      status: {
        type: String,
        enum: ['compliant', 'non_compliant', 'in_progress', 'not_applicable'],
        default: 'in_progress'
      },
      lastAudit: { type: Date },
      nextAudit: { type: Date },
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      }
    }],
    auditHistory: [{
      id: { type: String, required: true },
      date: { type: Date, required: true },
      auditor: { type: String, required: true },
      requirement: { type: String },
      finding: { type: String, required: true },
      severity: {
        type: String,
        enum: ['observation', 'minor', 'major', 'critical'],
        default: 'minor'
      },
      recommendation: { type: String },
      status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
      },
      resolvedDate: { type: Date },
      evidence: [{ type: String }]
    }],
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAssessment: {
      type: Date,
      default: Date.now
    },
    nextAssessment: {
      type: Date
    },
    certifications: [{
      name: { type: String, required: true },
      issuedBy: { type: String, required: true },
      issuedDate: { type: Date, required: true },
      expiryDate: { type: Date, required: true },
      status: {
        type: String,
        enum: ['active', 'expired', 'pending'],
        default: 'pending'
      }
    }]
  },
  {
    timestamps: true,
    collection: 'compliance'
  }
);

// Indexes
ComplianceSchema.index({ tenantId: 1, industryType: 1 }, { unique: true });
ComplianceSchema.index({ tenantId: 1, 'certifications.status': 1 });

// Instance methods
ComplianceSchema.methods.getComplianceRate = function(): number {
  const total = this.requirements.length;
  if (total === 0) return 100;
  const compliant = this.requirements.filter(r => r.status === 'compliant').length;
  return Math.round((compliant / total) * 100);
};

ComplianceSchema.methods.getCriticalFindings = function(): AuditFinding[] {
  return this.auditHistory.filter(f => f.severity === 'critical' && f.status !== 'closed');
};

ComplianceSchema.methods.getExpiringCertifications = function(): { name: string; expiryDate: Date }[] {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.certifications
    .filter(c => c.status === 'active' && c.expiryDate <= thirtyDaysFromNow)
    .map(c => ({ name: c.name, expiryDate: c.expiryDate }));
};

// Static methods
ComplianceSchema.statics.findByTenantAndType = function(
  tenantId: string,
  industryType: IndustryType
): Promise<ICompliance | null> {
  return this.findOne({ tenantId, industryType });
};

ComplianceSchema.statics.getOverdueRequirements = function(
  tenantId: string
): Promise<ICompliance[]> {
  const now = new Date();
  return this.find({
    tenantId,
    'requirements.nextAudit': { $lt: now },
    'requirements.status': { $ne: 'not_applicable' }
  });
};

export const Compliance = mongoose.model<ICompliance>('Compliance', ComplianceSchema);

export default Compliance;
