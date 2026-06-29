/**
 * POS Types
 */

export interface Table {
  id: string;
  tenantId: string;
  number: number;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  position?: { x: number; y: number };
  isActive: boolean;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface POSOrder {
  id: string;
  tenantId: string;
  tableId?: string;
  items: POSOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  splitChecks: SplitCheck[];
  createdAt: string;
  closedAt?: string;
  paymentMethod?: PaymentMethod;
  tip?: number;
}

export interface POSOrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  modifiers: string[];
  notes?: string;
}

export type OrderStatus = 'open' | 'closed' | 'paid' | 'cancelled';

export interface SplitCheck {
  id: string;
  items: string[]; // item IDs
  amount: number;
  status: 'pending' | 'paid';
}

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'mixed';

export interface CreateOrderInput {
  tableId?: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    modifiers?: string[];
    notes?: string;
  }[];
}

export interface TableAssignment {
  tableId: string;
  orderId: string;
  seatedAt: string;
  partySize: number;
}
