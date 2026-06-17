/**
 * Media OS - Comment Model
 * Viewer comments on content
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator' },
  text: { type: String, required: true, maxLength: 2000 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  likes: { type: Number, default: 0 },
  replies: { type: Number, default: 0 },
  sentiment: { type: Number, default: 0.5 },
  moderation: {
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'flagged'], default: 'approved' },
    flaggedBy: String,
    reason: String,
  },
  status: { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' },
}, { timestamps: true });

commentSchema.index({ contentId: 1, status: 1, createdAt: -1 });
commentSchema.index({ viewerId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
