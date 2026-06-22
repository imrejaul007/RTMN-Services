import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplateVariable {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'email' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
  description?: string;
}

export interface ITemplate extends Document {
  templateId: string;
  name: string;
  type: 'nda' | 'msa' | 'sow' | 'employment' | 'vendor' | 'custom';
  description: string;
  content: string;
  variables: ITemplateVariable[];
  variablesJson: string;
  isActive: boolean;
  createdBy: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
  };
  tenantId: string;
}

const TemplateVariableSchema = new Schema<ITemplateVariable>({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['string', 'number', 'date', 'email', 'boolean', 'select'],
    required: true
  },
  required: { type: Boolean, default: false },
  defaultValue: { type: Schema.Types.Mixed },
  options: { type: [String] },
  description: { type: String }
}, { _id: false });

const TemplateSchema = new Schema<ITemplate>({
  templateId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['nda', 'msa', 'sow', 'employment', 'vendor', 'custom'],
    required: true,
    index: true
  },
  description: { type: String, default: '' },
  content: { type: String, required: true },
  variables: { type: [TemplateVariableSchema], default: [] },
  variablesJson: { type: String, default: '[]' },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: String, required: true },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    usageCount: { type: Number, default: 0 }
  },
  tenantId: { type: String, required: true, index: true }
}, {
  timestamps: true
});

TemplateSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  if (this.isModified('content') || this.isModified('variables')) {
    this.variablesJson = JSON.stringify(this.variables);
  }
  next();
});

export const Template = mongoose.model<ITemplate>('Template', TemplateSchema);
export default Template;
