import mongoose, { Document, Schema } from 'mongoose';

export type ActionCategory = 'data' | 'communication' | 'computation' | 'integration' | 'automation' | 'analysis' | 'custom';
export type ActionStatus = 'active' | 'deprecated' | 'beta' | 'internal';

export interface IActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  default?: any;
  validation?: Record<string, any>;
}

export interface IAction extends Document {
  actionId: string;
  name: string;
  description: string;
  category: ActionCategory;
  version: string;
  status: ActionStatus;
  parameters: IActionParameter[];
  returnType: string;
  handler: string;
  config: Record<string, any>;
  rateLimit?: {
    requests: number;
    window: string;
  };
  requiredPermissions?: string[];
  tags: string[];
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActionParameterSchema = new Schema<IActionParameter>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'object', 'array'],
      required: true,
    },
    required: { type: Boolean, default: false },
    description: { type: String },
    default: { type: Schema.Types.Mixed },
    validation: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const ActionSchema = new Schema<IAction>(
  {
    actionId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['data', 'communication', 'computation', 'integration', 'automation', 'analysis', 'custom'],
      required: true,
    },
    version: { type: String, default: '1.0.0' },
    status: {
      type: String,
      enum: ['active', 'deprecated', 'beta', 'internal'],
      default: 'active',
    },
    parameters: { type: [ActionParameterSchema], default: [] },
    returnType: { type: String, default: 'object' },
    handler: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    rateLimit: {
      requests: { type: Number },
      window: { type: String },
    },
    requiredPermissions: [{ type: String }],
    tags: [{ type: String }],
    usageCount: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

ActionSchema.index({ name: 'text', description: 'text' });
ActionSchema.index({ category: 1, status: 1 });
ActionSchema.index({ tags: 1 });

export const Action = mongoose.model<IAction>('Action', ActionSchema);
