/**
 * Category Model - Mongoose schema for knowledge base categories
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  parentId?: string;
  icon?: string;
  color?: string;
  order: number;
  isActive: boolean;
  articleCount: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    categoryId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, maxlength: 500 },
    parentId: { type: String, index: true },
    icon: String,
    color: String,
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    articleCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Indexes
categorySchema.index({ order: 1 });
categorySchema.index({ parentId: 1, order: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
export default Category;