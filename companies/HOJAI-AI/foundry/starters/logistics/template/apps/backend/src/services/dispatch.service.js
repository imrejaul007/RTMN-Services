import { store } from './store.js';

export function listVehicles() { return store.vehicles; }

export function createShipment({ origin, destination, weightKg, customerId }) {
  if (!origin || !destination) throw new Error('origin and destination required');
  const shipment = { id: crypto.randomUUID(), origin, destination, weightKg: Number(weightKg) || 0, customerId: customerId || null, status: 'pending', createdAt: new Date().toISOString() };
  store.shipments.unshift(shipment);
  return shipment;
}

export function listShipments() { return store.shipments; }

export function dispatch(shipmentId, vehicleId) {
  const shipment = store.shipments.find(s => s.id === shipmentId);
  const vehicle = store.vehicles.find(v => v.id === vehicleId);
  if (!shipment || !vehicle) throw new Error('shipment or vehicle not found');
  shipment.vehicleId = vehicleId;
  shipment.status = 'in-transit';
  vehicle.status = 'enroute';
  const entry = { id: crypto.randomUUID(), shipmentId, vehicleId, dispatchedAt: new Date().toISOString() };
  store.dispatches.unshift(entry);
  return entry;
}

export function listDispatches() { return store.dispatches; }
