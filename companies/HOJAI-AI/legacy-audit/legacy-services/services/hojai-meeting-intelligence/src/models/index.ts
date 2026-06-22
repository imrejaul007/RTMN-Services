/**
 * HOJAI Meeting Intelligence - MongoDB Models
 */

import mongoose, { Schema, Document } from 'mongoose';
import { MeetingType, MeetingStatus, ParticipantRole, ActionItemStatus, ActionItemPriority, DecisionStatus, ImpactLevel, SummaryType } from '../types/index.js';

// ============================================================================
// MEETING MODEL
// ============================================================================

export interface IMeeting extends Document {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  meetingType: MeetingType;
  organizerId: string;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    role: ParticipantRole;
  }>;
  scheduledAt: Date;
  duration: number;
  timezone: string;
  status: MeetingStatus;
  location?: string;
  meetingUrl?: string;
  calendarEventId?: string;
  agenda: Array<{
    topic: string;
    duration: number;
    presenter?: string;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: Object.values(ParticipantRole), required: true }
}, { _id: false });

const AgendaItemSchema = new Schema({
  topic: { type: String, required: true },
  duration: { type: Number, required: true },
  presenter: { type: String },
  notes: { type: String }
}, { _id: false });

const MeetingSchema = new Schema<IMeeting>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 255 },
  description: { type: String },
  meetingType: { type: String, enum: Object.values(MeetingType), required: true },
  organizerId: { type: String, required: true, index: true },
  participants: { type: [ParticipantSchema], default: [] },
  scheduledAt: { type: Date, required: true, index: true },
  duration: { type: Number, required: true },
  timezone: { type: String, default: 'UTC' },
  status: { type: String, enum: Object.values(MeetingStatus), default: MeetingStatus.SCHEDULED, index: true },
  location: { type: String },
  meetingUrl: { type: String },
  calendarEventId: { type: String },
  agenda: { type: [AgendaItemSchema], default: [] }
}, { timestamps: true });

MeetingSchema.index({ tenantId: 1, id: 1 }, { unique: true });
MeetingSchema.index({ tenantId: 1, organizerId: 1 });
MeetingSchema.index({ tenantId: 1, status: 1, scheduledAt: -1 });
MeetingSchema.index({ tenantId: 1, meetingType: 1 });
MeetingSchema.index({ tenantId: 1, 'participants.userId': 1 });

export const MeetingModel = mongoose.model<IMeeting>('Meeting', MeetingSchema);

// ============================================================================
// MEETING NOTE MODEL
// ============================================================================

export interface IMeetingNote extends Document {
  id: string;
  tenantId: string;
  meetingId: string;
  content: string;
  authorId: string;
  timestamp: Date;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingNoteSchema = new Schema<IMeetingNote>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  meetingId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  authorId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true },
  isPinned: { type: Boolean, default: false }
}, { timestamps: true });

MeetingNoteSchema.index({ tenantId: 1, id: 1 }, { unique: true });
MeetingNoteSchema.index({ tenantId: 1, meetingId: 1, timestamp: -1 });
MeetingNoteSchema.index({ tenantId: 1, authorId: 1 });

export const MeetingNoteModel = mongoose.model<IMeetingNote>('MeetingNote', MeetingNoteSchema);

// ============================================================================
// ACTION ITEM MODEL
// ============================================================================

export interface IActionItem extends Document {
  id: string;
  tenantId: string;
  meetingId: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  dueDate?: Date;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  createdAt: Date;
  completedAt?: Date;
}

const ActionItemSchema = new Schema<IActionItem>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  meetingId: { type: String, required: true, index: true },
  description: { type: String, required: true },
  assigneeId: { type: String, required: true, index: true },
  assigneeName: { type: String, required: true },
  dueDate: { type: Date },
  status: { type: String, enum: Object.values(ActionItemStatus), default: ActionItemStatus.PENDING, index: true },
  priority: { type: String, enum: Object.values(ActionItemPriority), default: ActionItemPriority.MEDIUM, index: true },
  completedAt: { type: Date }
}, { timestamps: true });

ActionItemSchema.index({ tenantId: 1, id: 1 }, { unique: true });
ActionItemSchema.index({ tenantId: 1, meetingId: 1 });
ActionItemSchema.index({ tenantId: 1, assigneeId: 1, status: 1 });
ActionItemSchema.index({ tenantId: 1, dueDate: 1, status: 1 });
ActionItemSchema.index({ tenantId: 1, status: 1, priority: 1 });

export const ActionItemModel = mongoose.model<IActionItem>('ActionItem', ActionItemSchema);

// ============================================================================
// DECISION MODEL
// ============================================================================

export interface IDecision extends Document {
  id: string;
  tenantId: string;
  meetingId: string;
  title: string;
  description?: string;
  rationale?: string;
  decidedBy: string;
  decidedAt: Date;
  status: DecisionStatus;
  impact: ImpactLevel;
  createdAt: Date;
}

const DecisionSchema = new Schema<IDecision>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  meetingId: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 255 },
  description: { type: String },
  rationale: { type: String },
  decidedBy: { type: String, required: true, index: true },
  decidedAt: { type: Date, required: true },
  status: { type: String, enum: Object.values(DecisionStatus), default: DecisionStatus.PROPOSED, index: true },
  impact: { type: String, enum: Object.values(ImpactLevel), default: ImpactLevel.MEDIUM, index: true }
}, { timestamps: true });

DecisionSchema.index({ tenantId: 1, id: 1 }, { unique: true });
DecisionSchema.index({ tenantId: 1, meetingId: 1 });
DecisionSchema.index({ tenantId: 1, decidedBy: 1 });
DecisionSchema.index({ tenantId: 1, status: 1, impact: 1 });

export const DecisionModel = mongoose.model<IDecision>('Decision', DecisionSchema);

// ============================================================================
// MEETING SUMMARY MODEL
// ============================================================================

export interface IMeetingSummary extends Document {
  id: string;
  tenantId: string;
  meetingId: string;
  type: SummaryType;
  overview: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  nextSteps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  generatedAt: Date;
  generatedBy: string;
}

const MeetingSummarySchema = new Schema<IMeetingSummary>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  meetingId: { type: String, required: true, index: true },
  type: { type: String, enum: Object.values(SummaryType), required: true },
  overview: { type: String, required: true },
  keyPoints: { type: [String], default: [] },
  decisions: { type: [String], default: [] },
  actionItems: { type: [String], default: [] },
  nextSteps: { type: [String], default: [] },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
  generatedAt: { type: Date, required: true },
  generatedBy: { type: String, required: true }
}, { timestamps: true });

MeetingSummarySchema.index({ tenantId: 1, id: 1 }, { unique: true });
MeetingSummarySchema.index({ tenantId: 1, meetingId: 1, type: 1 }, { unique: true });

export const MeetingSummaryModel = mongoose.model<IMeetingSummary>('MeetingSummary', MeetingSummarySchema);

// ============================================================================
// PRE-MEETING CONTEXT MODEL
// ============================================================================

export interface IPreMeetingContext extends Document {
  id: string;
  tenantId: string;
  meetingId: string;
  relatedDiscussions: Array<{
    meetingId: string;
    title: string;
    summary: string;
    date: Date;
  }>;
  relevantDocuments: Array<{
    documentId: string;
    title: string;
    type: string;
    relevance: string;
  }>;
  participantContext: Array<{
    userId: string;
    name: string;
    role: string;
    background: string;
    concerns: string[];
  }>;
  previousDecisions: Array<{
    decisionId: string;
    title: string;
    status: string;
    decidedAt: Date;
  }>;
  pendingItems: Array<{
    itemId: string;
    description: string;
    assigneeId: string;
    dueDate?: Date;
  }>;
  generatedAt: Date;
}

const RelatedDiscussionSchema = new Schema({
  meetingId: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String },
  date: { type: Date }
}, { _id: false });

const RelevantDocumentSchema = new Schema({
  documentId: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String },
  relevance: { type: String }
}, { _id: false });

const ParticipantContextSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String },
  background: { type: String },
  concerns: { type: [String], default: [] }
}, { _id: false });

const PreviousDecisionSchema = new Schema({
  decisionId: { type: String, required: true },
  title: { type: String, required: true },
  status: { type: String },
  decidedAt: { type: Date }
}, { _id: false });

const PendingItemSchema = new Schema({
  itemId: { type: String, required: true },
  description: { type: String, required: true },
  assigneeId: { type: String },
  dueDate: { type: Date }
}, { _id: false });

const PreMeetingContextSchema = new Schema<IPreMeetingContext>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  meetingId: { type: String, required: true, index: true },
  relatedDiscussions: { type: [RelatedDiscussionSchema], default: [] },
  relevantDocuments: { type: [RelevantDocumentSchema], default: [] },
  participantContext: { type: [ParticipantContextSchema], default: [] },
  previousDecisions: { type: [PreviousDecisionSchema], default: [] },
  pendingItems: { type: [PendingItemSchema], default: [] },
  generatedAt: { type: Date, required: true }
}, { timestamps: true });

PreMeetingContextSchema.index({ tenantId: 1, id: 1 }, { unique: true });
PreMeetingContextSchema.index({ tenantId: 1, meetingId: 1 }, { unique: true });

export const PreMeetingContextModel = mongoose.model<IPreMeetingContext>('PreMeetingContext', PreMeetingContextSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export const models = {
  Meeting: MeetingModel,
  MeetingNote: MeetingNoteModel,
  ActionItem: ActionItemModel,
  Decision: DecisionModel,
  MeetingSummary: MeetingSummaryModel,
  PreMeetingContext: PreMeetingContextModel
};

export default models;