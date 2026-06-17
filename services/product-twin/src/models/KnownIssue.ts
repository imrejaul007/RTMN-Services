import mongoose, { Document, Schema } from 'mongoose';

// Issue Severity
export enum IssueSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

// Issue Status
export enum IssueStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  IDENTIFIED = 'identified',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  WORKAROUND_AVAILABLE = 'workaround_available',
  WONT_FIX = 'wont_fix'
}

// Issue Affected Versions
export interface IAffectedVersion {
  version: string;
  startDate?: Date;
  endDate?: Date;
  isCurrent: boolean;
}

// Issue Fix
export interface IFix {
  version?: string;
  releasedDate?: Date;
  description: string;
  steps?: string[];
  isVerified: boolean;
}

// Known Issue Interface
export interface IKnownIssue extends Document {
  tenantId: string;
  productId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  category: string; // e.g., 'Hardware', 'Software', 'Performance', 'UX'
  affectedVersions: IAffectedVersion[];
  fixedVersion?: string;
  fix?: IFix;
  workaround?: {
    description: string;
    steps: string[];
  };
  symptoms: string[];
  causes?: string[];
  impact: string;
  workaroundAvailable: boolean;
  ticketCount: number;
  lastOccurrence?: Date;
  firstOccurrence?: Date;
  resolutionDate?: Date;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Known Issue Schema
const AffectedVersionSchema = new Schema<IAffectedVersion>(
  {
    version: {
      type: String,
      required: true
    },
    startDate: Date,
    endDate: Date,
    isCurrent: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const FixSchema = new Schema<IFix>(
  {
    version: String,
    releasedDate: Date,
    description: {
      type: String,
      required: true
    },
    steps: [String],
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const WorkaroundSchema = new Schema(
  {
    description: {
      type: String,
      required: true
    },
    steps: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const KnownIssueSchema = new Schema<IKnownIssue>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      index: 'text'
    },
    description: {
      type: String,
      default: ''
    },
    severity: {
      type: String,
      enum: Object.values(IssueSeverity),
      default: IssueSeverity.MEDIUM,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(IssueStatus),
      default: IssueStatus.OPEN,
      index: true
    },
    category: {
      type: String,
      default: 'General'
    },
    affectedVersions: [AffectedVersionSchema],
    fixedVersion: String,
    fix: FixSchema,
    workaround: WorkaroundSchema,
    symptoms: {
      type: [String],
      default: []
    },
    causes: [String],
    impact: {
      type: String,
      default: ''
    },
    workaroundAvailable: {
      type: Boolean,
      default: false
    },
    ticketCount: {
      type: Number,
      default: 0
    },
    lastOccurrence: Date,
    firstOccurrence: Date,
    resolutionDate: Date,
    tags: {
      type: [String],
      default: []
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'known_issues'
  }
);

// Indexes
KnownIssueSchema.index({ tenantId: 1, productId: 1 });
KnownIssueSchema.index({ tenantId: 1, severity: 1, status: 1 });
KnownIssueSchema.index({ tenantId: 1, productId: 1, status: 1 });
KnownIssueSchema.index({ title: 'text', description: 'text' });
KnownIssueSchema.index({ tenantId: 1, tags: 1 });

// Virtual for checking if issue is resolved
KnownIssueSchema.virtual('isResolved').get(function () {
  return this.status === IssueStatus.RESOLVED;
});

// Method to check if a version is affected
KnownIssueSchema.methods.isVersionAffected = function (version: string): boolean {
  return this.affectedVersions.some(
    (av: IAffectedVersion) =>
      av.version === version &&
      (!av.startDate || new Date() >= av.startDate) &&
      (!av.endDate || new Date() <= av.endDate)
  );
};

// Static method to find active issues by product
KnownIssueSchema.statics.findActiveByProduct = function (tenantId: string, productId: mongoose.Types.ObjectId) {
  return this.find({
    tenantId,
    productId,
    status: { $nin: [IssueStatus.RESOLVED, IssueStatus.WONT_FIX] }
  }).sort({ severity: 1, createdAt: -1 });
};

// Static method to find issues by severity
KnownIssueSchema.statics.findBySeverity = function (
  tenantId: string,
  productId: mongoose.Types.ObjectId,
  severity: IssueSeverity
) {
  return this.find({
    tenantId,
    productId,
    severity,
    status: { $nin: [IssueStatus.RESOLVED, IssueStatus.WONT_FIX] }
  }).sort({ createdAt: -1 });
};

// Static method to get issue statistics
KnownIssueSchema.statics.getStats = async function (tenantId: string, productId: mongoose.Types.ObjectId) {
  const stats = await this.aggregate([
    { $match: { tenantId, productId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        bySeverity: {
          $push: '$severity'
        },
        byStatus: {
          $push: '$status'
        },
        totalTickets: { $sum: '$ticketCount' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      total: 0,
      bySeverity: {},
      byStatus: {},
      totalTickets: 0
    };
  }

  const result = stats[0];
  const bySeverity: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const severity of result.bySeverity) {
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
  }

  for (const status of result.byStatus) {
    byStatus[status] = (byStatus[status] || 0) + 1;
  }

  return {
    total: result.total,
    bySeverity,
    byStatus,
    totalTickets: result.totalTickets
  };
};

// Export the model
export const KnownIssue = mongoose.model<IKnownIssue>('KnownIssue', KnownIssueSchema);
export default KnownIssue;
