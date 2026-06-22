/**
 * GENIE Email Service - Business Logic
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
import {
  Email,
  EmailThread,
  EmailFilter,
  CreateEmailSchema,
  UpdateEmailSchema,
  SendEmailSchema,
} from '../types.js';

const logger = createLogger('email-service');

// In-memory storage (replace with database in production)
const emails = new Map<string, Email>();
const threads = new Map<string, EmailThread>();

// Default labels
const DEFAULT_LABELS = ['inbox', 'sent', 'drafts', 'trash', 'spam', 'starred', 'important'];

export async function listEmails(
  userId: string,
  query: {
    page?: number;
    pageSize?: number;
    folder?: string;
    unread_only?: boolean;
    starred_only?: boolean;
    label?: string;
    search?: string;
  }
): Promise<{ emails: Email[]; total: number; unread_count: number }> {
  logger.info('list_emails', { userId, query });

  let userEmails = Array.from(emails.values()).filter(e => e.user_id === userId);

  // Filter by folder
  if (query.folder === 'inbox') {
    userEmails = userEmails.filter(e => e.labels.includes('inbox'));
  } else if (query.folder === 'sent') {
    userEmails = userEmails.filter(e => e.labels.includes('sent'));
  } else if (query.folder === 'starred') {
    userEmails = userEmails.filter(e => e.starred);
  }

  // Filter by unread
  if (query.unread_only) {
    userEmails = userEmails.filter(e => !e.read);
  }

  // Filter by starred
  if (query.starred_only) {
    userEmails = userEmails.filter(e => e.starred);
  }

  // Filter by label
  if (query.label) {
    userEmails = userEmails.filter(e => e.labels.includes(query.label!));
  }

  // Search
  if (query.search) {
    const search = query.search.toLowerCase();
    userEmails = userEmails.filter(e =>
      e.subject.toLowerCase().includes(search) ||
      e.body.toLowerCase().includes(search) ||
      e.from.email.toLowerCase().includes(search)
    );
  }

  // Sort by date
  userEmails.sort((a, b) =>
    new Date(b.received_at || b.created_at).getTime() - new Date(a.received_at || a.created_at).getTime()
  );

  const unreadCount = userEmails.filter(e => !e.read).length;
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const start = (page - 1) * pageSize;
  const paginated = userEmails.slice(start, start + pageSize);

  return { emails: paginated, total: userEmails.length, unread_count: unreadCount };
}

export async function getEmail(emailId: string, userId: string): Promise<Email | null> {
  const email = emails.get(emailId);
  if (!email || email.user_id !== userId) return null;
  return email;
}

export async function createEmail(userId: string, input: {
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  subject: string;
  body: string;
  attachments?: { filename: string; mime_type: string; size: number; url?: string }[];
  priority?: string;
}): Promise<Email> {
  const parseResult = CreateEmailSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(`Validation failed: ${parseResult.error.message}`);
  }

  const threadId = uuidv4();
  const now = new Date().toISOString();

  const email: Email = {
    id: uuidv4(),
    user_id: userId,
    thread_id: threadId,
    subject: input.subject,
    body: input.body,
    snippet: input.body.substring(0, 100),
    from: { name: 'User', email: `${userId}@example.com` },
    to: input.to,
    cc: input.cc,
    labels: ['inbox'],
    attachments: (input.attachments || []).map(a => ({
      id: uuidv4(),
      ...a,
      url: a.url || `https://storage.example.com/${uuidv4()}`,
    })),
    read: true,
    starred: false,
    important: false,
    priority: (input.priority as Email['priority']) || 'normal',
    hasAttachments: (input.attachments?.length || 0) > 0,
    received_at: now,
    sent_at: now,
    created_at: now,
  };

  emails.set(email.id, email);
  logger.info('email_created', { emailId: email.id, userId });

  return email;
}

export async function updateEmail(
  emailId: string,
  userId: string,
  input: {
    read?: boolean;
    starred?: boolean;
    important?: boolean;
    labels?: string[];
  }
): Promise<Email | null> {
  const email = emails.get(emailId);
  if (!email || email.user_id !== userId) return null;

  const parseResult = UpdateEmailSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(`Validation failed: ${parseResult.error.message}`);
  }

  const updated: Email = {
    ...email,
    ...input,
    updated_at: new Date().toISOString(),
  };

  emails.set(emailId, updated);
  logger.info('email_updated', { emailId, userId });

  return updated;
}

export async function deleteEmail(emailId: string, userId: string): Promise<boolean> {
  const email = emails.get(emailId);
  if (!email || email.user_id !== userId) return false;

  // Move to trash
  email.labels = ['trash'];
  email.updated_at = new Date().toISOString();
  emails.set(emailId, email);

  logger.info('email_deleted', { emailId, userId });
  return true;
}

export async function getThreads(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ threads: EmailThread[]; total: number }> {
  // Group emails by thread
  const threadMap = new Map<string, Email[]>();

  Array.from(emails.values())
    .filter(e => e.user_id === userId && !e.labels.includes('trash'))
    .forEach(email => {
      const existing = threadMap.get(email.thread_id) || [];
      existing.push(email);
      threadMap.set(email.thread_id, existing);
    });

  const threads: EmailThread[] = Array.from(threadMap.entries()).map(([id, messages]) => ({
    id,
    user_id: userId,
    subject: messages[0].subject,
    messages: messages.sort((a, b) =>
      new Date(b.received_at || b.created_at).getTime() - new Date(a.received_at || a.created_at).getTime()
    ),
    participants: [...new Set(messages.flatMap(m => [m.from, ...m.to]))],
    last_message_at: messages[0].received_at || messages[0].created_at,
    message_count: messages.length,
    unread_count: messages.filter(m => !m.read).length,
  }));

  threads.sort((a, b) =>
    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );

  const start = (page - 1) * pageSize;
  return { threads: threads.slice(start, start + pageSize), total: threads.length };
}

export async function getLabels(userId: string): Promise<string[]> {
  const userLabels = new Set(DEFAULT_LABELS);

  Array.from(emails.values())
    .filter(e => e.user_id === userId)
    .forEach(email => {
      email.labels.forEach(label => userLabels.add(label));
    });

  return Array.from(userLabels);
}

export async function searchEmails(
  userId: string,
  query: string
): Promise<Email[]> {
  const search = query.toLowerCase();

  return Array.from(emails.values())
    .filter(e =>
      e.user_id === userId &&
      !e.labels.includes('trash') &&
      (
        e.subject.toLowerCase().includes(search) ||
        e.body.toLowerCase().includes(search) ||
        e.from.email.toLowerCase().includes(search) ||
        e.to.some(t => t.email.toLowerCase().includes(search)) ||
        e.snippet.toLowerCase().includes(search)
      )
    )
    .sort((a, b) =>
      new Date(b.received_at || b.created_at).getTime() - new Date(a.received_at || a.created_at).getTime()
    );
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Array.from(emails.values())
    .filter(e => e.user_id === userId && !e.read && e.labels.includes('inbox'))
    .length;
}

export async function markAllAsRead(userId: string): Promise<number> {
  let count = 0;

  emails.forEach((email, id) => {
    if (email.user_id === userId && !email.read && email.labels.includes('inbox')) {
      email.read = true;
      email.updated_at = new Date().toISOString();
      emails.set(id, email);
      count++;
    }
  });

  logger.info('all_emails_marked_read', { userId, count });
  return count;
}
