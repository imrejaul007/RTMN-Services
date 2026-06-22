import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Extracted Invoice Data Model
 * Stores the AI-extracted data from invoice documents
 */

export interface LineItem {
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export interface ExtractedData {
  vendorName: string;
  vendorAddress?: string;
  vendorGstin?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  lineItems: LineItem[];
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  totalAmount: number;
  confidence: number;
}

export interface ExtractedDataDocument extends Omit<ExtractedData, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

interface IExtractedDataModel extends Model<ExtractedDataDocument> {
  findByInvoiceOcrId(invoiceOcrId: string): Promise<ExtractedDataDocument | null>;
}

const LineItemSchema = new Schema<LineItem>({
  description: { type: String, required: true },
  hsnCode: { type: String, default: '' },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
}, { _id: false });

const ExtractedDataSchema = new Schema<ExtractedDataDocument, IExtractedDataModel>({
  vendorName: { type: String, required: true },
  vendorAddress: { type: String },
  vendorGstin: { type: String },
  invoiceNumber: { type: String, required: true },
  invoiceDate: { type: String, required: true },
  dueDate: { type: String },
  lineItems: { type: [LineItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  totalCgst: { type: Number, default: 0 },
  totalSgst: { type: Number, default: 0 },
  totalIgst: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  confidence: { type: Number, default: 0, min: 0, max: 1 },
}, {
  timestamps: true,
  collection: 'extracted_data',
});

// Indexes
ExtractedDataSchema.index({ invoiceNumber: 1 });
ExtractedDataSchema.index({ invoiceDate: 1 });
ExtractedDataSchema.index({ vendorGstin: 1 });
ExtractedDataSchema.index({ createdAt: -1 });

// Static method
ExtractedDataSchema.statics.findByInvoiceOcrId = async function (
  invoiceOcrId: string
): Promise<ExtractedDataDocument | null> {
  const InvoiceOCRModel = mongoose.model('InvoiceOCR');
  const invoice = await InvoiceOCRModel.findOne({ invoiceOcrId });
  if (!invoice) return null;
  return this.findById(invoice.extractedDataId);
};

export const ExtractedDataModel = mongoose.model<ExtractedDataDocument, IExtractedDataModel>(
  'ExtractedData',
  ExtractedDataSchema
);
