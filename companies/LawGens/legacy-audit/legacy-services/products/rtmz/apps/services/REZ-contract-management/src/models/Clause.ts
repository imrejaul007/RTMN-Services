import mongoose, { Document, Schema } from 'mongoose';

export interface IClause extends Document {
  clauseId: string;
  name: string;
  category: 'confidentiality' | 'termination' | 'liability' | 'payment' | 'intellectual_property' | 'compliance' | 'dispute' | 'general';
  content: string;
  description: string;
  tags: string[];
  isActive: boolean;
  createdBy: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
  };
  tenantId: string;
}

const ClauseSchema = new Schema<IClause>({
  clauseId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['confidentiality', 'termination', 'liability', 'payment', 'intellectual_property', 'compliance', 'dispute', 'general'],
    required: true,
    index: true
  },
  content: { type: String, required: true },
  description: { type: String, default: '' },
  tags: { type: [String], default: [], index: true },
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

ClauseSchema.index({ tenantId: 1, category: 1 });
ClauseSchema.index({ tenantId: 1, isActive: 1 });
ClauseSchema.index({ tenantId: 1, tags: 1 });

ClauseSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

export const Clause = mongoose.model<IClause>('Clause', ClauseSchema);
export default Clause;
