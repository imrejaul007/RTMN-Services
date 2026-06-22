/**
 * Tag Model - Mongoose schema for knowledge base tags
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ITag extends Document {
  tagId: string;
  name: string;
  slug: string;
  description?: string;
  usageCount: number;
  isTrending: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    tagId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true, maxlength: 50 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, maxlength: 200 },
    usageCount: { type: Number, default: 0 },
    isTrending: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes
tagSchema.index({ usageCount: -1 });
tagSchema.index({ isTrending: -1, usageCount: -1 });

export const Tag = mongoose.model<ITag>('Tag', tagSchema);
export default Tag;