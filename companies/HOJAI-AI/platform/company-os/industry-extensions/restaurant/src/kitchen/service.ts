/**
 * Kitchen Display Service
 *
 * Tenant-aware kitchen ticket management.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  KitchenTicket,
  KitchenItem,
  Station,
  CreateTicketInput,
  TicketUpdate,
  KitchenStats,
  TicketStatus,
} from './types';

// ============================================
// Store
// ============================================

const tenantStores: Map<string, {
  tickets: Map<string, KitchenTicket>;
  stations: Map<string, Station>;
}> = new Map();

function getStore(tenantId: string) {
  if (!tenantStores.has(tenantId)) {
    tenantStores.set(tenantId, {
      tickets: new Map(),
      stations: new Map(),
    });
  }
  return tenantStores.get(tenantId)!;
}

// ============================================
// Kitchen Service
// ============================================

export class KitchenService {
  /**
   * Create a new kitchen ticket from an order
   */
  createTicket(tenantId: string, input: CreateTicketInput): KitchenTicket {
    const store = getStore(tenantId);
    const id = `ticket_${uuidv4().slice(0, 8)}`;

    const items: KitchenItem[] = input.items.map(item => ({
      id: `ki_${uuidv4().slice(0, 6)}`,
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers || [],
      notes: item.notes,
      status: 'pending',
    }));

    const ticket: KitchenTicket = {
      id,
      tenantId,
      orderId: input.orderId,
      tableNumber: input.tableNumber,
      items,
      priority: input.priority || 'normal',
      status: 'pending',
      course: input.course || 1,
      createdAt: new Date().toISOString(),
    };

    store.tickets.set(id, ticket);
    return ticket;
  }

  /**
   * Get ticket by ID
   */
  getTicket(tenantId: string, ticketId: string): KitchenTicket | null {
    const store = getStore(tenantId);
    const ticket = store.tickets.get(ticketId);

    if (!ticket || ticket.tenantId !== tenantId) {
      return null;
    }

    return ticket;
  }

  /**
   * Get all active tickets
   */
  getActiveTickets(tenantId: string): KitchenTicket[] {
    const store = getStore(tenantId);
    return Array.from(store.tickets.values())
      .filter(t => t.tenantId === tenantId && !['delivered', 'cancelled'].includes(t.status))
      .sort((a, b) => {
        // Sort by priority (VIP > Rush > Normal), then by time
        const priorityOrder = { vip: 0, rush: 1, normal: 2 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  /**
   * Update ticket status
   */
  updateTicket(tenantId: string, ticketId: string, update: TicketUpdate): KitchenTicket | null {
    const store = getStore(tenantId);
    const ticket = store.tickets.get(ticketId);

    if (!ticket || ticket.tenantId !== tenantId) {
      return null;
    }

    if (update.status) {
      ticket.status = update.status;
      if (update.status === 'in_progress' && !ticket.startedAt) {
        ticket.startedAt = new Date().toISOString();
      }
      if (update.status === 'delivered' || update.status === 'ready') {
        ticket.completedAt = new Date().toISOString();
      }
    }

    if (update.priority) {
      ticket.priority = update.priority;
    }

    if (update.notes !== undefined) {
      ticket.notes = update.notes;
    }

    return ticket;
  }

  /**
   * Bump (mark item as done)
   */
  bumpItem(tenantId: string, ticketId: string, itemId: string): KitchenTicket | null {
    const store = getStore(tenantId);
    const ticket = store.tickets.get(ticketId);

    if (!ticket || ticket.tenantId !== tenantId) {
      return null;
    }

    const item = ticket.items.find(i => i.id === itemId);
    if (item) {
      item.status = 'done';
    }

    // Check if all items are done
    if (ticket.items.every(i => i.status === 'done')) {
      ticket.status = 'ready';
      ticket.completedAt = new Date().toISOString();
    }

    return ticket;
  }

  /**
   * Complete ticket
   */
  completeTicket(tenantId: string, ticketId: string): KitchenTicket | null {
    return this.updateTicket(tenantId, ticketId, { status: 'delivered' });
  }

  /**
   * Cancel ticket
   */
  cancelTicket(tenantId: string, ticketId: string): KitchenTicket | null {
    return this.updateTicket(tenantId, ticketId, { status: 'cancelled' });
  }

  /**
   * Get kitchen statistics
   */
  getStats(tenantId: string): KitchenStats {
    const store = getStore(tenantId);
    const tickets = Array.from(store.tickets.values())
      .filter(t => t.tenantId === tenantId);

    const today = new Date().toISOString().split('T')[0];
    const todayTickets = tickets.filter(t =>
      t.createdAt.startsWith(today)
    );

    const completedTickets = todayTickets.filter(t => t.status === 'delivered');
    const pendingTickets = tickets.filter(t => t.status === 'pending');
    const inProgressTickets = tickets.filter(t => t.status === 'in_progress');

    // Calculate average wait time
    let avgWaitTime = 0;
    if (completedTickets.length > 0) {
      const totalWait = completedTickets.reduce((sum, t) => {
        const start = new Date(t.startedAt || t.createdAt).getTime();
        const end = new Date(t.completedAt!).getTime();
        return sum + (end - start) / 60000; // minutes
      }, 0);
      avgWaitTime = Math.round(totalWait / completedTickets.length);
    }

    return {
      pendingTickets: pendingTickets.length,
      inProgressTickets: inProgressTickets.length,
      avgWaitTime,
      ticketsToday: todayTickets.length,
      ticketsCompleted: completedTickets.length,
    };
  }

  /**
   * Station management
   */
  createStation(tenantId: string, name: string): Station {
    const store = getStore(tenantId);
    const id = `station_${uuidv4().slice(0, 8)}`;

    const station: Station = {
      id,
      tenantId,
      name,
      isActive: true,
      items: [],
    };

    store.stations.set(id, station);
    return station;
  }

  getStations(tenantId: string): Station[] {
    const store = getStore(tenantId);
    return Array.from(store.stations.values())
      .filter(s => s.tenantId === tenantId);
  }

  /**
   * Delete tenant data
   */
  deleteTenantData(tenantId: string): void {
    tenantStores.delete(tenantId);
  }
}

export const kitchenService = new KitchenService();
