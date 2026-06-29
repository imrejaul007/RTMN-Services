/**
 * POS Service
 *
 * Tenant-aware restaurant POS management.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Table,
  POSOrder,
  POSOrderItem,
  SplitCheck,
  CreateOrderInput,
  TableStatus,
  OrderStatus,
} from './types';

// ============================================
// Store
// ============================================

const tenantStores: Map<string, {
  tables: Map<string, Table>;
  orders: Map<string, POSOrder>;
}> = new Map();

function getStore(tenantId: string) {
  if (!tenantStores.has(tenantId)) {
    tenantStores.set(tenantId, {
      tables: new Map(),
      orders: new Map(),
    });
  }
  return tenantStores.get(tenantId)!;
}

// ============================================
// POS Service
// ============================================

export class POSService {
  // ========================================
  // Table Management
  // ========================================

  createTable(tenantId: string, number: number, capacity: number): Table {
    const store = getStore(tenantId);
    const id = `table_${uuidv4().slice(0, 8)}`;

    const table: Table = {
      id,
      tenantId,
      number,
      capacity,
      status: 'available',
      isActive: true,
    };

    store.tables.set(id, table);
    return table;
  }

  getTable(tenantId: string, tableId: string): Table | null {
    const store = getStore(tenantId);
    const table = store.tables.get(tableId);

    if (!table || table.tenantId !== tenantId) {
      return null;
    }

    return table;
  }

  listTables(tenantId: string): Table[] {
    const store = getStore(tenantId);
    return Array.from(store.tables.values())
      .filter(t => t.tenantId === tenantId && t.isActive)
      .sort((a, b) => a.number - b.number);
  }

  updateTableStatus(tenantId: string, tableId: string, status: TableStatus): Table | null {
    const store = getStore(tenantId);
    const table = store.tables.get(tableId);

    if (!table || table.tenantId !== tenantId) {
      return null;
    }

    table.status = status;

    if (status === 'available') {
      table.currentOrderId = undefined;
    }

    return table;
  }

  seatTable(tenantId: string, tableId: string, orderId: string): Table | null {
    const store = getStore(tenantId);
    const table = store.tables.get(tableId);

    if (!table || table.tenantId !== tenantId) {
      return null;
    }

    table.status = 'occupied';
    table.currentOrderId = orderId;
    return table;
  }

  clearTable(tenantId: string, tableId: string): Table | null {
    return this.updateTableStatus(tenantId, tableId, 'cleaning');
  }

  // ========================================
  // Order Management
  // ========================================

  createOrder(tenantId: string, input: CreateOrderInput): POSOrder {
    const store = getStore(tenantId);
    const id = `pos_order_${uuidv4().slice(0, 8)}`;

    const items: POSOrderItem[] = input.items.map(item => ({
      id: `pos_item_${uuidv4().slice(0, 6)}`,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      modifiers: item.modifiers || [],
      notes: item.notes,
    }));

    const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;

    const order: POSOrder = {
      id,
      tenantId,
      tableId: input.tableId,
      items,
      subtotal,
      tax,
      total,
      status: 'open',
      splitChecks: [],
      createdAt: new Date().toISOString(),
    };

    store.orders.set(id, order);

    // Update table if tableId provided
    if (input.tableId) {
      this.seatTable(tenantId, input.tableId, id);
    }

    return order;
  }

  getOrder(tenantId: string, orderId: string): POSOrder | null {
    const store = getStore(tenantId);
    const order = store.orders.get(orderId);

    if (!order || order.tenantId !== tenantId) {
      return null;
    }

    return order;
  }

  listOrders(tenantId: string, status?: OrderStatus): POSOrder[] {
    const store = getStore(tenantId);
    let orders = Array.from(store.orders.values())
      .filter(o => o.tenantId === tenantId);

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    return orders.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  addItemToOrder(tenantId: string, orderId: string, item: Omit<POSOrderItem, 'id'>): POSOrder | null {
    const store = getStore(tenantId);
    const order = store.orders.get(orderId);

    if (!order || order.tenantId !== tenantId || order.status !== 'open') {
      return null;
    }

    const newItem: POSOrderItem = {
      id: `pos_item_${uuidv4().slice(0, 6)}`,
      ...item,
    };

    order.items.push(newItem);
    order.subtotal += item.price * item.quantity;
    order.tax = order.subtotal * 0.18;
    order.total = order.subtotal + order.tax;

    return order;
  }

  // ========================================
  // Split Checks
  // ========================================

  splitCheck(tenantId: string, orderId: string, itemIds: string[]): SplitCheck | null {
    const store = getStore(tenantId);
    const order = store.orders.get(orderId);

    if (!order || order.tenantId !== tenantId) {
      return null;
    }

    const splitItems = order.items.filter(i => itemIds.includes(i.id));
    const amount = splitItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const split: SplitCheck = {
      id: `split_${uuidv4().slice(0, 6)}`,
      items: itemIds,
      amount,
      status: 'pending',
    };

    order.splitChecks.push(split);
    return split;
  }

  // ========================================
  // Payment
  // ========================================

  closeOrder(tenantId: string, orderId: string, paymentMethod: 'cash' | 'card' | 'upi'): POSOrder | null {
    const store = getStore(tenantId);
    const order = store.orders.get(orderId);

    if (!order || order.tenantId !== tenantId) {
      return null;
    }

    order.status = 'paid';
    order.paymentMethod = paymentMethod;
    order.closedAt = new Date().toISOString();

    // Clear table if applicable
    if (order.tableId) {
      this.clearTable(tenantId, order.tableId);
    }

    return order;
  }

  // ========================================
  // Cleanup
  // ========================================

  deleteTenantData(tenantId: string): void {
    tenantStores.delete(tenantId);
  }
}

export const posService = new POSService();
