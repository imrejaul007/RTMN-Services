/**
 * Digital Twins Routes - Restaurant Twins
 */

import { Router } from 'express';

export const digitalTwinsRoutes = Router();

digitalTwinsRoutes.get('/', (req, res) => {
  res.json({
    twins: [
      { id: 'rest-reservation-twin', name: 'Reservation Twin', type: 'reservation', status: 'active', health: 98 },
      { id: 'rest-menu-twin', name: 'Menu Twin', type: 'menu', status: 'active', health: 100 },
      { id: 'rest-kitchen-twin', name: 'Kitchen Twin', type: 'kitchen', status: 'active', health: 95 },
      { id: 'rest-order-twin', name: 'Order Twin', type: 'order', status: 'active', health: 97 },
      { id: 'rest-staff-twin', name: 'Staff Twin', type: 'staff', status: 'active', health: 99 },
      { id: 'rest-customer-twin', name: 'Customer Twin', type: 'customer', status: 'active', health: 96 },
      { id: 'rest-inventory-twin', name: 'Inventory Twin', type: 'inventory', status: 'active', health: 94, service: 'inventory-twin-service@4016' },
      { id: 'rest-table-twin', name: 'Table Twin', type: 'table', status: 'active', health: 97, service: 'table-twin-service@4012' },
      { id: 'rest-revenue-twin', name: 'Revenue Twin', type: 'revenue', status: 'active', health: 98 }
    ],
    total: 9
  });
});

digitalTwinsRoutes.get('/:twinId', (req, res) => {
  const twinMap = {
    'rest-reservation-twin': {
      id: 'rest-reservation-twin',
      name: 'Reservation Twin',
      type: 'reservation',
      metrics: { total: 150, today: 45, pending: 8 },
      health: 98
    },
    'rest-menu-twin': {
      id: 'rest-menu-twin',
      name: 'Menu Twin',
      type: 'menu',
      metrics: { items: 85, categories: 8, avgPrice: 180 },
      health: 100
    }
  };
  res.json(twinMap[req.params.twinId] || twinMap['rest-reservation-twin']);
});
