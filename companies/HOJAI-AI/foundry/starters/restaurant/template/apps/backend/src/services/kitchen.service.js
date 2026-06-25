import { store } from './store.js';

export function listMenu() { return store.menu; }
export function listTables() { return store.tables; }

export function createOrder({ tableId, items, customerName }) {
  const table = store.tables.find(t => t.id === tableId);
  if (!table) throw new Error('table not found');
  const ids = (items || []).map(i => i.menuItemId);
  const menuItems = store.menu.filter(m => ids.includes(m.id));
  const totalInr = menuItems.reduce((sum, m, idx) => sum + m.price * (items[idx].qty || 1), 0);
  const order = { id: crypto.randomUUID(), tableId, customerName: customerName || null, items: items || [], menuItems, totalInr, status: 'kot', createdAt: new Date().toISOString() };
  store.orders.unshift(order);
  if (table) table.status = 'occupied';
  return order;
}

export function listOrders() { return store.orders; }

export function closeOrder(orderId) {
  const order = store.orders.find(o => o.id === orderId);
  if (!order) throw new Error('order not found');
  const table = store.tables.find(t => t.id === order.tableId);
  if (table) table.status = 'free';
  order.status = 'paid';
  return order;
}
