/**
 * HOJAI AI Support Agent - Customer History Service
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Customer profile, interaction history, and support analytics
 */

import { createLogger } from '../utils/logger.js';
import type {
  CustomerProfile,
  CustomerHistory,
  CustomerTicketSummary,
  CustomerOrderSummary,
  CustomerInteraction,
  SupportTicket,
} from '../types.js';
import * as ticketService from './ticketService.js';
import * as refundService from './refundService.js';

const logger = createLogger('customer-history-service');

// In-memory customer storage
const customers = new Map<string, CustomerProfile>();
const interactions = new Map<string, CustomerInteraction[]>();

/**
 * Initialize with demo customers
 */
function initializeDemoCustomers(): void {
  const demoCustomers: CustomerProfile[] = [
    {
      id: 'demo-customer-001',
      name: 'Demo User',
      email: 'demo@example.com',
      phone: '+91-9876543210',
      tier: 'standard',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date().toISOString(),
      preferences: {
        language: 'en',
        timezone: 'Asia/Kolkata',
        emailNotifications: true,
        smsNotifications: true,
      },
    },
    {
      id: 'premium-customer-001',
      name: 'Premium User',
      email: 'premium@example.com',
      phone: '+91-9876543211',
      tier: 'premium',
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      preferences: {
        language: 'en',
        timezone: 'Asia/Kolkata',
        emailNotifications: true,
        smsNotifications: false,
      },
    },
    {
      id: 'enterprise-customer-001',
      name: 'Enterprise Corp',
      email: 'enterprise@example.com',
      phone: '+91-9876543212',
      tier: 'enterprise',
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      preferences: {
        language: 'en',
        timezone: 'Asia/Kolkata',
        emailNotifications: true,
        smsNotifications: true,
      },
    },
  ];

  for (const customer of demoCustomers) {
    customers.set(customer.id, customer);
  }

  logger.info('demo_customers_initialized', { count: demoCustomers.length });
}

// Initialize on module load
initializeDemoCustomers();

/**
 * Get customer profile
 */
export async function getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
  // Check if customer exists
  let profile = customers.get(customerId);

  // Create demo profile if not exists
  if (!profile) {
    profile = {
      id: customerId,
      name: `Customer ${customerId.slice(0, 8)}`,
      email: `${customerId}@example.com`,
      tier: 'standard',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      preferences: {
        language: 'en',
        timezone: 'Asia/Kolkata',
        emailNotifications: true,
        smsNotifications: true,
      },
    };
    customers.set(customerId, profile);
  }

  return profile;
}

/**
 * Update customer profile
 */
export async function updateCustomerProfile(
  customerId: string,
  updates: Partial<Pick<CustomerProfile, 'name' | 'phone' | 'tier' | 'preferences'>>
): Promise<CustomerProfile | null> {
  const profile = customers.get(customerId);
  if (!profile) {
    logger.warn('customer_not_found', { customerId });
    return null;
  }

  if (updates.name) profile.name = updates.name;
  if (updates.phone) profile.phone = updates.phone;
  if (updates.tier) profile.tier = updates.tier;
  if (updates.preferences) {
    profile.preferences = { ...profile.preferences, ...updates.preferences };
  }

  logger.info('customer_profile_updated', { customerId });

  return profile;
}

/**
 * Get customer ticket summary
 */
async function getTicketSummary(customerId: string): Promise<CustomerTicketSummary> {
  const tickets = await ticketService.getTicketsByCustomerId(customerId);

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => ['open', 'pending', 'in_progress'].includes(t.status)).length;
  const resolvedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;

  // Calculate average resolution time
  let totalResolutionTime = 0;
  let resolvedCount = 0;
  let satisfactionSum = 0;
  let satisfactionCount = 0;

  for (const ticket of tickets) {
    if (ticket.resolvedAt) {
      const resolutionTime =
        new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime();
      totalResolutionTime += resolutionTime;
      resolvedCount++;
    }

    if (ticket.resolution?.rating) {
      satisfactionSum += ticket.resolution.rating;
      satisfactionCount++;
    }
  }

  return {
    totalTickets,
    openTickets,
    resolvedTickets,
    averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
    satisfactionScore: satisfactionCount > 0 ? satisfactionSum / satisfactionCount : undefined,
  };
}

/**
 * Get customer order summary (simulated)
 */
async function getOrderSummary(_customerId: string): Promise<CustomerOrderSummary> {
  // In production, this would call an order service
  // Simulating data for demo
  const simulatedOrders = Math.floor(Math.random() * 20) + 5;
  const avgOrderValue = 1500 + Math.random() * 3500;
  const totalSpent = simulatedOrders * avgOrderValue;

  return {
    totalOrders: simulatedOrders,
    totalSpent,
    averageOrderValue: avgOrderValue,
    lastOrderDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Get customer interactions
 */
async function getCustomerInteractions(
  customerId: string,
  limit: number = 50
): Promise<CustomerInteraction[]> {
  // Get interactions from storage
  const storedInteractions = interactions.get(customerId) || [];

  // Add ticket interactions
  const tickets = await ticketService.getTicketsByCustomerId(customerId);
  const ticketInteractions: CustomerInteraction[] = tickets.map(ticket => ({
    id: `ticket-interaction-${ticket.id}`,
    type: 'ticket' as const,
    summary: `Support ticket: ${ticket.subject}`,
    referenceId: ticket.id,
    createdAt: ticket.createdAt,
  }));

  // Add refund interactions
  const refunds = await refundService.getRefundsByCustomerId(customerId);
  const refundInteractions: CustomerInteraction[] = refunds.map(refund => ({
    id: `refund-interaction-${refund.id}`,
    type: 'email' as const,
    summary: `Refund ${refund.refundNumber}: ${refund.status}`,
    referenceId: refund.id,
    createdAt: refund.createdAt,
  }));

  // Combine and sort by date
  const allInteractions = [...storedInteractions, ...ticketInteractions, ...refundInteractions];
  allInteractions.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allInteractions.slice(0, limit);
}

/**
 * Record customer interaction
 */
export async function recordInteraction(
  customerId: string,
  interaction: Omit<CustomerInteraction, 'id' | 'createdAt'>
): Promise<CustomerInteraction> {
  const newInteraction: CustomerInteraction = {
    ...interaction,
    id: `interaction-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  const customerInteractions = interactions.get(customerId) || [];
  customerInteractions.push(newInteraction);
  interactions.set(customerId, customerInteractions);

  // Update customer last active
  const profile = customers.get(customerId);
  if (profile) {
    profile.lastActiveAt = new Date().toISOString();
  }

  logger.info('interaction_recorded', { customerId, interactionId: newInteraction.id });

  return newInteraction;
}

/**
 * Get complete customer history
 */
export async function getCustomerHistory(
  customerId: string,
  includeRelatedTickets: boolean = false
): Promise<CustomerHistory | null> {
  logger.info('get_customer_history', { customerId });

  const profile = await getCustomerProfile(customerId);
  if (!profile) {
    logger.warn('customer_not_found', { customerId });
    return null;
  }

  const [ticketsSummary, ordersSummary, interactionsList] = await Promise.all([
    getTicketSummary(customerId),
    getOrderSummary(customerId),
    getCustomerInteractions(customerId, 50),
  ]);

  let relatedTickets: SupportTicket[] | undefined;
  if (includeRelatedTickets) {
    relatedTickets = await ticketService.getTicketsByCustomerId(customerId);
  }

  const history: CustomerHistory = {
    profile,
    tickets: ticketsSummary,
    orders: ordersSummary,
    interactions: interactionsList,
    relatedTickets,
    createdAt: profile.createdAt,
    updatedAt: new Date().toISOString(),
  };

  logger.info('customer_history_retrieved', {
    customerId,
    totalTickets: ticketsSummary.totalTickets,
    totalOrders: ordersSummary.totalOrders,
    totalInteractions: interactionsList.length,
  });

  return history;
}

/**
 * Get customer sentiment score
 */
export async function getCustomerSentiment(customerId: string): Promise<{
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  factors: string[];
}> {
  const tickets = await ticketService.getTicketsByCustomerId(customerId);

  if (tickets.length === 0) {
    return {
      score: 100,
      trend: 'stable',
      factors: ['New customer - no interaction history'],
    };
  }

  const factors: string[] = [];
  let score = 100;

  // Factor: Average satisfaction rating
  const ratings = tickets
    .filter(t => t.resolution?.rating)
    .map(t => t.resolution!.rating!);

  if (ratings.length > 0) {
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const ratingScore = (avgRating / 5) * 40;
    score = score - 40 + ratingScore;
    factors.push(`Average satisfaction rating: ${avgRating.toFixed(1)}/5`);
  } else {
    score -= 20;
    factors.push('No satisfaction ratings recorded');
  }

  // Factor: Resolution time
  const resolvedTickets = tickets.filter(t => t.resolvedAt);
  if (resolvedTickets.length > 0) {
    const avgResolutionHours = resolvedTickets.reduce((sum, t) => {
      const hours = (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0) / resolvedTickets.length;

    if (avgResolutionHours > 48) {
      score -= 15;
      factors.push(`Slow resolution time: ${avgResolutionHours.toFixed(1)} hours average`);
    } else if (avgResolutionHours < 12) {
      score += 10;
      factors.push('Fast resolution time');
    }
  }

  // Factor: Escalation rate
  const escalatedTickets = tickets.filter(t => t.status === 'escalated');
  const escalationRate = escalatedTickets.length / tickets.length;
  if (escalationRate > 0.3) {
    score -= 20;
    factors.push(`High escalation rate: ${(escalationRate * 100).toFixed(0)}%`);
  }

  // Factor: Repeated issues
  const customerTickets = await ticketService.getTicketsByCustomerId(customerId);
  const ticketCategories = new Map<string, number>();
  for (const ticket of customerTickets) {
    const count = ticketCategories.get(ticket.category) || 0;
    ticketCategories.set(ticket.category, count + 1);
  }

  for (const [category, count] of ticketCategories) {
    if (count > 3) {
      score -= 10;
      factors.push(`Repeated ${category} issues: ${count} tickets`);
    }
  }

  // Factor: Ticket volume
  if (tickets.length > 10) {
    score -= 10;
    factors.push(`High ticket volume: ${tickets.length} total tickets`);
  }

  // Determine trend (simplified - compare recent vs older tickets)
  const recentTickets = tickets.filter(
    t => new Date(t.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
  );
  const olderTickets = tickets.filter(
    t => new Date(t.createdAt).getTime() <= Date.now() - 30 * 24 * 60 * 60 * 1000
  );

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentTickets.length > 0 && olderTickets.length > 0) {
    const recentAvgRating = recentTickets
      .filter(t => t.resolution?.rating)
      .reduce((sum, t, _, arr) => sum + (t.resolution!.rating || 0) / arr.length, 0);
    const olderAvgRating = olderTickets
      .filter(t => t.resolution?.rating)
      .reduce((sum, t, _, arr) => sum + (t.resolution!.rating || 0) / arr.length, 0);

    if (recentAvgRating > olderAvgRating + 0.5) {
      trend = 'improving';
    } else if (recentAvgRating < olderAvgRating - 0.5) {
      trend = 'declining';
    }
  }

  // Normalize score
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    trend,
    factors,
  };
}

/**
 * Get at-risk customers
 */
export async function getAtRiskCustomers(threshold: number = 50): Promise<{
  customerId: string;
  name: string;
  email: string;
  sentimentScore: number;
  riskFactors: string[];
}[]> {
  const atRisk: {
    customerId: string;
    name: string;
    email: string;
    sentimentScore: number;
    riskFactors: string[];
  }[] = [];

  for (const [customerId, profile] of customers.entries()) {
    const sentiment = await getCustomerSentiment(customerId);

    if (sentiment.score < threshold) {
      atRisk.push({
        customerId,
        name: profile.name,
        email: profile.email,
        sentimentScore: sentiment.score,
        riskFactors: sentiment.factors,
      });
    }
  }

  // Sort by sentiment score
  atRisk.sort((a, b) => a.sentimentScore - b.sentimentScore);

  return atRisk;
}

/**
 * Search customers
 */
export async function searchCustomers(
  query: string
): Promise<CustomerProfile[]> {
  const lowerQuery = query.toLowerCase();
  const results: CustomerProfile[] = [];

  for (const customer of customers.values()) {
    if (
      customer.name.toLowerCase().includes(lowerQuery) ||
      customer.email.toLowerCase().includes(lowerQuery) ||
      customer.id.includes(query)
    ) {
      results.push(customer);
    }
  }

  return results;
}

/**
 * Get all customers
 */
export async function getAllCustomers(
  page: number = 1,
  pageSize: number = 20
): Promise<{ customers: CustomerProfile[]; total: number }> {
  const allCustomers = Array.from(customers.values());
  const total = allCustomers.length;

  const start = (page - 1) * pageSize;
  const paginatedCustomers = allCustomers.slice(start, start + pageSize);

  return {
    customers: paginatedCustomers,
    total,
  };
}

/**
 * Add customer note
 */
export async function addCustomerNote(
  customerId: string,
  note: string
): Promise<{ notes: string[] }> {
  // Get existing notes from metadata
  const profile = customers.get(customerId);
  if (!profile) {
    logger.warn('customer_not_found', { customerId });
    return { notes: [] };
  }

  if (!profile.metadata) {
    profile.metadata = {};
  }

  const notes = (profile.metadata.notes as string[]) || [];
  notes.push(note);
  profile.metadata.notes = notes;

  logger.info('customer_note_added', { customerId, noteLength: note.length });

  return { notes };
}

/**
 * Get customer notes
 */
export async function getCustomerNotes(customerId: string): Promise<string[]> {
  const profile = customers.get(customerId);
  if (!profile) {
    return [];
  }

  return (profile.metadata?.notes as string[]) || [];
}
