/**
 * Kitchen Display System Types
 */

export interface KitchenTicket {
  id: string;
  tenantId: string;
  orderId: string;
  tableNumber?: number;
  items: KitchenItem[];
  priority: 'normal' | 'rush' | 'vip';
  status: TicketStatus;
  course: number; // 1 = first course, 2 = second, etc.
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedReadyTime?: string;
  notes?: string;
}

export type TicketStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

export interface KitchenItem {
  id: string;
  name: string;
  quantity: number;
  modifiers: string[];
  notes?: string;
  status: 'pending' | 'cooking' | 'done';
  station?: string;
}

export interface Station {
  id: string;
  tenantId: string;
  name: string; // e.g., "Grill", "Fry", "Sauté", "Dessert"
  isActive: boolean;
  items: string[]; // item IDs that go to this station
}

export interface CreateTicketInput {
  orderId: string;
  tableNumber?: number;
  items: {
    name: string;
    quantity: number;
    modifiers?: string[];
    notes?: string;
  }[];
  priority?: 'normal' | 'rush' | 'vip';
  course?: number;
}

export interface TicketUpdate {
  status?: TicketStatus;
  priority?: 'normal' | 'rush' | 'vip';
  notes?: string;
}

export interface KitchenStats {
  pendingTickets: number;
  inProgressTickets: number;
  avgWaitTime: number; // minutes
  ticketsToday: number;
  ticketsCompleted: number;
}
