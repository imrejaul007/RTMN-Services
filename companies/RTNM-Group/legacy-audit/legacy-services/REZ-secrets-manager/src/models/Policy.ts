import mongoose, { Document, Schema } from 'mongoose';
import { IAccessPolicy, IPolicyRule } from '../types';

export interface PolicyDocument extends Omit<IAccessPolicy, '_id'>, Document {}

const PolicyRuleSchema = new Schema<IPolicyRule>({
  resource: { type: String, required: true },
  actions: {
    type: [String],
    required: true,
    validate: {
      validator: function(v: string[]) {
        const allowedActions = ['create', 'read', 'update', 'delete', 'rotate', 'list', 'grant'];
        return v.every(action => allowedActions.includes(action));
      },
      message: 'Invalid action specified'
    }
  },
  conditions: { type: Schema.Types.Mixed },
  effect: {
    type: String,
    enum: ['allow', 'deny'],
    required: true
  }
}, { _id: false });

const PolicySchema = new Schema<PolicyDocument>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 255,
    index: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  rules: {
    type: [PolicyRuleSchema],
    required: true,
    validate: {
      validator: function(v: IPolicyRule[]) {
        return v && v.length > 0;
      },
      message: 'At least one rule is required'
    }
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000,
    index: true
  },
  appliesTo: {
    type: [String],
    default: [],
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'policies'
});

// Compound indexes
PolicySchema.index({ isActive: 1, priority: -1 });
PolicySchema.index({ appliesTo: 1, isActive: 1 });

// Instance methods
PolicySchema.methods.evaluateAccess = function(
  serviceId: string,
  resource: string,
  action: string
): { allowed: boolean; reason: string } {
  if (!this.isActive) {
    return { allowed: false, reason: 'Policy is inactive' };
  }

  // Check if policy applies to this service
  if (this.appliesTo.length > 0 && !this.appliesTo.includes(serviceId)) {
    return { allowed: false, reason: 'Policy does not apply to this service' };
  }

  // Find matching rules
  const matchingRules = this.rules.filter(rule => {
    const resourceMatch = this.resourceMatches(rule.resource, resource);
    const actionMatch = rule.actions.includes(action) || rule.actions.includes('*');
    return resourceMatch && actionMatch;
  });

  if (matchingRules.length === 0) {
    return { allowed: false, reason: 'No matching rules found' };
  }

  // Evaluate rules based on priority
  // Deny takes precedence
  for (const rule of matchingRules) {
    if (rule.effect === 'deny') {
      return { allowed: false, reason: `Denied by rule: ${rule.resource}` };
    }
  }

  return { allowed: true, reason: 'Allowed by policy' };
};

PolicySchema.methods.resourceMatches = function(pattern: string, resource: string): boolean {
  if (pattern === '*' || pattern === resource) {
    return true;
  }

  // Support wildcard patterns like "secrets/*" or "secrets/rez-*"
  const patternParts = pattern.split('/');
  const resourceParts = resource.split('/');

  if (patternParts.length !== resourceParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === '*') continue;
    if (patternParts[i] !== resourceParts[i]) {
      // Support prefix wildcards like "rez-*"
      if (patternParts[i].endsWith('*')) {
        const prefix = patternParts[i].slice(0, -1);
        if (!resourceParts[i].startsWith(prefix)) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  return true;
};

// Static methods
PolicySchema.statics.findForService = function(serviceId: string) {
  return this.find({
    isActive: true,
    $or: [
      { appliesTo: serviceId },
      { appliesTo: { $size: 0 } }
    ]
  }).sort({ priority: -1 });
};

PolicySchema.statics.findByName = function(name: string) {
  return this.findOne({ name });
};

PolicySchema.statics.getHighestPriority = function() {
  return this.findOne().sort({ priority: -1 }).select('priority');
};

export const Policy = mongoose.model<PolicyDocument>('Policy', PolicySchema);
