import mongoose, { Document, Schema, Model } from 'mongoose';

// Line item schema for detailed line item management
export interface ILineItem extends Document {
  lineItemId: string;
  invoiceId: string;
  tenantId: string;
  description: string;
  quantity: number;
  price: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  unit?: string;
  sku?: string;
  discount?: number;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<ILineItem>(
  {
    lineItemId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invoiceId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: String,
    sku: String,
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: String,
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'line_items',
  }
);

// Compound indexes
LineItemSchema.index({ tenantId: 1, invoiceId: 1 });
LineItemSchema.index({ invoiceId: 1, lineItemId: 1 });

// Pre-save hook to calculate totals
LineItemSchema.pre('save', function (next) {
  // Calculate line total before discount
  const grossTotal = this.price * this.quantity;

  // Calculate tax amount
  this.taxAmount = (grossTotal - (this.discount || 0)) * (this.taxRate / 100);

  // Calculate final total
  this.total = grossTotal - (this.discount || 0) + this.taxAmount;

  next();
});

// Static method to recalculate invoice totals
LineItemSchema.statics.recalculateInvoiceTotals = async function (
  invoiceId: string,
  tenantId: string
): Promise<{ subtotal: number; taxAmount: number; total: number }> {
  const items = await this.find({ invoiceId, tenantId });

  const subtotal = items.reduce((sum, item) => {
    const grossTotal = item.price * item.quantity;
    return sum + grossTotal - (item.discount || 0);
  }, 0);

  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);

  const total = subtotal + taxAmount;

  return { subtotal, taxAmount, total };
};

const LineItem: Model<ILineItem> = mongoose.model<ILineItem>('LineItem', LineItemSchema);

export default LineItem;
