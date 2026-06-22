import mongoose, { Schema, Document } from 'mongoose';

export interface IHandoff extends Document {
  _id: mongoose.Types.ObjectId;
  handoffId: string;
  conversationId: string;
  tenantId: string;
  channel: string;

  aiContext: {
    botId: string;
    flowId: string;
    lastNodeId: string;
    conversationSummary: string;
    unresolvedIntents?: string[];
    customerSentiment?: 'positive' | 'neutral' | 'negative';
    conversationDuration?: number;
    messageCount?: number;
  };

  reason: string;
  reasonDescription?: string;

  priority: string;
  targetTeam?: string;
  targetAgent?: string;

  status: string;

  initiatedAt: Date;
  queuedAt?: Date;
  offeredAt?: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  timeoutAt?: Date;

  offeredAgentId?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;

  customerFeedback?: {
    rating?: number;
    comment?: string;
    wouldEscalate?: boolean;
  };

  agentNotes?: string;
  metadata?: Record<string, any>;
}

const HandoffSchema = new Schema<IHandoff>(
  {
    handoffId: { type: String, required: true, unique: true, index: true },
    conversationId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    channel: { type: String, required: true },

    aiContext: {
      botId: { type: String, required: true },
      flowId: { type: String, required: true },
      lastNodeId: String,
      conversationSummary: { type: String, required: true },
      unresolvedIntents: [String],
      customerSentiment: String,
      conversationDuration: Number,
      messageCount: Number
    },

    reason: { type: String, required: true },
    reasonDescription: String,

    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    targetTeam: String,
    targetAgent: String,

    status: {
      type: String,
      enum: ['pending', 'in_queue', 'offered', 'accepted', 'declined', 'completed', 'cancelled', 'timeout'],
      default: 'pending',
      index: true
    },

    initiatedAt: { type: Date, default: Date.now },
    queuedAt: Date,
    offeredAt: Date,
    acceptedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    timeoutAt: Date,

    offeredAgentId: String,
    assignedAgentId: String,
    assignedAgentName: String,

    customerFeedback: {
      rating: Number,
      comment: String,
      wouldEscalate: Boolean
    },

    agentNotes: String,
    metadata: { type: Map, of: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'handoff_records'
  }
);

HandoffSchema.index({ tenantId: 1, status: 1 });
HandoffSchema.index({ tenantId: 1, reason: 1 });
HandoffSchema.index({ assignedAgentId: 1, status: 1 });
HandoffSchema.index({ initiatedAt: -1 });

// Methods
HandoffSchema.methods.queue = function () {
  this.status = 'in_queue';
  this.queuedAt = new Date();
  return this.save();
};

HandoffSchema.methods.offerToAgent = function (agentId: string, agentName: string) {
  this.status = 'offered';
  this.offeredAgentId = agentId;
  this.assignedAgentName = agentName;
  this.offeredAt = new Date();
  return this.save();
};

HandoffSchema.methods.accept = function (agentId: string) {
  this.status = 'accepted';
  this.assignedAgentId = agentId;
  this.acceptedAt = new Date();
  return this.save();
};

HandoffSchema.methods.decline = function () {
  this.status = 'pending';
  this.offeredAgentId = undefined;
  return this.save();
};

HandoffSchema.methods.complete = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

HandoffSchema.methods.cancel = function () {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  return this.save();
};

HandoffSchema.methods.timeout = function () {
  this.status = 'timeout';
  return this.save();
};

export const Handoff = mongoose.model<IHandoff>('Handoff', HandoffSchema);

export interface IHandoffOffer extends Document {
  _id: mongoose.Types.ObjectId;
  offerId: string;
  handoffId: string;
  agentId: string;
  agentName: string;
  team: string;
  offeredAt: Date;
  expiresAt: Date;
  status: string;
  responseAt?: Date;
}

const HandoffOfferSchema = new Schema<IHandoffOffer>(
  {
    offerId: { type: String, required: true, unique: true, index: true },
    handoffId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    agentName: { type: String, required: true },
    team: { type: String, required: true },
    offeredAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending'
    },
    responseAt: Date
  },
  {
    timestamps: true,
    collection: 'handoff_offers'
  }
);

HandoffOfferSchema.index({ agentId: 1, status: 1 });

export const HandoffOffer = mongoose.model<IHandoffOffer>('HandoffOffer', HandoffOfferSchema);

export interface IHandoffRule extends Document {
  _id: mongoose.Types.ObjectId;
  ruleId: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: Array<{
    type: string;
    operator: string;
    value: any;
  }>;
  action: {
    type: string;
    targetTeam?: string;
    targetAgent?: string;
    priority?: string;
    message?: string;
  };
  active: boolean;
  priority: number;
}

const HandoffRuleSchema = new Schema<IHandoffRule>(
  {
    ruleId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    conditions: [Schema.Types.Mixed],
    action: Schema.Types.Mixed,
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    collection: 'handoff_rules'
  }
);

HandoffRuleSchema.index({ tenantId: 1, active: 1, priority: -1 });

export const HandoffRule = mongoose.model<IHandoffRule>('HandoffRule', HandoffRuleSchema);
