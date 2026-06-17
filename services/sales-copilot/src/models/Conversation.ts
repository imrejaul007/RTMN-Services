import mongoose, { Schema } from 'mongoose';
import { IConversation, ConversationType, Sentiment } from '../types';

const ConversationSchema = new Schema<IConversation>(
  {
    leadId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(ConversationType),
      required: true
    },
    content: {
      type: String,
      required: true
    },
    talkingPoints: [{
      type: String
    }],
    sentiment: {
      type: String,
      enum: Object.values(Sentiment)
    },
    keyInsights: [{
      type: String
    }],
    followUpTasks: [{
      type: String
    }]
  },
  {
    timestamps: true
  }
);

// Indexes
ConversationSchema.index({ leadId: 1, createdAt: -1 });
ConversationSchema.index({ leadId: 1, type: 1 });

// Methods
ConversationSchema.methods.getRecentConversations = async function(limit = 10) {
  return Conversation.find({ leadId: this.leadId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
