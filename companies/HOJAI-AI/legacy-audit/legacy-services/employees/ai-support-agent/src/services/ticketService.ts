/**
 * HOJAI AI Support Agent - Ticket Manager Service
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Manage support tickets with CRUD operations, SLA tracking, and resolution workflow
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
import type {
  SupportTicket,
  CreateTicketInput,
  TicketPriority,
  TicketStatus,
  TicketCategory,
  TicketMessage,
  TicketQueryInputType,
  CustomerTier,
} from '../types.js';

const logger = createLogger('ticket-service');

// In-memory storage (replace with actual database in production)
const tickets = new Map<string, SupportTicket>();
const ticketCounter = new Map<string, number>();

/**
 * SLA configuration by priority
 */
const SLA_CONFIG: Record<TicketPriority, { firstResponseHours: number; resolutionHours: number }> = {
  urgent: { firstResponseHours: 1, resolutionHours: 4 },
  high: { firstResponseHours: 4, resolutionHours: 24 },
  medium: { firstResponseHours: 8, resolutionHours: 48 },
  low: { firstResponseHours: 24, resolutionHours: 72 },
};

/**
 * Category auto-tagging rules
 */
const CATEGORY_TAGS: Record<TicketCategory, string[]> = {
  billing: ['payment', 'invoice', 'charge'],
  technical: ['bug', 'error', 'issue'],
  account: ['login', 'password', 'profile'],
  product: ['feature', 'quality', 'spec'],
  shipping: ['delivery', 'tracking', 'delay'],
  returns: ['return', 'exchange'],
  refund: ['refund', 'money'],
  warranty: ['warranty', 'repair', 'replacement'],
  general: ['general', 'inquiry'],
};

/**
 * Generate ticket number
 */
function generateTicketNumber(tenantId: string): string {
  const count = (ticketCounter.get(tenantId) || 0) + 1;
  ticketCounter.set(tenantId, count);
  const prefix = 'TKT';
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  return `${prefix}-${tenantId.slice(0, 4).toUpperCase()}-${year}${month}-${count.toString().padStart(6, '0')}`;
}

/**
 * Calculate SLA deadlines
 */
function calculateSLA(priority: TicketPriority): { firstResponseDue: string; resolutionDue: string } {
  const config = SLA_CONFIG[priority];
  const now = new Date();

  const firstResponseDue = new Date(now.getTime() + config.firstResponseHours * 60 * 60 * 1000);
  const resolutionDue = new Date(now.getTime() + config.resolutionHours * 60 * 60 * 1000);

  return {
    firstResponseDue: firstResponseDue.toISOString(),
    resolutionDue: resolutionDue.toISOString(),
  };
}

/**
 * Determine customer tier from metadata
 */
function determineCustomerTier(metadata?: Record<string, unknown>): CustomerTier {
  if (metadata?.tier) {
    const tier = metadata.tier as string;
    if (tier === 'enterprise') return 'enterprise';
    if (tier === 'premium') return 'premium';
  }
  return 'standard';
}

/**
 * Auto-tag based on category
 */
function getAutoTags(category: TicketCategory, subject: string, description: string): string[] {
  const tags: string[] = [];
  const categoryTags = CATEGORY_TAGS[category] || [];

  // Add category-based tags
  tags.push(...categoryTags);

  // Add keyword-based tags from subject and description
  const combinedText = `${subject} ${description}`.toLowerCase();

  const keywordMap: Record<string, string[]> = {
    urgent: ['urgent', 'asap', 'immediately', 'emergency'],
    billing: ['overcharge', 'double charge', 'billing error'],
    technical: ['crash', 'not working', 'broken', 'failed'],
    refund: ['want refund', 'money back', 'cancel order'],
  };

  for (const [tag, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(keyword => combinedText.includes(keyword))) {
      tags.push(tag);
    }
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Create a new support ticket
 */
export async function createTicket(
  input: CreateTicketInput,
  tenantId: string
): Promise<SupportTicket> {
  logger.info('create_ticket', { tenantId, customerId: input.customerId, category: input.category });

  const id = uuidv4();
  const ticketNumber = generateTicketNumber(tenantId);
  const priority = input.priority || 'medium';
  const customerTier = determineCustomerTier(input.metadata);
  const sla = calculateSLA(priority);
  const autoTags = getAutoTags(input.category, input.subject, input.description);
  const tags = [...new Set([...(input.tags || []), ...autoTags])];

  const ticket: SupportTicket = {
    id,
    ticketNumber,
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerTier,
    subject: input.subject,
    description: input.description,
    category: input.category,
    priority,
    status: 'open',
    tags,
    messages: [
      {
        id: uuidv4(),
        ticketId: id,
        authorId: input.customerId,
        authorType: 'customer',
        content: input.description,
        attachments: input.attachments,
        createdAt: new Date().toISOString(),
      },
    ],
    sla: {
      firstResponseDue: sla.firstResponseDue,
      resolutionDue: sla.resolutionDue,
      breached: false,
    },
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tickets.set(id, ticket);

  logger.info('ticket_created', {
    ticketId: id,
    ticketNumber,
    priority,
    customerTier,
  });

  return ticket;
}

/**
 * Get ticket by ID
 */
export async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
  return tickets.get(ticketId) || null;
}

/**
 * Get ticket by ticket number
 */
export async function getTicketByNumber(ticketNumber: string): Promise<SupportTicket | null> {
  for (const ticket of tickets.values()) {
    if (ticket.ticketNumber === ticketNumber) {
      return ticket;
    }
  }
  return null;
}

/**
 * List tickets with filtering and pagination
 */
export async function listTickets(
  filters: TicketQueryInputType,
  tenantId: string
): Promise<{ tickets: SupportTicket[]; total: number }> {
  logger.info('list_tickets', { tenantId, filters });

  let filteredTickets = Array.from(tickets.values());

  // Apply filters
  if (filters.status) {
    filteredTickets = filteredTickets.filter(t => t.status === filters.status);
  }
  if (filters.priority) {
    filteredTickets = filteredTickets.filter(t => t.priority === filters.priority);
  }
  if (filters.category) {
    filteredTickets = filteredTickets.filter(t => t.category === filters.category);
  }
  if (filters.customerId) {
    filteredTickets = filteredTickets.filter(t => t.customerId === filters.customerId);
  }
  if (filters.assignedTo) {
    filteredTickets = filteredTickets.filter(
      t => t.assignedTo?.agentId === filters.assignedTo
    );
  }

  // Sort by createdAt descending
  filteredTickets.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = filteredTickets.length;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const start = (page - 1) * pageSize;
  const paginatedTickets = filteredTickets.slice(start, start + pageSize);

  return { tickets: paginatedTickets, total };
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  updatedBy: string
): Promise<SupportTicket | null> {
  const ticket = tickets.get(ticketId);
  if (!ticket) {
    logger.warn('ticket_not_found', { ticketId });
    return null;
  }

  const previousStatus = ticket.status;
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();

  // Add system message for status change
  ticket.messages.push({
    id: uuidv4(),
    ticketId,
    authorId: 'system',
    authorType: 'system',
    content: `Ticket status changed from ${previousStatus} to ${status} by ${updatedBy}`,
    createdAt: new Date().toISOString(),
  });

  // Update timestamps based on status
  if (status === 'resolved') {
    ticket.resolvedAt = new Date().toISOString();
  } else if (status === 'closed') {
    ticket.closedAt = new Date().toISOString();
  }

  logger.info('ticket_status_updated', {
    ticketId,
    previousStatus,
    newStatus: status,
  });

  return ticket;
}

/**
 * Add message to ticket
 */
export async function addMessage(
  ticketId: string,
  authorId: string,
  authorType: 'customer' | 'agent',
  content: string,
  attachments?: TicketMessage['attachments']
): Promise<TicketMessage | null> {
  const ticket = tickets.get(ticketId);
  if (!ticket) {
    logger.warn('ticket_not_found', { ticketId });
    return null;
  }

  const message: TicketMessage = {
    id: uuidv4(),
    ticketId,
    authorId,
    authorType,
    content,
    attachments,
    createdAt: new Date().toISOString(),
  };

  ticket.messages.push(message);
  ticket.updatedAt = new Date().toISOString();

  // Auto-update status to in_progress if coming from customer while ticket was open
  if (authorType === 'agent' && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  logger.info('message_added', { ticketId, messageId: message.id, authorType });

  return message;
}

/**
 * Resolve ticket
 */
export async function resolveTicket(
  ticketId: string,
  resolution: {
    summary: string;
    resolvedBy: string;
    rating?: number;
    feedback?: string;
  }
): Promise<SupportTicket | null> {
  const ticket = tickets.get(ticketId);
  if (!ticket) {
    logger.warn('ticket_not_found', { ticketId });
    return null;
  }

  const now = new Date().toISOString();

  // Update resolution
  ticket.resolution = {
    summary: resolution.summary,
    resolvedBy: resolution.resolvedBy,
    resolvedAt: now,
    rating: resolution.rating,
    feedback: resolution.feedback,
  };

  // Update status
  ticket.status = 'resolved';
  ticket.resolvedAt = now;
  ticket.updatedAt = now;

  // Check SLA breach
  if (ticket.sla && ticket.sla.resolutionDue) {
    const resolutionDue = new Date(ticket.sla.resolutionDue).getTime();
    const resolvedAt = new Date(now).getTime();
    if (resolvedAt > resolutionDue) {
      ticket.sla.breached = true;
      ticket.sla.breachedAt = now;
      logger.warn('sla_breached', {
        ticketId,
        resolutionDue: ticket.sla.resolutionDue,
        resolvedAt: now,
      });
    }
  }

  // Add system message
  ticket.messages.push({
    id: uuidv4(),
    ticketId,
    authorId: resolution.resolvedBy,
    authorType: 'system',
    content: `Ticket resolved by ${resolution.resolvedBy}: ${resolution.summary}`,
    createdAt: now,
  });

  logger.info('ticket_resolved', {
    ticketId,
    ticketNumber: ticket.ticketNumber,
    resolvedBy: resolution.resolvedBy,
  });

  return ticket;
}

/**
 * Assign ticket to agent
 */
export async function assignTicket(
  ticketId: string,
  agentId: string,
  agentName: string,
  team?: string
): Promise<SupportTicket | null> {
  const ticket = tickets.get(ticketId);
  if (!ticket) {
    logger.warn('ticket_not_found', { ticketId });
    return null;
  }

  ticket.assignedTo = {
    agentId,
    agentName,
    team,
    assignedAt: new Date().toISOString(),
  };
  ticket.updatedAt = new Date().toISOString();

  // Add system message
  ticket.messages.push({
    id: uuidv4(),
    ticketId,
    authorId: 'system',
    authorType: 'system',
    content: `Ticket assigned to ${agentName}${team ? ` (${team})` : ''}`,
    createdAt: new Date().toISOString(),
  });

  logger.info('ticket_assigned', { ticketId, agentId, agentName, team });

  return ticket;
}

/**
 * Update ticket priority
 */
export async function updateTicketPriority(
  ticketId: string,
  priority: TicketPriority,
  updatedBy: string
): Promise<SupportTicket | null> {
  const ticket = tickets.get(ticketId);
  if (!ticket) {
    logger.warn('ticket_not_found', { ticketId });
    return null;
  }

  const previousPriority = ticket.priority;
  ticket.priority = priority;
  ticket.updatedAt = new Date().toISOString();

  // Recalculate SLA
  const sla = calculateSLA(priority);
  if (ticket.sla) {
    ticket.sla.firstResponseDue = sla.firstResponseDue;
    ticket.sla.resolutionDue = sla.resolutionDue;
  }

  // Add system message
  ticket.messages.push({
    id: uuidv4(),
    ticketId,
    authorId: updatedBy,
    authorType: 'system',
    content: `Ticket priority changed from ${previousPriority} to ${priority}`,
    createdAt: new Date().toISOString(),
  });

  logger.info('ticket_priority_updated', {
    ticketId,
    previousPriority,
    newPriority: priority,
  });

  return ticket;
}

/**
 * Get tickets by customer ID
 */
export async function getTicketsByCustomerId(customerId: string): Promise<SupportTicket[]> {
  const customerTickets: SupportTicket[] = [];

  for (const ticket of tickets.values()) {
    if (ticket.customerId === customerId) {
      customerTickets.push(ticket);
    }
  }

  return customerTickets.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get ticket statistics
 */
export async function getTicketStats(_tenantId: string): Promise<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
  avgResolutionTime: number;
  slaBreachRate: number;
}> {
  let total = 0;
  const open = 0;
  const inProgress = 0;
  const resolved = 0;
  const closed = 0;
  const byPriority: Record<TicketPriority, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
  const byCategory: Record<TicketCategory, number> = {
    billing: 0, technical: 0, account: 0, product: 0,
    shipping: 0, returns: 0, refund: 0, warranty: 0, general: 0,
  };

  let totalResolutionTime = 0;
  let resolvedCount = 0;
  let slaBreached = 0;

  for (const ticket of tickets.values()) {
    total++;
    byPriority[ticket.priority]++;
    byCategory[ticket.category]++;

    switch (ticket.status) {
      case 'open': (open as unknown as number)++; break;
      case 'in_progress': (inProgress as unknown as number)++; break;
      case 'resolved': (resolved as unknown as number)++; break;
      case 'closed': (closed as unknown as number)++; break;
    }

    if (ticket.resolvedAt) {
      const resolutionTime =
        new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime();
      totalResolutionTime += resolutionTime;
      resolvedCount++;
    }

    if (ticket.sla?.breached) {
      slaBreached++;
    }
  }

  return {
    total,
    open: open as unknown as number,
    inProgress: inProgress as unknown as number,
    resolved: resolved as unknown as number,
    closed: closed as unknown as number,
    byPriority,
    byCategory,
    avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
    slaBreachRate: total > 0 ? slaBreached / total : 0,
  };
}
