/**
 * Jira Webhook Handler
 * Register webhooks and process incoming webhook events
 */

import crypto from 'crypto';
import type {
  JiraWebhookEvent,
  JiraWebhookPayload,
  JiraWebhookRegistration,
  JiraWebhookList,
} from '../types/index.js';
import { jiraGet, jiraPost, jiraDelete, validateConfig } from '../api/client.js';
import { getJiraUrl } from '../auth/auth.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('jira-webhooks');

// ============================================================================
// Event Types (as strings for registration)
// ============================================================================

export const WEBHOOK_EVENTS: JiraWebhookEvent[] = [
  'jira:issue_created',
  'jira:issue_updated',
  'jira:issue_deleted',
  'jira:worklog_updated',
  'comment_created',
  'comment_updated',
  'comment_deleted',
  'project_created',
  'project_updated',
  'project_deleted',
  'sprint_started',
  'sprint_closed',
  'sprint_created',
  'board_created',
  'board_updated',
  'board_deleted',
  'version_created',
  'version_updated',
  'version_deleted',
  'issuelink_created',
  'issuelink_deleted',
  'user_created',
  'user_updated',
  'group_added_to_role',
  'jira:attachment_updated',
];

// ============================================================================
// Webhook Registration
// ============================================================================

/**
 * List registered webhooks
 * GET /rest/api/3/webhook
 */
export async function listWebhooks(): Promise<JiraWebhookList> {
  validateConfig();
  logger.info('Listing webhooks');

  const webhooks = await jiraGet<JiraWebhookList>('/rest/api/3/webhook');
  return webhooks;
}

/**
 * Register a webhook
 * POST /rest/api/3/webhook
 */
export async function registerWebhook(
  url: string,
  events: JiraWebhookEvent[],
  name?: string,
  filters?: {
    issue_related_events?: string;
  },
  excludeBody?: boolean
): Promise<{ webhookId: string; url: string; events: JiraWebhookEvent[] }> {
  validateConfig();
  logger.info('Registering webhook', { url, events, name });

  const registration: JiraWebhookRegistration = {
    url,
    name: name || `Jira Connector - ${url}`,
    events,
    filters,
    excludeBody,
  };

  const response = await jiraPost<{ webhookRegistrationResult: { webhookId: string; url: string; created: boolean }[] }>(
    '/rest/api/3/webhook',
    { webhooks: [registration] }
  );

  const result = response.webhookRegistrationResult[0];
  if (!result.created) {
    throw new Error(`Webhook registration failed for ${url}`);
  }

  logger.info('Webhook registered', { webhookId: result.webhookId, url });
  return {
    webhookId: result.webhookId,
    url: result.url,
    events,
  };
}

/**
 * Delete a webhook
 * DELETE /rest/api/3/webhook/{webhookId}
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  validateConfig();
  logger.info('Deleting webhook', { webhookId });

  await jiraDelete<void>(`/rest/api/3/webhook/${encodeURIComponent(webhookId)}`);
  logger.info('Webhook deleted', { webhookId });
}

/**
 * Find webhook by URL
 */
export async function findWebhookByUrl(url: string): Promise<string | null> {
  const webhooks = await listWebhooks();

  for (const webhook of webhooks.webhooks) {
    if (webhook.url === url) {
      return webhook.id;
    }
  }

  return null;
}

/**
 * Ensure webhook is registered (idempotent)
 */
export async function ensureWebhook(
  url: string,
  events: JiraWebhookEvent[],
  name?: string
): Promise<string> {
  const existingId = await findWebhookByUrl(url);

  if (existingId) {
    logger.info('Webhook already exists', { webhookId: existingId });
    return existingId;
  }

  const registered = await registerWebhook(url, events, name);
  return registered.webhookId;
}

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify webhook signature using HMAC-SHA256
 * Jira signs webhook payloads with the webhook secret using HMAC-SHA256
 */
export function verifySignature(
  body: string | Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  // Remove "sha256=" prefix if present
  const providedSig = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  // Calculate expected signature
  const bodyStr = typeof body === 'string' ? body : body.toString('utf8');
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(bodyStr, 'utf8')
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedSig, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
}

/**
 * Generate a webhook secret
 */
export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// ============================================================================
// Webhook Event Handling
// ============================================================================

export type WebhookEventHandler = (payload: JiraWebhookPayload) => Promise<void>;

interface HandlerEntry {
  handler: WebhookEventHandler;
  events: JiraWebhookEvent[];
}

const handlers: HandlerEntry[] = [];

/**
 * Register a webhook event handler
 */
export function onWebhookEvent(
  events: JiraWebhookEvent[],
  handler: WebhookEventHandler
): void {
  handlers.push({ handler, events });
  logger.info('Webhook handler registered', { events });
}

/**
 * Process an incoming webhook
 */
export async function handleWebhook(
  body: string | Buffer,
  headers: Record<string, string | undefined>,
  secret?: string
): Promise<{
  success: boolean;
  event?: JiraWebhookEvent;
  error?: string;
}> {
  try {
    // Parse body
    let payload: JiraWebhookPayload;
    const bodyStr = typeof body === 'string' ? body : body.toString('utf8');

    try {
      payload = JSON.parse(bodyStr);
    } catch {
      return { success: false, error: 'Invalid JSON body' };
    }

    // Verify signature if secret is provided
    if (secret) {
      const signature = headers['x-hub-signature'] || headers['x-hub-signature-256'] || '';
      if (!verifySignature(bodyStr, signature, secret)) {
        logger.warn('Webhook signature verification failed');
        return { success: false, error: 'Invalid signature' };
      }
    }

    const event = payload.webhookEvent;
    if (!event) {
      return { success: false, error: 'Missing webhookEvent field' };
    }

    logger.info('Processing webhook', { event, timestamp: payload.timestamp });

    // Call registered handlers
    let handled = false;
    for (const entry of handlers) {
      if (entry.events.includes(event)) {
        try {
          await entry.handler(payload);
          handled = true;
        } catch (error: any) {
          logger.error('Webhook handler error', { event, error: error.message });
        }
      }
    }

    if (!handled) {
      logger.debug('No handler registered for event', { event });
    }

    return { success: true, event };
  } catch (error: any) {
    logger.error('Webhook processing error', { error: error.message });
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Common Webhook Handlers
// ============================================================================

/**
 * Handler for issue events
 */
export async function handleIssueEvent(
  event: JiraWebhookEvent,
  payload: JiraWebhookPayload,
  callback: (data: {
    event: JiraWebhookEvent;
    issueKey: string;
    issueSummary: string;
    projectKey: string;
    user?: string;
    timestamp: string;
  }) => Promise<void>
): Promise<void> {
  if (!payload.issue || !payload.issue.key) {
    logger.warn('Issue event received without issue data');
    return;
  }

  await callback({
    event,
    issueKey: payload.issue.key,
    issueSummary: payload.issue.fields?.summary || '',
    projectKey: payload.issue.fields?.project?.key || '',
    user: payload.user?.displayName,
    timestamp: new Date(payload.timestamp).toISOString(),
  });
}

/**
 * Handler for sprint events
 */
export async function handleSprintEvent(
  event: JiraWebhookEvent,
  payload: JiraWebhookPayload,
  callback: (data: {
    event: JiraWebhookEvent;
    sprintId: number;
    sprintName: string;
    boardId?: number;
    user?: string;
    timestamp: string;
  }) => Promise<void>
): Promise<void> {
  if (!payload.sprint) {
    logger.warn('Sprint event received without sprint data');
    return;
  }

  await callback({
    event,
    sprintId: payload.sprint.id,
    sprintName: payload.sprint.name,
    boardId: payload.sprint.boardId,
    user: payload.user?.displayName,
    timestamp: new Date(payload.timestamp).toISOString(),
  });
}

/**
 * Handler for comment events
 */
export async function handleCommentEvent(
  event: JiraWebhookEvent,
  payload: JiraWebhookPayload,
  callback: (data: {
    event: JiraWebhookEvent;
    issueKey: string;
    commentId: string;
    commentBody?: string;
    author?: string;
    timestamp: string;
  }) => Promise<void>
): Promise<void> {
  if (!payload.comment || !payload.issue) {
    logger.warn('Comment event received without comment or issue data');
    return;
  }

  await callback({
    event,
    issueKey: payload.issue.key,
    commentId: payload.comment.id,
    commentBody: typeof payload.comment.body === 'string'
      ? payload.comment.body
      : JSON.stringify(payload.comment.body),
    author: payload.comment.author?.displayName,
    timestamp: new Date(payload.timestamp).toISOString(),
  });
}

// ============================================================================
// Observer Integration
// ============================================================================

interface ObserverEvent {
  id: string;
  source: string;
  type: string;
  userId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

const observerEvents: Map<string, ObserverEvent[]> = new Map();

/**
 * Record an observer event from webhook
 */
export function recordObserverEvent(
  userId: string,
  event: JiraWebhookPayload
): void {
  const observerEvent: ObserverEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source: 'jira',
    type: event.webhookEvent,
    userId,
    timestamp: new Date().toISOString(),
    data: {
      issue: event.issue ? {
        key: event.issue.key,
        summary: event.issue.fields?.summary,
        status: event.issue.fields?.status?.name,
        assignee: event.issue.fields?.assignee?.displayName,
        reporter: event.issue.fields?.reporter?.displayName,
      } : undefined,
      project: event.project ? {
        key: event.project.key,
        name: event.project.name,
      } : undefined,
      sprint: event.sprint ? {
        id: event.sprint.id,
        name: event.sprint.name,
        state: event.sprint.state,
      } : undefined,
      board: event.board ? {
        id: event.board.id,
        name: event.board.name,
      } : undefined,
    },
  };

  const existing = observerEvents.get(userId) || [];
  existing.push(observerEvent);
  observerEvents.set(userId, existing);

  logger.debug('Observer event recorded', { userId, type: event.webhookEvent });
}

/**
 * Get observer events for a user
 */
export function getObserverEvents(
  userId: string,
  options?: { days?: number; types?: JiraWebhookEvent[] }
): ObserverEvent[] {
  const events = observerEvents.get(userId) || [];
  const daysAgo = options?.days ?? 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);

  return events.filter((event) => {
    // Filter by date
    if (new Date(event.timestamp) < cutoff) {
      return false;
    }

    // Filter by types
    if (options?.types && options.types.length > 0) {
      if (!options.types.includes(event.type as JiraWebhookEvent)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Clear observer events for a user
 */
export function clearObserverEvents(userId: string): void {
  observerEvents.delete(userId);
  logger.debug('Observer events cleared', { userId });
}

// ============================================================================
// Setup Default Handlers
// ============================================================================

/**
 * Setup default webhook handlers for common events
 */
export function setupDefaultHandlers(observerUserId?: string): void {
  // Issue created/updated/deleted events
  onWebhookEvent(['jira:issue_created', 'jira:issue_updated', 'jira:issue_deleted'], async (payload) => {
    logger.info('Issue event received', {
      event: payload.webhookEvent,
      issueKey: payload.issue?.key,
    });

    if (observerUserId) {
      recordObserverEvent(observerUserId, payload);
    }
  });

  // Sprint events
  onWebhookEvent(['sprint_started', 'sprint_closed', 'sprint_created'], async (payload) => {
    logger.info('Sprint event received', {
      event: payload.webhookEvent,
      sprintId: payload.sprint?.id,
      sprintName: payload.sprint?.name,
    });

    if (observerUserId) {
      recordObserverEvent(observerUserId, payload);
    }
  });

  // Comment events
  onWebhookEvent(['comment_created', 'comment_updated', 'comment_deleted'], async (payload) => {
    logger.info('Comment event received', {
      event: payload.webhookEvent,
      issueKey: payload.issue?.key,
      commentId: payload.comment?.id,
    });

    if (observerUserId) {
      recordObserverEvent(observerUserId, payload);
    }
  });

  // Worklog events
  onWebhookEvent(['jira:worklog_updated'], async (payload) => {
    logger.info('Worklog event received', {
      event: payload.webhookEvent,
      issueKey: payload.issue?.key,
      worklogId: payload.worklog?.id,
    });

    if (observerUserId) {
      recordObserverEvent(observerUserId, payload);
    }
  });

  logger.info('Default webhook handlers setup complete');
}