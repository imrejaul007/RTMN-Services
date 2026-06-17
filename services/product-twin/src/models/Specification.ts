import mongoose, { Document, Schema } from 'mongoose';

// Specification Types
export enum SpecType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ENUM = 'enum',
  RANGE = 'range',
  ARRAY = 'array',
  OBJECT = 'object'
}

// Specification Interface
export interface ISpecification extends Document {
  tenantId: string;
  productId: mongoose.Types.ObjectId;
  category: string; // e.g., 'General', 'Technical', 'Dimensions', 'Performance'
  name: string;
  value: any;
  unit?: string;
  type: SpecType;
  enumValues?: string[]; // For enum type
  min?: number; // For range type
  max?: number; // For range type
  description?: string;
  isRequired: boolean;
  isHighlighted: boolean; // Show prominently on product page
  displayOrder: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Specification Schema
const SpecificationSchema = new Schema<ISpecification>(
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
    category: {
      type: String,
      required: true,
      default: 'General'
    },
    name: {
      type: String,
      required: true
    },
    value: {
      type: Schema.Types.Mixed,
      required: true
    },
    unit: String,
    type: {
      type: String,
      enum: Object.values(SpecType),
      default: SpecType.STRING
    },
    enumValues: [String],
    min: Number,
    max: Number,
    description: String,
    isRequired: {
      type: Boolean,
      default: false
    },
    isHighlighted: {
      type: Boolean,
      default: false
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'specifications'
  }
);

// Indexes
SpecificationSchema.index({ tenantId: 1, productId: 1 });
SpecificationSchema.index({ tenantId: 1, productId: 1, category: 1 });
SpecificationSchema.index({ productId: 1, name: 1 }, { unique: true });

// Static method to get specifications by product grouped by category
SpecificationSchema.statics.getGroupedByCategory = async function (
  tenantId: string,
  productId: mongoose.Types.ObjectId
) {
  const specs = await this.find({ tenantId, productId }).sort({ displayOrder: 1 });

  const grouped: Record<string, ISpecification[]> = {};
  for (const spec of specs) {
    if (!grouped[spec.category]) {
      grouped[spec.category] = [];
    }
    grouped[spec.category].push(spec);
  }

  return grouped;
};

// Static method to bulk upsert specifications
SpecificationSchema.statics.bulkUpsert = async function (
  tenantId: string,
  productId: mongoose.Types.ObjectId,
  specifications: Array<{
    category?: string;
    name: string;
    value: any;
    unit?: string;
    type?: SpecType;
    description?: string;
    isRequired?: boolean;
    isHighlighted?: boolean;
    displayOrder?: number;
  }>
) {
  const bulkOps = specifications.map((spec) => ({
    updateOne: {
      filter: { tenantId, productId, name: spec.name },
      update: {
        $set: {
          ...spec,
          tenantId,
          productId,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      upsert: true
    }
  }));

  return this.bulkWrite(bulkOps);
};

// Export the model
export const Specification = mongoose.model<ISpecification>('Specification', SpecificationSchema);
export default Specification;
