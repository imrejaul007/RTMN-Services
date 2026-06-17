import mongoose, { Document, Schema } from 'mongoose';
export interface IConversation extends Document {
  conversationId: string; userId: string; orgId: string; clientId: string;
  mode: 'chat' | 'analysis' | 'automation' | 'research';
  messages: { role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date; metadata?: any }[];
  context: Record<string, any>; summary?: string;
  isActive: boolean; lastMessageAt: Date;
  metadata: Record<string, any>; createdAt: Date; updatedAt: Date;
}
const ConversationSchema = new Schema<IConversation>({
  conversationId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true },
  mode: { type: String, enum: ['chat', 'analysis', 'automation', 'research'], default: 'chat' },
  messages: [{ role: { type: String, enum: ['user', 'assistant', 'system'] }, content: String, timestamp: Date, metadata: Schema.Types.Mixed }],
  context: { type: Schema.Types.Mixed, default: {} }, summary: String,
  isActive: { type: Boolean, default: true }, lastMessageAt: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });
export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
