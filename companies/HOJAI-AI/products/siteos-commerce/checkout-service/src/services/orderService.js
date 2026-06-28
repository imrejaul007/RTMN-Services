import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Get the storage file path for a company
 */
function getStoragePath(companyId) {
  return `/tmp/siteos-orders-${companyId}.json`;
}

/**
 * Initialize storage file if it doesn't exist
 */
async function initStorage(companyId) {
  const filePath = getStoragePath(companyId);
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify({ orders: [] }, null, 2));
  }
}

/**
 * Read all orders for a company
 */
export async function getAllOrders(companyId) {
  await initStorage(companyId);
  const filePath = getStoragePath(companyId);
  const data = await readFile(filePath, 'utf-8');
  const storage = JSON.parse(data);
  return storage.orders;
}

/**
 * Read a specific order by ID
 */
export async function getOrderById(companyId, orderId) {
  const orders = await getAllOrders(companyId);
  return orders.find(order => order.orderId === orderId) || null;
}

/**
 * Read orders by customer ID
 */
export async function getOrdersByCustomer(companyId, customerId) {
  const orders = await getAllOrders(companyId);
  return orders.filter(order => order.customerId === customerId);
}

/**
 * Read orders by session ID
 */
export async function getOrderBySession(companyId, sessionId) {
  const orders = await getAllOrders(companyId);
  return orders.filter(order => order.sessionId === sessionId);
}

/**
 * Save a new order
 */
export async function saveOrder(order) {
  await initStorage(order.companyId);
  const filePath = getStoragePath(order.companyId);
  const data = await readFile(filePath, 'utf-8');
  const storage = JSON.parse(data);

  storage.orders.push(order);
  await writeFile(filePath, JSON.stringify(storage, null, 2));

  return order;
}

/**
 * Update an existing order
 */
export async function updateOrder(companyId, orderId, updates) {
  await initStorage(companyId);
  const filePath = getStoragePath(companyId);
  const data = await readFile(filePath, 'utf-8');
  const storage = JSON.parse(data);

  const orderIndex = storage.orders.findIndex(o => o.orderId === orderId);
  if (orderIndex === -1) {
    return null;
  }

  storage.orders[orderIndex] = {
    ...storage.orders[orderIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await writeFile(filePath, JSON.stringify(storage, null, 2));
  return storage.orders[orderIndex];
}

/**
 * Delete an order
 */
export async function deleteOrder(companyId, orderId) {
  await initStorage(companyId);
  const filePath = getStoragePath(companyId);
  const data = await readFile(filePath, 'utf-8');
  const storage = JSON.parse(data);

  const initialLength = storage.orders.length;
  storage.orders = storage.orders.filter(o => o.orderId !== orderId);

  if (storage.orders.length === initialLength) {
    return false;
  }

  await writeFile(filePath, JSON.stringify(storage, null, 2));
  return true;
}

/**
 * Get order statistics for a company
 */
export async function getOrderStats(companyId) {
  const orders = await getAllOrders(companyId);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
    processing: orders.filter(o => o.orderStatus === 'processing').length,
    shipped: orders.filter(o => o.orderStatus === 'shipped').length,
    delivered: orders.filter(o => o.orderStatus === 'delivered').length,
    cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
    totalRevenue: orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0)
  };

  return stats;
}