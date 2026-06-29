/**
 * Restaurant Extension Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { menuService } from '../menu/service';
import { kitchenService } from '../kitchen/service';
import { posService } from '../pos/service';
import { reservationsService } from '../reservations/service';

describe('Restaurant Extension', () => {
  const tenantId = 'test_restaurant_001';

  beforeEach(() => {
    // Clear tenant data
    menuService.deleteTenantData(tenantId);
    kitchenService.deleteTenantData(tenantId);
    posService.deleteTenantData(tenantId);
    reservationsService.deleteTenantData(tenantId);
  });

  // ========================================
  // MENU TESTS
  // ========================================

  describe('Menu Service', () => {
    it('should create a menu', () => {
      const menu = menuService.createMenu(tenantId, {
        name: 'Lunch Menu',
        description: 'Our lunch offerings',
      });

      expect(menu.id).toBeDefined();
      expect(menu.name).toBe('Lunch Menu');
      expect(menu.tenantId).toBe(tenantId);
    });

    it('should create categories and items', () => {
      const menu = menuService.createMenu(tenantId, { name: 'Main Menu' });
      const category = menuService.createCategory(tenantId, {
        menuId: menu.id,
        name: 'Starters',
        sortOrder: 1,
      });

      const item = menuService.createItem(tenantId, {
        categoryId: category.id,
        name: 'Spring Rolls',
        price: 150,
        allergens: ['gluten'],
      });

      expect(category.id).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.name).toBe('Spring Rolls');
      expect(item.price).toBe(150);
      expect(item.allergens).toContain('gluten');
    });

    it('should list menus for tenant only', () => {
      menuService.createMenu(tenantId, { name: 'Menu A' });
      menuService.createMenu('other_tenant', { name: 'Menu B' });

      const menus = menuService.listMenus(tenantId);
      expect(menus.length).toBe(1);
      expect(menus[0].name).toBe('Menu A');
    });
  });

  // ========================================
  // KITCHEN TESTS
  // ========================================

  describe('Kitchen Service', () => {
    it('should create kitchen tickets', () => {
      const ticket = kitchenService.createTicket(tenantId, {
        orderId: 'order_001',
        tableNumber: 5,
        items: [
          { name: 'Burger', quantity: 2, modifiers: ['No onions'] },
          { name: 'Fries', quantity: 2 },
        ],
        priority: 'normal',
      });

      expect(ticket.id).toBeDefined();
      expect(ticket.items.length).toBe(2);
      expect(ticket.status).toBe('pending');
      expect(ticket.priority).toBe('normal');
    });

    it('should prioritize VIP tickets', () => {
      const normalTicket = kitchenService.createTicket(tenantId, {
        orderId: 'order_001',
        items: [{ name: 'Burger', quantity: 1 }],
        priority: 'normal',
      });

      const vipTicket = kitchenService.createTicket(tenantId, {
        orderId: 'order_002',
        items: [{ name: 'Steak', quantity: 1 }],
        priority: 'vip',
      });

      const active = kitchenService.getActiveTickets(tenantId);
      expect(active[0].id).toBe(vipTicket.id); // VIP first
    });

    it('should bump items when done', () => {
      const ticket = kitchenService.createTicket(tenantId, {
        orderId: 'order_001',
        items: [
          { name: 'Burger', quantity: 1 },
          { name: 'Fries', quantity: 1 },
        ],
      });

      kitchenService.bumpItem(tenantId, ticket.id, ticket.items[0].id);
      kitchenService.bumpItem(tenantId, ticket.id, ticket.items[1].id);

      const updated = kitchenService.getTicket(tenantId, ticket.id);
      expect(updated?.status).toBe('ready');
    });

    it('should calculate kitchen stats', () => {
      kitchenService.createTicket(tenantId, {
        orderId: 'order_001',
        items: [{ name: 'Item', quantity: 1 }],
      });

      const stats = kitchenService.getStats(tenantId);
      expect(stats.pendingTickets).toBe(1);
    });
  });

  // ========================================
  // POS TESTS
  // ========================================

  describe('POS Service', () => {
    it('should create and manage tables', () => {
      const table = posService.createTable(tenantId, 1, 4);

      expect(table.id).toBeDefined();
      expect(table.number).toBe(1);
      expect(table.capacity).toBe(4);
      expect(table.status).toBe('available');
    });

    it('should create orders', () => {
      const order = posService.createOrder(tenantId, {
        items: [
          { menuItemId: 'item_001', name: 'Pizza', quantity: 1, price: 500 },
          { menuItemId: 'item_002', name: 'Coke', quantity: 2, price: 50 },
        ],
      });

      expect(order.id).toBeDefined();
      expect(order.items.length).toBe(2);
      expect(order.subtotal).toBe(600);
      expect(order.tax).toBe(108); // 18%
      expect(order.total).toBe(708);
    });

    it('should seat customers at table', () => {
      const table = posService.createTable(tenantId, 5, 4);
      const order = posService.createOrder(tenantId, {
        tableId: table.id,
        items: [{ menuItemId: 'item', name: 'Item', quantity: 1, price: 100 }],
      });

      const updatedTable = posService.getTable(tenantId, table.id);
      expect(updatedTable?.status).toBe('occupied');
      expect(updatedTable?.currentOrderId).toBe(order.id);
    });
  });

  // ========================================
  // RESERVATIONS TESTS
  // ========================================

  describe('Reservations Service', () => {
    it('should create a reservation', () => {
      const reservation = reservationsService.createReservation(tenantId, {
        customerName: 'John Doe',
        customerPhone: '+919876543210',
        date: '2026-07-01',
        time: '19:00',
        partySize: 4,
      });

      expect(reservation.id).toBeDefined();
      expect(reservation.customerName).toBe('John Doe');
      expect(reservation.status).toBe('confirmed');
    });

    it('should list reservations by date', () => {
      reservationsService.createReservation(tenantId, {
        customerName: 'John',
        customerPhone: '+919876543210',
        date: '2026-07-01',
        time: '19:00',
        partySize: 4,
      });

      reservationsService.createReservation(tenantId, {
        customerName: 'Jane',
        customerPhone: '+919876543211',
        date: '2026-07-01',
        time: '20:00',
        partySize: 2,
      });

      const todayReservations = reservationsService.listReservations(tenantId, {
        date: '2026-07-01',
      });

      expect(todayReservations.length).toBe(2);
    });

    it('should add to waitlist', () => {
      const entry = reservationsService.addToWaitlist(
        tenantId,
        'Bob',
        '+919876543212',
        4
      );

      expect(entry.id).toBeDefined();
      expect(entry.status).toBe('waiting');

      const waitlist = reservationsService.getWaitlist(tenantId);
      expect(waitlist.length).toBe(1);
    });
  });

  // ========================================
  // TENANT ISOLATION TESTS
  // ========================================

  describe('Tenant Isolation', () => {
    it('should isolate menu data between tenants', () => {
      menuService.createMenu('tenant_a', { name: 'Menu A' });
      menuService.createMenu('tenant_b', { name: 'Menu B' });

      const menuA = menuService.listMenus('tenant_a');
      const menuB = menuService.listMenus('tenant_b');

      expect(menuA.length).toBe(1);
      expect(menuA[0].name).toBe('Menu A');
      expect(menuB.length).toBe(1);
      expect(menuB[0].name).toBe('Menu B');
    });

    it('should isolate kitchen tickets between tenants', () => {
      kitchenService.createTicket('tenant_a', {
        orderId: 'order_a',
        items: [{ name: 'Item A', quantity: 1 }],
      });

      kitchenService.createTicket('tenant_b', {
        orderId: 'order_b',
        items: [{ name: 'Item B', quantity: 1 }],
      });

      const ticketsA = kitchenService.getActiveTickets('tenant_a');
      const ticketsB = kitchenService.getActiveTickets('tenant_b');

      expect(ticketsA.length).toBe(1);
      expect(ticketsB.length).toBe(1);
    });
  });
});
