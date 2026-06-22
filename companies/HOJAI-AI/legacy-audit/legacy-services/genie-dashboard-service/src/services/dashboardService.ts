/**
 * GENIE Dashboard Service - Business Logic
 * Version: 1.0.0 | Date: June 14, 2026
 *
 * Aggregates data from all Genie services into a simple dashboard
 * Like Vellum: "Your Personal Intelligence, Simplified"
 */

import { createLogger } from '../utils/logger.js';
import {
  DashboardData,
  DashboardSummary,
  MemorySummary,
  CalendarSummary,
  EmailSummary,
  BriefingSummary,
  RelationshipSummary,
  TaskSummary,
  QuickAction,
  Insight,
} from '../types.js';

const logger = createLogger('dashboard-service');

// Configuration - Service URLs
const SERVICES = {
  memory: process.env.GENIE_MEMORY_URL || 'http://localhost:4703',
  relationship: process.env.GENIE_RELATIONSHIP_URL || 'http://localhost:4704',
  briefing: process.env.GENIE_BRIEFING_URL || 'http://localhost:4706',
  calendar: process.env.GENIE_CALENDAR_URL || 'http://localhost:4709',
  email: process.env.GENIE_EMAIL_URL || 'http://localhost:4710',
  meeting: process.env.GENIE_MEETING_URL || 'http://localhost:4713',
  project: process.env.GENIE_PROJECT_URL || 'http://localhost:4721',
};

/**
 * Get complete dashboard data
 * Like Vellum's single-view dashboard
 */
export async function getDashboard(userId: string, focus: 'today' | 'week' | 'month' = 'today'): Promise<DashboardData> {
  logger.info('get_dashboard', { userId, focus });

  const [
    memorySummary,
    calendarSummary,
    emailSummary,
    briefingSummary,
    relationshipSummary,
    taskSummary,
    quickActions,
    insights,
  ] = await Promise.allSettled([
    getMemorySummary(userId),
    getCalendarSummary(userId),
    getEmailSummary(userId),
    getBriefingSummary(userId),
    getRelationshipSummary(userId),
    getTaskSummary(userId),
    getQuickActions(userId),
    getInsights(userId),
  ]);

  return {
    user_id: userId,
    summary: generateSummary(memorySummary, calendarSummary, emailSummary, briefingSummary, taskSummary),
    memory: memorySummary.status === 'fulfilled' ? memorySummary.value : { recentMemories: [], totalCount: 0, topCategories: [], recentRecall: '' },
    calendar: calendarSummary.status === 'fulfilled' ? calendarSummary.value : { todayEvents: [], tomorrowEvents: [], upcomingCount: 0 },
    email: emailSummary.status === 'fulfilled' ? emailSummary.value : { unreadCount: 0, recentEmails: [] },
    briefings: briefingSummary.status === 'fulfilled' ? briefingSummary.value : { hasBriefing: false, briefingTime: '07:00' },
    relationships: relationshipSummary.status === 'fulfilled' ? relationshipSummary.value : { recentInteractions: [], upcomingEvents: [], topRelationships: [] },
    tasks: taskSummary.status === 'fulfilled' ? taskSummary.value : { pending: [], completed: 0, total: 0 },
    quickActions: quickActions.status === 'fulfilled' ? quickActions.value : [],
    insights: insights.status === 'fulfilled' ? insights.value : [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate greeting based on time of day
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Generate dashboard summary
 */
function generateSummary(
  memory: PromiseSettledResult<MemorySummary>,
  calendar: PromiseSettledResult<CalendarSummary>,
  email: PromiseSettledResult<EmailSummary>,
  briefing: PromiseSettledResult<BriefingSummary>,
  tasks: PromiseSettledResult<TaskSummary>
): DashboardSummary {
  const memValue = memory.status === 'fulfilled' ? memory.value : { totalCount: 0, recentMemories: [] };
  const calValue = calendar.status === 'fulfilled' ? calendar.value : { todayEvents: [], upcomingCount: 0 };
  const emailValue = email.status === 'fulfilled' ? email.value : { unreadCount: 0 };
  const briefValue = briefing.status === 'fulfilled' ? briefing.value : { hasBriefing: false };
  const taskValue = tasks.status === 'fulfilled' ? tasks.value : { pending: [], total: 0 };

  return {
    greeting: getGreeting(),
    totalMemories: memValue.totalCount,
    upcomingEvents: calValue.upcomingCount,
    unreadEmails: emailValue.unreadCount,
    pendingTasks: taskValue.pending.length,
    relationshipsCount: 0,
    streak: Math.floor(Math.random() * 30) + 1, // TODO: Calculate from usage
  };
}

/**
 * Get memory summary from memory service
 */
async function getMemorySummary(userId: string): Promise<MemorySummary> {
  // TODO: Call actual memory service
  // For now, return mock data
  return {
    recentMemories: [
      {
        id: '1',
        type: 'preference',
        content: 'You prefer Italian food for dinner',
        created_at: new Date().toISOString(),
        importance: 8,
      },
    ],
    totalCount: 42,
    topCategories: [
      { name: 'Food', count: 15 },
      { name: 'Work', count: 12 },
      { name: 'Travel', count: 8 },
    ],
    recentRecall: 'You asked about Italian restaurants last week',
  };
}

/**
 * Get calendar summary from calendar service
 */
async function getCalendarSummary(userId: string): Promise<CalendarSummary> {
  return {
    todayEvents: [
      {
        id: '1',
        title: 'Team Standup',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 30 * 60000).toISOString(),
      },
    ],
    tomorrowEvents: [],
    upcomingCount: 5,
  };
}

/**
 * Get email summary from email service
 */
async function getEmailSummary(userId: string): Promise<EmailSummary> {
  return {
    unreadCount: 12,
    recentEmails: [
      {
        id: '1',
        from: 'team@company.com',
        subject: 'Weekly Update',
        snippet: 'Here is the weekly update for...',
        received_at: new Date().toISOString(),
        read: false,
      },
    ],
  };
}

/**
 * Get briefing summary
 */
async function getBriefingSummary(userId: string): Promise<BriefingSummary> {
  return {
    hasBriefing: true,
    briefingTime: '07:00',
    todayBriefing: {
      id: 'briefing_today',
      greeting: 'Good morning!',
      sections: [
        {
          id: 'weather',
          type: 'weather',
          title: 'Weather',
          content: 'Partly cloudy, 24°C in Mumbai',
        },
        {
          id: 'tasks',
          type: 'tasks',
          title: 'Top Tasks',
          content: 'You have 3 tasks today',
          items: [
            { text: 'Review Q2 report', done: false },
            { text: 'Call with client', done: true },
            { text: 'Send proposal', done: false },
          ],
        },
      ],
      summary: 'Good morning! You have 3 tasks today and 2 meetings scheduled.',
    },
  };
}

/**
 * Get relationship summary
 */
async function getRelationshipSummary(userId: string): Promise<RelationshipSummary> {
  return {
    recentInteractions: [
      {
        personId: '1',
        name: 'John Doe',
        type: 'meeting',
        date: new Date().toISOString(),
        summary: 'Discussed project timeline',
      },
    ],
    upcomingEvents: ['Birthday: Jane tomorrow'],
    topRelationships: [
      { name: 'John Doe', lastContact: 'Today' },
      { name: 'Jane Smith', lastContact: 'Yesterday' },
    ],
  };
}

/**
 * Get task summary
 */
async function getTaskSummary(userId: string): Promise<TaskSummary> {
  return {
    pending: [
      {
        id: '1',
        title: 'Review Q2 report',
        due_date: new Date().toISOString(),
        priority: 'high',
        completed: false,
      },
      {
        id: '2',
        title: 'Send proposal',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        priority: 'medium',
        completed: false,
      },
    ],
    completed: 15,
    total: 17,
  };
}

/**
 * Quick actions like Vellum
 */
async function getQuickActions(userId: string): Promise<QuickAction[]> {
  return [
    { id: 'recall', label: 'Recall', icon: '🔍', action: 'recall' },
    { id: 'remember', label: 'Remember', icon: '💭', action: 'remember' },
    { id: 'schedule', label: 'Schedule', icon: '📅', action: 'schedule' },
    { id: 'briefing', label: 'Get Briefing', icon: '📋', action: 'briefing' },
    { id: 'email', label: 'Send Email', icon: '✉️', action: 'email' },
    { id: 'meet', label: 'Schedule Meeting', icon: '👥', action: 'meeting' },
  ];
}

/**
 * AI-generated insights
 */
async function getInsights(userId: string): Promise<Insight[]> {
  return [
    {
      id: '1',
      type: 'pattern',
      title: 'You usually eat out on Fridays',
      description: 'Based on your history, you might want restaurant recommendations',
      actionLabel: 'View restaurants',
    },
    {
      id: '2',
      type: 'reminder',
      title: 'Follow up with John',
      description: 'You met John 3 days ago. Time to catch up?',
      actionLabel: 'Send message',
    },
    {
      id: '3',
      type: 'suggestion',
      title: 'Clear inbox',
      description: 'You have 12 unread emails. Want me to help you go through them?',
      actionLabel: 'Summarize emails',
    },
  ];
}

/**
 * Search across all Genie services
 * Like Vellum's unified search
 */
export async function unifiedSearch(userId: string, query: string): Promise<{
  memories: any[];
  emails: any[];
  calendar: any[];
  contacts: any[];
}> {
  logger.info('unified_search', { userId, query });

  // TODO: Actually call all services
  return {
    memories: [{ type: 'memory', content: `Result for: ${query}` }],
    emails: [{ from: 'someone@email.com', subject: `Result for: ${query}` }],
    calendar: [{ title: `Event for: ${query}` }],
    contacts: [{ name: `Contact: ${query}` }],
  };
}

/**
 * Execute quick action
 */
export async function executeQuickAction(
  userId: string,
  action: string,
  params?: Record<string, string>
): Promise<{ success: boolean; result?: any }> {
  logger.info('execute_quick_action', { userId, action, params });

  switch (action) {
    case 'recall':
      return { success: true, result: { message: 'What would you like me to recall?' } };
    case 'remember':
      return { success: true, result: { message: 'What would you like me to remember?' } };
    case 'briefing':
      return { success: true, result: await getBriefingSummary(userId) };
    case 'schedule':
      return { success: true, result: { message: 'What would you like to schedule?' } };
    default:
      return { success: false, result: { message: 'Unknown action' } };
  }
}
