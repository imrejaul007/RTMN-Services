/**
 * Comment Model - Mongoose schema for ticket comments/notes
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum CommentType {
  PUBLIC = 'public',     // Visible to customer
  INTERNAL = 'internal', // Internal notes
  SYSTEM = 'system',     // System-generated comments
}

export interface IComment extends Document {
  commentId: string;
  ticketId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: 'customer' | 'agent' | 'admin' | 'system';
  type: CommentType;
  attachments: Array<{ name: string; url: string; type: string; size: number }>;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    commentId: { type: String, required: true, unique: true, index: true },
    ticketId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorEmail: { type: String, required: true },
    authorRole: {
      type: String,
      enum: ['customer', 'agent', 'admin', 'system'],
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(CommentType),
      default: CommentType.PUBLIC,
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
      },
    ],
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
commentSchema.index({ ticketId: 1, createdAt: 1 });
commentSchema.index({ authorId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
export default Comment;
