/**
 * Ticket Service - Business logic for ticket operations
 */

import { v4 as uuidv4 } from 'uuid';
import { Ticket, ITicket, TicketStatus, TicketPriority, TicketCategory } from '../models/Ticket';
import { Comment, IComment, CommentType } from '../models/Comment';
import { Assignment, IAssignment, AssignmentType } from '../models/Assignment';
import logger from 'utils/logger.js';

export interface CreateTicketInput {
  subject: string;
  description: string;
  priority?: TicketPriority;
  category: TicketCategory;
  customerId: string;
  customerEmail: string;
  customerName: string;
  tags?: string[];
  attachments?: Array<{ name: string; url: string; type: string; size: number }>;
  metadata?: Record<string, unknown>;
}

export interface TicketFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  assignedTeam?: string;
  customerId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class TicketService {
  /**
   * Create a new ticket
   */
  async createTicket(input: CreateTicketInput): Promise<ITicket> {
    const now = new Date();

    // Calculate SLA based on priority
    const slaHours = this.getSlaHours(input.priority || TicketPriority.MEDIUM);
    const firstResponseDue = new Date(now.getTime() + slaHours.firstResponse * 60 * 60 * 1000);
    const resolutionDue = new Date(now.getTime() + slaHours.resolution * 60 * 60 * 1000);

    const ticketData: Partial<ITicket> = {
      ticketId: `TKT-${uuidv4().slice(0, 8).toUpperCase()}`,
      subject: input.subject,
      description: input.description,
      status: TicketStatus.OPEN,
      priority: input.priority || TicketPriority.MEDIUM,
      category: input.category,
      customerId: input.customerId,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      tags: input.tags || [],
      attachments: input.attachments || [],
      sla: {
        firstResponseDue,
        resolutionDue,
        breached: false,
      },
      metadata: input.metadata || {},
    };

    const ticket = new Ticket(ticketData);
    await ticket.save();

    logger.info('Ticket created', { ticketId: ticket.ticketId, priority: ticket.priority });
    return ticket;
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: string): Promise<ITicket | null> {
    return Ticket.findOne({ ticketId }).exec();
  }

  /**
   * Get tickets with filters and pagination
   */
  async getTickets(filter: TicketFilter, pagination: PaginationOptions): Promise<{ tickets: ITicket[]; total: number; page: number; totalPages: number }> {
    const query: Record<string, unknown> = {};

    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.category) query.category = filter.category;
    if (filter.assignedTo) query.assignedTo = filter.assignedTo;
    if (filter.assignedTeam) query.assignedTeam = filter.assignedTeam;
    if (filter.customerId) query.customerId = filter.customerId;
    if (filter.tags && filter.tags.length > 0) query.tags = { $in: filter.tags };
    if (filter.dateFrom || filter.dateTo) {
      query.createdAt = {};
      if (filter.dateFrom) (query.createdAt as Record<string, Date>).$gte = filter.dateFrom;
      if (filter.dateTo) (query.createdAt as Record<string, Date>).$lte = filter.dateTo;
    }

    const sort: Record<string, 1 | -1> = {};
    sort[pagination.sortBy || 'createdAt'] = pagination.sortOrder === 'asc' ? 1 : -1;

    const skip = (pagination.page - 1) * pagination.limit;
    const [tickets, total] = await Promise.all([
      Ticket.find(query).sort(sort).skip(skip).limit(pagination.limit).exec(),
      Ticket.countDocuments(query).exec(),
    ]);

    return {
      tickets,
      total,
      page: pagination.page,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Update ticket
   */
  async updateTicket(ticketId: string, updates: Partial<ITicket>): Promise<ITicket | null> {
    const ticket = await Ticket.findOneAndUpdate(
      { ticketId },
      { $set: updates },
      { new: true }
    ).exec();

    if (ticket) {
      logger.info('Ticket updated', { ticketId, updates: Object.keys(updates) });
    }
    return ticket;
  }

  /**
   * Assign ticket to agent or team
   */
  async assignTicket(
    ticketId: string,
    assignedBy: string,
    assignedTo: string,
    type: AssignmentType,
    reason?: string,
    assignedTeam?: string
  ): Promise<IAssignment | null> {
    const ticket = await Ticket.findOne({ ticketId }).exec();
    if (!ticket) return null;

    // Deactivate previous assignments
    await Assignment.updateMany(
      { ticketId, isActive: true },
      { $set: { isActive: false, endedAt: new Date() } }
    );

    const assignment = new Assignment({
      assignmentId: `ASN-${uuidv4().slice(0, 8).toUpperCase()}`,
      ticketId,
      assignedBy,
      assignedTo,
      assignedTeam,
      type,
      reason: reason || '',
      previousAssignee: ticket.assignedTo,
      isActive: true,
    });

    await assignment.save();

    // Update ticket
    ticket.assignedTo = assignedTo;
    if (assignedTeam) ticket.assignedTeam = assignedTeam;
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }
    await ticket.save();

    logger.info('Ticket assigned', { ticketId, assignedTo, assignedTeam });
    return assignment;
  }

  /**
   * Add comment to ticket
   */
  async addComment(
    ticketId: string,
    content: string,
    author: { id: string; name: string; email: string; role: 'customer' | 'agent' | 'admin' | 'system' },
    type: CommentType = CommentType.PUBLIC,
    attachments?: Array<{ name: string; url: string; type: string; size: number }>
  ): Promise<IComment | null> {
    const ticket = await Ticket.findOne({ ticketId }).exec();
    if (!ticket) return null;

    const comment = new Comment({
      commentId: `CMT-${uuidv4().slice(0, 8).toUpperCase()}`,
      ticketId,
      content,
      authorId: author.id,
      authorName: author.name,
      authorEmail: author.email,
      authorRole: author.role,
      type,
      attachments: attachments || [],
    });

    await comment.save();

    // If first response, update SLA
    if (!ticket.sla.firstResponseAt && author.role !== 'system') {
      ticket.sla.firstResponseAt = new Date();
      await ticket.save();
    }

    logger.info('Comment added', { ticketId, commentId: comment.commentId });
    return comment;
  }

  /**
   * Get ticket comments
   */
  async getTicketComments(ticketId: string, includeInternal = false): Promise<IComment[]> {
    const query: Record<string, unknown> = { ticketId };
    if (!includeInternal) {
      query.type = { $ne: CommentType.INTERNAL };
    }
    return Comment.find(query).sort({ createdAt: 1 }).exec();
  }

  /**
   * Get ticket assignments
   */
  async getTicketAssignments(ticketId: string, activeOnly = false): Promise<IAssignment[]> {
    const query: Record<string, unknown> = { ticketId };
    if (activeOnly) query.isActive = true;
    return Assignment.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Resolve ticket
   */
  async resolveTicket(ticketId: string, resolution?: string): Promise<ITicket | null> {
    const ticket = await Ticket.findOne({ ticketId }).exec();
    if (!ticket) return null;

    ticket.status = TicketStatus.RESOLVED;
    ticket.resolvedAt = new Date();
    ticket.sla.resolvedAt = new Date();

    if (resolution) {
      await this.addComment(ticketId, resolution, {
        id: 'system',
        name: 'System',
        email: 'system@adbazaar.com',
        role: 'system',
      }, CommentType.SYSTEM);
    }

    await ticket.save();
    logger.info('Ticket resolved', { ticketId });
    return ticket;
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: string): Promise<ITicket | null> {
    const ticket = await Ticket.findOneAndUpdate(
      { ticketId },
      { $set: { status: TicketStatus.CLOSED } },
      { new: true }
    ).exec();

    if (ticket) {
      logger.info('Ticket closed', { ticketId });
    }
    return ticket;
  }

  /**
   * Get SLA hours based on priority
   */
  private getSlaHours(priority: TicketPriority): { firstResponse: number; resolution: number } {
    const slaMap: Record<TicketPriority, { firstResponse: number; resolution: number }> = {
      [TicketPriority.CRITICAL]: { firstResponse: 1, resolution: 4 },
      [TicketPriority.HIGH]: { firstResponse: 2, resolution: 8 },
      [TicketPriority.MEDIUM]: { firstResponse: 4, resolution: 24 },
      [TicketPriority.LOW]: { firstResponse: 8, resolution: 48 },
    };
    return slaMap[priority];
  }

  /**
   * Get ticket statistics
   */
  async getStatistics(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    breached: number;
  }> {
    const [total, open, inProgress, resolved, closed, breached] = await Promise.all([
      Ticket.countDocuments().exec(),
      Ticket.countDocuments({ status: TicketStatus.OPEN }).exec(),
      Ticket.countDocuments({ status: TicketStatus.IN_PROGRESS }).exec(),
      Ticket.countDocuments({ status: TicketStatus.RESOLVED }).exec(),
      Ticket.countDocuments({ status: TicketStatus.CLOSED }).exec(),
      Ticket.countDocuments({ 'sla.breached': true }).exec(),
    ]);

    return { total, open, inProgress, resolved, closed, breached };
  }
}

export const ticketService = new TicketService();
export default ticketService;