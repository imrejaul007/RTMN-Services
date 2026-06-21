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
      { id: 'rest-kitchen-twin', name: 'Kitchen Twin', type: 'kitchen', status: 'active', health: 95, service: 'kitchen-twin-service@4015', wired: true },
      { id: 'rest-order-twin', name: 'Order Twin', type: 'order', status: 'active', health: 97, service: 'order-twin-service@4014', wired: true },
      { id: 'rest-staff-twin', name: 'Staff Twin', type: 'staff', status: 'active', health: 99, service: 'staff-twin-service@4018', wired: true },
      { id: 'rest-customer-twin', name: 'Customer Twin', type: 'customer', status: 'active', health: 96, service: 'customer-twin-service@4017', wired: true },
      { id: 'rest-inventory-twin', name: 'Inventory Twin', type: 'inventory', status: 'active', health: 94, service: 'inventory-twin-service@4016', wired: true },
      { id: 'rest-table-twin', name: 'Table Twin', type: 'table', status: 'active', health: 97, service: 'table-twin-service@4012', wired: true },
      { id: 'rest-revenue-twin', name: 'Revenue Twin', type: 'revenue', status: 'active', health: 98 },
      { id: 'rest-contract-store', name: 'Contract Store', type: 'contract', status: 'active', health: 99, service: 'sutar-contracts@4185', wired: true }
    ],
    total: 10,
    wiredBackends: ['inventory-twin@4016', 'table-twin@4012', 'sutar-contracts@4185', 'kitchen-twin@4015', 'order-twin@4014', 'staff-twin@4018', 'customer-twin@4017']
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
