import mongoose, { Schema, Document } from 'mongoose';

export type RatingType = 'delivery' | 'quality' | 'payment' | 'communication' | 'overall';
export type RatingSubject = 'supplier' | 'buyer';
export type RatingSource = 'buyer' | 'supplier' | 'system' | 'auto_pipeline';

export interface IRating extends Document {
  ratingId: string;
  type: RatingType;
  subject: RatingSubject;
  subjectCorpId: string;          // whose reputation is being updated
  raterCorpId: string;            // who gave the rating
  raterRole: 'buyer' | 'supplier' | 'system';
  dealId?: string;                // reference to deal that triggered rating
  score: number;                  // 1-5 stars
  feedback?: string;
  source: RatingSource;
  weight: number;                 // 0-1, used by aggregation
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ratingSchema = new Schema<IRating>(
  {
    ratingId: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['delivery', 'quality', 'payment', 'communication', 'overall'],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      enum: ['supplier', 'buyer'],
      required: true,
      index: true,
    },
    subjectCorpId: { type: String, required: true, index: true },
    raterCorpId: { type: String, required: true, index: true },
    raterRole: { type: String, enum: ['buyer', 'supplier', 'system'], required: true },
    dealId: { type: String, index: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, maxlength: 1000 },
    source: {
      type: String,
      enum: ['buyer', 'supplier', 'system', 'auto_pipeline'],
      default: 'buyer',
      index: true,
    },
    weight: { type: Number, default: 1.0, min: 0, max: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ratingSchema.index({ subjectCorpId: 1, type: 1, createdAt: -1 });
ratingSchema.index({ raterCorpId: 1, subjectCorpId: 1, dealId: 1 }, { unique: true, sparse: true });

export const Rating = mongoose.model<IRating>('Rating', ratingSchema);
