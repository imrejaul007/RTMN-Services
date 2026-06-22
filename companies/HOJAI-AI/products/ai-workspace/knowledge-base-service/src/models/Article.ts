/**
 * Article Model - Mongoose schema for knowledge base articles
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ArticleVisibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  PRIVATE = 'private',
}

export interface IArticle extends Document {
  articleId: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  status: ArticleStatus;
  visibility: ArticleVisibility;
  categoryId: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorEmail: string;
  views: number;
  helpful: number;
  notHelpful: number;
  relatedArticles: string[];
  attachments: Array<{ name: string; url: string; type: string; size: number }>;
  metadata: Record<string, unknown>;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const articleSchema = new Schema<IArticle>(
  {
    articleId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, maxlength: 300 },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true },
    summary: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: Object.values(ArticleStatus),
      default: ArticleStatus.DRAFT,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(ArticleVisibility),
      default: ArticleVisibility.PUBLIC,
      index: true,
    },
    categoryId: { type: String, required: true, index: true },
    tags: [{ type: String, index: true }],
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorEmail: { type: String, required: true },
    views: { type: Number, default: 0 },
    helpful: { type: Number, default: 0 },
    notHelpful: { type: Number, default: 0 },
    relatedArticles: [{ type: String }],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
      },
    ],
    metadata: { type: Schema.Types.Mixed, default: {} },
    publishedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
articleSchema.index({ title: 'text', content: 'text', summary: 'text' });
articleSchema.index({ createdAt: -1 });
articleSchema.index({ views: -1 });
articleSchema.index({ helpful: -1 });

export const Article = mongoose.model<IArticle>('Article', articleSchema);
export default Article;