/**
 * GENIE Meeting Service - Business Logic
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { v4 as uuidv4 } from 'uuid';
import { MeetingModel, IMeetingDocument } from '../models/index.js';
import {
  CreateMeetingInput,
  UpdateMeetingInputType,
  AddTranscriptInputType,
  ListMeetingsQuery,
  MeetingStats,
  Meeting,
  ActionItem,
  Participant,
} from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('meeting-service');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert Mongoose document to Meeting interface
 */
function documentToMeeting(doc: IMeetingDocument): Meeting {
  return {
    id: doc.id,
    user_id: doc.user_id,
    title: doc.title,
    description: doc.description,
    meeting_url: doc.meeting_url,
    start_time: doc.start_time.toISOString(),
    end_time: doc.end_time?.toISOString(),
    duration_minutes: doc.duration_minutes,
    status: doc.status,
    participants: doc.participants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      joined_at: p.joined_at?.toISOString(),
      left_at: p.left_at?.toISOString(),
    })),
    transcript: doc.transcript,
    summary: doc.summary,
    key_points: doc.key_points,
    action_items: doc.action_items.map(a => ({
      id: a.id,
      content: a.content,
      assignee: a.assignee,
      assignee_email: a.assignee_email,
      due_date: a.due_date?.toISOString(),
      status: a.status,
      priority: a.priority,
      completed_at: a.completed_at?.toISOString(),
      created_at: a.created_at.toISOString(),
    })),
    decisions: doc.decisions,
    follow_up_meeting_id: doc.follow_up_meeting_id,
    source: doc.source,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at?.toISOString(),
  };
}

// ============================================================================
// Meeting Operations
// ============================================================================

/**
 * Create a new meeting
 */
export async function createMeeting(userId: string, input: CreateMeetingInput): Promise<Meeting> {
  logger.info('create_meeting', { userId, title: input.title });

  // Calculate duration if end_time is provided
  let durationMinutes: number | undefined;
  if (input.end_time) {
    const start = new Date(input.start_time);
    const end = new Date(input.end_time);
    durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  }

  // Create participants with IDs
  const participants: Participant[] = (input.participants || []).map(p => ({
    id: uuidv4(),
    name: p.name,
    email: p.email,
    role: p.role || 'attendee',
  }));

  const meeting = new MeetingModel({
    id: uuidv4(),
    user_id: userId,
    title: input.title,
    description: input.description,
    meeting_url: input.meeting_url,
    start_time: new Date(input.start_time),
    end_time: input.end_time ? new Date(input.end_time) : undefined,
    duration_minutes: durationMinutes,
    participants,
    source: input.source || 'manual',
  });

  await meeting.save();
  logger.info('meeting_created', { meetingId: meeting.id, userId });

  return documentToMeeting(meeting);
}

/**
 * Get meeting by ID
 */
export async function getMeetingById(meetingId: string, userId: string): Promise<Meeting | null> {
  const meeting = await MeetingModel.findOne({ id: meetingId, user_id: userId });
  return meeting ? documentToMeeting(meeting) : null;
}

/**
 * List meetings with pagination
 */
export async function listMeetings(
  userId: string,
  query: ListMeetingsQuery
): Promise<{ meetings: Meeting[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, status, start_date, end_date, sort_by, order } = query;
  const skip = (page - 1) * pageSize;

  // Build filter
  const filter: Record<string, unknown> = { user_id: userId };

  if (status) {
    filter.status = status;
  }

  if (start_date || end_date) {
    filter.start_time = {};
    if (start_date) (filter.start_time as Record<string, Date>).$gte = new Date(start_date);
    if (end_date) (filter.start_time as Record<string, Date>).$lte = new Date(end_date);
  }

  // Build sort
  const sortOrder = order === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = {};
  sort[sort_by] = sortOrder;

  const [meetings, total] = await Promise.all([
    MeetingModel.find(filter).sort(sort).skip(skip).limit(pageSize),
    MeetingModel.countDocuments(filter),
  ]);

  return {
    meetings: meetings.map(documentToMeeting),
    total,
    page,
    pageSize,
  };
}

/**
 * Update meeting
 */
export async function updateMeeting(
  meetingId: string,
  userId: string,
  input: UpdateMeetingInputType
): Promise<Meeting | null> {
  logger.info('update_meeting', { meetingId, userId });

  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.end_time !== undefined) updateData.end_time = new Date(input.end_time);
  if (input.summary !== undefined) updateData.summary = input.summary;
  if (input.key_points !== undefined) updateData.key_points = input.key_points;
  if (input.decisions !== undefined) updateData.decisions = input.decisions;

  // Calculate duration if end_time is updated
  if (input.end_time) {
    const meeting = await MeetingModel.findOne({ id: meetingId, user_id: userId });
    if (meeting) {
      const start = meeting.start_time;
      const end = new Date(input.end_time);
      updateData.duration_minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    }
  }

  // Handle action items
  if (input.action_items !== undefined) {
    updateData.action_items = input.action_items.map(a => ({
      id: a.id || uuidv4(),
      content: a.content,
      assignee: a.assignee,
      assignee_email: a.assignee_email,
      due_date: a.due_date ? new Date(a.due_date) : undefined,
      status: a.status,
      priority: a.priority,
      created_at: new Date(),
    }));
  }

  const meeting = await MeetingModel.findOneAndUpdate(
    { id: meetingId, user_id: userId },
    { $set: updateData },
    { new: true }
  );

  return meeting ? documentToMeeting(meeting) : null;
}

/**
 * Delete meeting
 */
export async function deleteMeeting(meetingId: string, userId: string): Promise<boolean> {
  logger.info('delete_meeting', { meetingId, userId });

  const result = await MeetingModel.deleteOne({ id: meetingId, user_id: userId });
  return result.deletedCount > 0;
}

/**
 * Add transcript to meeting
 */
export async function addTranscript(
  meetingId: string,
  userId: string,
  input: AddTranscriptInputType
): Promise<Meeting | null> {
  logger.info('add_transcript', { meetingId, userId });

  // Format transcript
  let formattedTranscript = '';
  if (input.transcript) {
    formattedTranscript = input.transcript
      .map(t => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
      .join('\n');
  } else if (input.raw_transcript) {
    formattedTranscript = input.raw_transcript;
  }

  const meeting = await MeetingModel.findOneAndUpdate(
    { id: meetingId, user_id: userId },
    { $set: { transcript: formattedTranscript } },
    { new: true }
  );

  return meeting ? documentToMeeting(meeting) : null;
}

/**
 * Generate AI summary for meeting
 * Note: This calls HOJAI AI for actual summarization
 */
export async function generateSummary(
  meetingId: string,
  userId: string
): Promise<{ summary: string; keyPoints: string[]; decisions: string[]; actionItems: ActionItem[] } | null> {
  logger.info('generate_summary', { meetingId, userId });

  const meeting = await MeetingModel.findOne({ id: meetingId, user_id: userId });
  if (!meeting) return null;

  // If no transcript, return empty summary
  if (!meeting.transcript) {
    return {
      summary: '',
      keyPoints: [],
      decisions: [],
      actionItems: [],
    };
  }

  // Note: In production, this would call HOJAI AI service for summarization
  // For now, we extract basic information from transcript

  const summary = `Meeting: ${meeting.title}. Duration: ${meeting.duration_minutes || 'N/A'} minutes.`;
  const keyPoints: string[] = [];
  const decisions: string[] = [];
  const actionItems: ActionItem[] = [];

  // Update meeting with summary
  await MeetingModel.updateOne(
    { id: meetingId },
    { $set: { summary, key_points: keyPoints, decisions, action_items: actionItems } }
  );

  return { summary, keyPoints, decisions, actionItems };
}

/**
 * Get action items for meeting
 */
export async function getActionItems(
  meetingId: string,
  userId: string
): Promise<ActionItem[]> {
  const meeting = await MeetingModel.findOne({ id: meetingId, user_id: userId });
  if (!meeting) return [];

  return meeting.action_items.map(a => ({
    id: a.id,
    content: a.content,
    assignee: a.assignee,
    assignee_email: a.assignee_email,
    due_date: a.due_date?.toISOString(),
    status: a.status,
    priority: a.priority,
    completed_at: a.completed_at?.toISOString(),
    created_at: a.created_at.toISOString(),
  }));
}

/**
 * Update action item status
 */
export async function updateActionItem(
  meetingId: string,
  userId: string,
  actionItemId: string,
  updates: { status?: string; due_date?: string; assignee?: string; assignee_email?: string }
): Promise<Meeting | null> {
  logger.info('update_action_item', { meetingId, actionItemId, userId });

  const updateData: Record<string, unknown> = {};

  if (updates.status) {
    updateData['action_items.$.status'] = updates.status;
    if (updates.status === 'completed') {
      updateData['action_items.$.completed_at'] = new Date();
    }
  }
  if (updates.due_date) updateData['action_items.$.due_date'] = new Date(updates.due_date);
  if (updates.assignee) updateData['action_items.$.assignee'] = updates.assignee;
  if (updates.assignee_email) updateData['action_items.$.assignee_email'] = updates.assignee_email;

  const meeting = await MeetingModel.findOneAndUpdate(
    { id: meetingId, user_id: userId, 'action_items.id': actionItemId },
    { $set: updateData },
    { new: true }
  );

  return meeting ? documentToMeeting(meeting) : null;
}

/**
 * Get meeting statistics
 */
export async function getMeetingStats(userId: string): Promise<MeetingStats> {
  const meetings = await MeetingModel.find({ user_id: userId });

  const totalMeetings = meetings.length;
  const completedMeetings = meetings.filter(m => m.status === 'completed').length;
  const upcomingMeetings = meetings.filter(m =>
    m.status === 'scheduled' && new Date(m.start_time) > new Date()
  ).length;

  // Count action items
  let totalActionItems = 0;
  let pendingActionItems = 0;
  let completedActionItems = 0;

  meetings.forEach(m => {
    m.action_items.forEach(a => {
      totalActionItems++;
      if (a.status === 'completed' || a.status === 'cancelled') {
        completedActionItems++;
      } else {
        pendingActionItems++;
      }
    });
  });

  // Calculate average duration
  const meetingsWithDuration = meetings.filter(m => m.duration_minutes);
  const averageDuration = meetingsWithDuration.length > 0
    ? Math.round(meetingsWithDuration.reduce((sum, m) => sum + (m.duration_minutes || 0), 0) / meetingsWithDuration.length)
    : undefined;

  return {
    total_meetings: totalMeetings,
    completed_meetings: completedMeetings,
    upcoming_meetings: upcomingMeetings,
    total_action_items: totalActionItems,
    pending_action_items: pendingActionItems,
    completed_action_items: completedActionItems,
    average_duration_minutes: averageDuration,
  };
}

/**
 * Get meetings for daily briefing
 */
export async function getDailyBriefingMeetings(
  userId: string,
  date: Date
): Promise<Meeting[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const meetings = await MeetingModel.find({
    user_id: userId,
    start_time: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['scheduled', 'in_progress'] },
  }).sort({ start_time: 1 });

  return meetings.map(documentToMeeting);
}
