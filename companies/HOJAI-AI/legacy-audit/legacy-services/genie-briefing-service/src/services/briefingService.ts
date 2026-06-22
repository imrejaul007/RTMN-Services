/**
 * GENIE Briefing Service - Briefing Service
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Business logic for briefing generation and retrieval
 */

import { v4 as uuidv4 } from 'uuid';
import { BriefingModel, IBriefingDocument } from '../models/index.js';
import {
  Briefing,
  BriefingItem,
  BriefingSectionInput,
  BriefingType,
  SectionType,
  CreateBriefingInput,
  UpdateBriefingInput,
  GenerateBriefingInput,
  ListBriefingsQuery,
} from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('briefing-service');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Convert Mongoose document to Briefing interface
 */
function documentToBriefing(doc: IBriefingDocument): Briefing {
  return {
    id: doc.id,
    user_id: doc.user_id,
    type: doc.type,
    date: doc.date,
    sections: doc.sections,
    summary: doc.summary,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at?.toISOString(),
  };
}

/**
 * Generate sample briefing items for a section
 */
function generateSampleItems(sectionType: SectionType): BriefingItem[] {
  const items: BriefingItem[] = [];

  switch (sectionType) {
    case 'calendar':
      items.push({
        id: uuidv4(),
        title: 'Team standup meeting',
        description: 'Daily sync at 10:00 AM',
        priority: 'medium',
        completed: false,
        action_url: '/calendar/meeting-123',
      });
      items.push({
        id: uuidv4(),
        title: 'Project deadline',
        description: 'Sprint review presentation',
        priority: 'high',
        completed: false,
      });
      break;

    case 'tasks':
      items.push({
        id: uuidv4(),
        title: 'Review pull requests',
        description: '3 pending reviews for the frontend project',
        priority: 'medium',
        completed: false,
        action_url: '/tasks/pr-reviews',
      });
      items.push({
        id: uuidv4(),
        title: 'Update documentation',
        description: 'API docs need updating',
        priority: 'low',
        completed: false,
      });
      break;

    case 'followups':
      items.push({
        id: uuidv4(),
        title: 'Follow up with Sarah',
        description: 'Regarding the proposal discussion',
        priority: 'high',
        completed: false,
      });
      items.push({
        id: uuidv4(),
        title: 'Check in with James',
        description: 'Onboarding feedback',
        priority: 'medium',
        completed: false,
      });
      break;

    case 'weather':
      items.push({
        id: uuidv4(),
        title: `Current: ${Math.round(22 + Math.random() * 5)}°C, Partly Cloudy`,
        description: 'Temperature expected to rise to 28°C by afternoon',
        priority: 'low',
      });
      break;

    case 'insights':
      items.push({
        id: uuidv4(),
        title: 'Productivity peak time',
        description: 'Your focus tends to be highest between 9-11 AM',
        priority: 'low',
      });
      items.push({
        id: uuidv4(),
        title: '3 pending decisions',
        description: 'Decisions awaiting your input this week',
        priority: 'medium',
      });
      break;

    case 'reminders':
      items.push({
        id: uuidv4(),
        title: 'Weekly 1:1 with manager',
        description: 'Every Friday at 4:00 PM',
        priority: 'medium',
        completed: false,
        action_url: '/calendar/weekly-1on1',
      });
      items.push({
        id: uuidv4(),
        title: 'Submit expense report',
        description: 'Deadline: End of this week',
        priority: 'high',
        completed: false,
      });
      break;
  }

  return items;
}

/**
 * Generate briefing sections based on type
 */
function generateBriefingSections(briefingType: BriefingType, includeSections?: SectionType[]): BriefingSectionInput[] {
  const allSections: SectionType[] = ['calendar', 'tasks', 'followups', 'weather', 'insights', 'reminders'];
  const sectionsToInclude = includeSections || allSections;

  // Morning briefings focus on planning, evening on reflection
  const morningSections: SectionType[] = ['calendar', 'tasks', 'weather', 'insights'];
  const eveningSections: SectionType[] = ['tasks', 'followups', 'insights', 'reminders'];

  const relevantSections = briefingType === 'morning' ? morningSections : eveningSections;

  return relevantSections
    .filter((section) => sectionsToInclude.includes(section))
    .map((sectionType) => {
      const titles: Record<SectionType, string> = {
        calendar: 'Your Day Ahead',
        tasks: 'Tasks to Focus On',
        followups: 'Follow-ups Needed',
        weather: 'Weather & Conditions',
        insights: 'Insights for You',
        reminders: 'Reminders',
      };

      return {
        type: sectionType,
        title: titles[sectionType],
        items: generateSampleItems(sectionType),
      };
    });
}

/**
 * Generate a summary based on briefing content
 */
function generateSummary(type: BriefingType, sections: BriefingSectionInput[]): string {
  const highPriorityCount = sections.reduce(
    (count, section) =>
      count + section.items.filter((item) => item.priority === 'high').length,
    0
  );

  const totalTasks = sections
    .filter((s) => s.type === 'tasks')
    .reduce((count, section) => count + section.items.length, 0);

  if (type === 'morning') {
    return `Good morning! You have ${totalTasks} tasks today with ${highPriorityCount} high-priority items. Stay focused and make the most of your day!`;
  } else {
    const completedCount = sections
      .filter((s) => s.type === 'tasks')
      .reduce((count, section) => count + section.items.filter((i) => i.completed).length, 0);
    return `Here's your evening briefing. ${completedCount} of ${totalTasks} tasks completed. ${highPriorityCount} items need your attention tomorrow.`;
  }
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get briefing for a specific date
 */
export async function getBriefingByDate(
  userId: string,
  date: string,
  briefingType?: BriefingType
): Promise<Briefing | null> {
  logger.info('get_briefing_by_date', { userId, date, briefingType });

  const query: Record<string, string> = { user_id: userId, date };
  if (briefingType) {
    query.type = briefingType;
  }

  const doc = await BriefingModel.findOne(query).exec();
  if (!doc) {
    return null;
  }

  return documentToBriefing(doc);
}

/**
 * Get today's briefing
 */
export async function getTodayBriefing(userId: string): Promise<Briefing | null> {
  const today = getTodayDate();
  return getBriefingByDate(userId, today);
}

/**
 * Get morning briefing for a date
 */
export async function getMorningBriefing(userId: string, date?: string): Promise<Briefing | null> {
  const targetDate = date || getTodayDate();
  return getBriefingByDate(userId, targetDate, 'morning');
}

/**
 * Get evening briefing for a date
 */
export async function getEveningBriefing(userId: string, date?: string): Promise<Briefing | null> {
  const targetDate = date || getTodayDate();
  return getBriefingByDate(userId, targetDate, 'evening');
}

/**
 * List briefings with pagination
 */
export async function listBriefings(
  userId: string,
  query: ListBriefingsQuery
): Promise<{ briefings: Briefing[]; total: number; page: number; pageSize: number }> {
  logger.info('list_briefings', { userId, query });

  const { page, pageSize, type, startDate, endDate } = query;
  const skip = (page - 1) * pageSize;

  const filter: Record<string, unknown> = { user_id: userId };

  if (type) {
    filter.type = type;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      (filter.date as Record<string, string>).$gte = startDate;
    }
    if (endDate) {
      (filter.date as Record<string, string>).$lte = endDate;
    }
  }

  const [docs, total] = await Promise.all([
    BriefingModel.find(filter).sort({ created_at: -1 }).skip(skip).limit(pageSize).exec(),
    BriefingModel.countDocuments(filter).exec(),
  ]);

  return {
    briefings: docs.map(documentToBriefing),
    total,
    page,
    pageSize,
  };
}

/**
 * Generate a new briefing
 */
export async function generateBriefing(input: GenerateBriefingInput): Promise<Briefing> {
  logger.info('generate_briefing', { userId: input.user_id, type: input.type });

  const id = uuidv4();
  const date = input.date || getTodayDate();
  const sections = generateBriefingSections(input.type, input.include_sections);
  const summary = generateSummary(input.type, sections);

  const briefingData = {
    id,
    user_id: input.user_id,
    type: input.type,
    date,
    sections,
    summary,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const doc = new BriefingModel(briefingData);
  await doc.save();

  logger.info('briefing_generated', { id, userId: input.user_id, type: input.type });

  return documentToBriefing(doc);
}

/**
 * Create a briefing manually
 */
export async function createBriefing(
  userId: string,
  input: CreateBriefingInput
): Promise<Briefing> {
  logger.info('create_briefing', { userId, type: input.type });

  // Check if briefing already exists for this date/type
  const existing = await getBriefingByDate(userId, input.date, input.type);
  if (existing) {
    throw new Error(`Briefing for ${input.type} on ${input.date} already exists`);
  }

  const id = uuidv4();
  const briefingData = {
    id,
    user_id: userId,
    type: input.type,
    date: input.date,
    sections: input.sections,
    summary: input.summary || generateSummary(input.type, input.sections),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const doc = new BriefingModel(briefingData);
  await doc.save();

  logger.info('briefing_created', { id, userId, type: input.type });

  return documentToBriefing(doc);
}

/**
 * Update a briefing
 */
export async function updateBriefing(
  id: string,
  userId: string,
  input: UpdateBriefingInput
): Promise<Briefing | null> {
  logger.info('update_briefing', { id, userId });

  const doc = await BriefingModel.findOne({ id, user_id: userId }).exec();
  if (!doc) {
    return null;
  }

  // Update fields
  if (input.type !== undefined) doc.type = input.type;
  if (input.date !== undefined) doc.date = input.date;
  if (input.sections !== undefined) doc.sections = input.sections;
  if (input.summary !== undefined) doc.summary = input.summary;

  doc.updated_at = new Date();
  await doc.save();

  logger.info('briefing_updated', { id, userId });

  return documentToBriefing(doc);
}

/**
 * Delete a briefing
 */
export async function deleteBriefing(id: string, userId: string): Promise<boolean> {
  logger.info('delete_briefing', { id, userId });

  const result = await BriefingModel.deleteOne({ id, user_id: userId }).exec();
  return result.deletedCount > 0;
}

/**
 * Update a briefing item (mark as completed, etc.)
 */
export async function updateBriefingItem(
  briefingId: string,
  userId: string,
  sectionType: SectionType,
  itemId: string,
  updates: Partial<BriefingItem>
): Promise<Briefing | null> {
  logger.info('update_briefing_item', { briefingId, userId, sectionType, itemId });

  const doc = await BriefingModel.findOne({ id: briefingId, user_id: userId }).exec();
  if (!doc) {
    return null;
  }

  // Find and update the item
  const section = doc.sections.find((s) => s.type === sectionType);
  if (!section) {
    throw new Error(`Section ${sectionType} not found in briefing`);
  }

  const item = section.items.find((i) => i.id === itemId);
  if (!item) {
    throw new Error(`Item ${itemId} not found in section`);
  }

  // Apply updates
  if (updates.title !== undefined) item.title = updates.title;
  if (updates.description !== undefined) item.description = updates.description;
  if (updates.priority !== undefined) item.priority = updates.priority;
  if (updates.completed !== undefined) item.completed = updates.completed;
  if (updates.action_url !== undefined) item.action_url = updates.action_url;

  doc.updated_at = new Date();
  await doc.save();

  logger.info('briefing_item_updated', { briefingId, userId, itemId });

  return documentToBriefing(doc);
}
