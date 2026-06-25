/**
 * Customer Care Agent — Support tickets, resolution, sentiment analysis.
 *
 * ADR-??? Phase 3 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';

export class CustomerCareAgent {
  constructor(tenantId) {
    this.agentId = 'customer-care';
    this.tenantId = tenantId;
    this.role = 'Customer Care';
    this.name = 'Nexha Customer Care Agent';
    this.capabilities = [
      'ticket_creation',
      'ticket_routing',
      'sentiment_analysis',
      'resolution_tracking',
      'sla_monitoring',
      'escalation',
      'feedback_collection',
    ];
    this.tickets = [];
    this.activityLog = [];
  }

  async act(context) {
    const { action } = context;
    switch (action) {
      case 'create_ticket': return this.createTicket(context);
      case 'list_tickets': return this.listTickets(context);
      case 'update_ticket': return this.updateTicket(context);
      case 'analyze_sentiment': return this.analyzeSentiment(context);
      case 'escalate': return this.escalate(context);
      case 'get_sla_status': return this.getSLAStatus(context);
      default: return { error: `Unknown action: ${action}` };
    }
  }

  async createTicket(context) {
    const { customerRef, subject, description, priority, category } = context;
    if (!customerRef || !subject) return { error: 'customerRef and subject required' };

    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const slaHours = { critical: 1, high: 4, medium: 24, low: 72 };
    const priorityVal = priority || 'medium';

    const ticket = {
      ticketId,
      tenantId: this.tenantId,
      customerRef,
      subject,
      description: description || '',
      priority: priorityVal,
      status: 'open',
      category: category || 'general',
      sentiment: await this.analyzeTextSentiment(description || subject),
      slaDeadline: new Date(Date.now() + (slaHours[priorityVal] || 24) * 3600000).toISOString(),
      slaBreached: false,
      assignedTo: null,
      resolution: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      firstResponseAt: null,
      messages: [{ from: 'customer', text: description, at: new Date().toISOString() }],
    };

    this.tickets.push(ticket);
    this.log('create_ticket', { ticketId, priority: priorityVal });
    return { ticket };
  }

  async listTickets(context = {}) {
    const { status, priority, customerRef, category } = context;
    let list = [...this.tickets];
    if (status) list = list.filter(t => t.status === status);
    if (priority) list = list.filter(t => t.priority === priority);
    if (customerRef) list = list.filter(t => t.customerRef === customerRef);
    if (category) list = list.filter(t => t.category === category);

    // Check SLA
    const now = Date.now();
    for (const t of list) {
      if (t.status === 'open' && new Date(t.slaDeadline) < now) {
        t.slaBreached = true;
      }
    }

    return { tickets: list, total: list.length, open: list.filter(t => t.status === 'open').length };
  }

  async updateTicket(context) {
    const { ticketId, status, assignedTo, resolution, message } = context;
    if (!ticketId) return { error: 'ticketId required' };

    const ticket = this.tickets.find(t => t.ticketId === ticketId);
    if (!ticket) return { error: 'Ticket not found' };

    if (status) {
      ticket.status = status;
      if (status === 'resolved') {
        ticket.resolvedAt = new Date().toISOString();
      }
    }
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
    if (resolution) ticket.resolution = resolution;
    if (message) {
      ticket.messages.push({ from: 'agent', text: message, at: new Date().toISOString() });
      if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date().toISOString();
    }

    ticket.updatedAt = new Date().toISOString();
    this.log('update_ticket', { ticketId, status, assignedTo });
    return { ticket };
  }

  async analyzeSentiment(context = {}) {
    const { ticketId } = context;
    if (ticketId) {
      const ticket = this.tickets.find(t => t.ticketId === ticketId);
      if (!ticket) return { error: 'Ticket not found' };
      return { ticketId, sentiment: ticket.sentiment };
    }

    // Aggregate sentiment
    const sentiments = this.tickets.map(t => t.sentiment);
    const positive = sentiments.filter(s => s === 'positive').length;
    const neutral = sentiments.filter(s => s === 'neutral').length;
    const negative = sentiments.filter(s => s === 'negative').length;

    return {
      total: sentiments.length,
      positive, neutral, negative,
      score: sentiments.length > 0 ? (positive / sentiments.length * 100).toFixed(1) + '%' : 'N/A',
    };
  }

  analyzeTextSentiment(text) {
    if (!text) return 'neutral';
    const lower = text.toLowerCase();
    const positive = ['great', 'excellent', 'love', 'amazing', 'wonderful', 'fantastic', 'perfect', 'thank'];
    const negative = ['terrible', 'awful', 'hate', 'worst', 'angry', 'frustrated', 'disappointed', 'urgent', 'broken', 'failed'];

    let score = 0;
    for (const w of positive) if (lower.includes(w)) score++;
    for (const w of negative) if (lower.includes(w)) score--;
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  async escalate(context) {
    const { ticketId, reason, to } = context;
    if (!ticketId) return { error: 'ticketId required' };

    const ticket = this.tickets.find(t => t.ticketId === ticketId);
    if (!ticket) return { error: 'Ticket not found' };

    ticket.status = 'escalated';
    ticket.priority = 'critical';
    ticket.messages.push({
      from: 'system',
      text: `Escalated to ${to || 'supervisor'} — Reason: ${reason || 'SLA breach'}`,
      at: new Date().toISOString(),
    });
    ticket.updatedAt = new Date().toISOString();

    this.log('escalate', { ticketId, reason, to });
    return { ticket, message: 'Escalation successful' };
  }

  async getSLAStatus(context = {}) {
    const now = Date.now();
    const open = this.tickets.filter(t => t.status === 'open');

    const onTrack = open.filter(t => new Date(t.slaDeadline) > now);
    const breached = open.filter(t => new Date(t.slaDeadline) <= now);

    return {
      open: open.length,
      onTrack: onTrack.length,
      breached: breached.length,
      complianceRate: open.length > 0 ? (onTrack.length / open.length * 100).toFixed(1) + '%' : '100%',
      breachRate: open.length > 0 ? (breached.length / open.length * 100).toFixed(1) + '%' : '0%',
    };
  }

  log(action, data) {
    this.activityLog.unshift({ id: uuidv4(), timestamp: new Date().toISOString(), action, data });
    if (this.activityLog.length > 100) this.activityLog.pop();
  }

  getHistory(limit = 20) { return this.activityLog.slice(0, limit); }

  getProfile() {
    return {
      agentId: this.agentId,
      role: this.role,
      name: this.name,
      capabilities: this.capabilities,
      ticketsCount: this.tickets.length,
      openTickets: this.tickets.filter(t => t.status === 'open').length,
    };
  }
}
