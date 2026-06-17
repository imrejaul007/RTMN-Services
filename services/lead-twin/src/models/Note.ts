import mongoose, { Document, Schema } from 'mongoose';

// Note Interface
export interface INote extends Document {
  tenantId: string;
  noteId: string;
  leadId: string;
  content: string;
  authorId?: string;
  authorName?: string;
  isPrivate: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Note Schema
const NoteSchema = new Schema<INote>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    noteId: {
      type: String,
      required: true,
      unique: true,
    },
    leadId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    authorId: {
      type: String,
    },
    authorName: {
      type: String,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
NoteSchema.index(['tenantId', 'leadId']);
NoteSchema.index(['tenantId', 'isPrivate']);
NoteSchema.index(['tenantId', 'authorId']);
NoteSchema.index(['leadId', 'createdAt']);

export const Note = mongoose.model<INote>('Note', NoteSchema);
