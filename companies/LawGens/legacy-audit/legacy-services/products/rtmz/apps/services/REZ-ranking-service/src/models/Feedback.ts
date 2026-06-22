import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  feedbackId: string;
  experimentId?: string;
  variantId?: string;
  userId: string;
  itemId: string;
  itemType: string;
  eventType: 'impression' | 'click' | 'view' | 'conversion' | 'purchase' | 'dismiss';
  position: number;
  score?: number;
  context: {
    location?: string;
    device?: string;
    timeOfDay?: string;
    sessionId?: string;
    referrer?: string;
  };
  metadata: {
    duration?: number;
    scrollDepth?: number;
    revenue?: number;
    quantity?: number;
    rating?: number;
  };
  timestamp: Date;
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>({
  feedbackId: { type: String, required: true, unique: true, index: true },
  experimentId: { type: String, index: true },
  variantId: { type: String, index: true },
  userId: { type: String, required: true, index: true },
  itemId: { type: String, required: true, index: true },
  itemType: { type: String, required: true },
  eventType: {
    type: String,
    enum: ['impression', 'click', 'view', 'conversion', 'purchase', 'dismiss'],
    required: true
  },
  position: { type: Number, required: true },
  score: { type: Number },
  context: {
    location: String,
    device: String,
    timeOfDay: String,
    sessionId: String,
    referrer: String
  },
  metadata: {
    duration: Number,
    scrollDepth: Number,
    revenue: Number,
    quantity: Number,
    rating: Number
  },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

FeedbackSchema.index({ userId: 1, itemId: 1, eventType: 1 });
FeedbackSchema.index({ experimentId: 1, variantId: 1, timestamp: -1 });
FeedbackSchema.index({ itemId: 1, eventType: 1, timestamp: -1 });
FeedbackSchema.index({ createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);
