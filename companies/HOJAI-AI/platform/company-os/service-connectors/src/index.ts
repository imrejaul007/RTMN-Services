/**
 * Service Connectors Index
 *
 * Unified connectors for all REZ-Merchant services.
 */

export * from './base-connector';
export * from './shared/types';
export * from './restaurant-connector';
export * from './beauty-connector';
export * from './hotel-connector';
export * from './retail-connector';

// Re-export factory functions
export { createRestaurantConnector } from './restaurant-connector';
export { createBeautyConnector } from './beauty-connector';
export { createHotelConnector } from './hotel-connector';
export { createRetailConnector } from './retail-connector';

// ============================================
// Connector Registry
// ============================================

import { TenantContext } from './shared/types';
import {
  RestaurantConnector,
  BeautyConnector,
  HotelConnector,
  RetailConnector,
} from './index';

export type IndustryType = 'restaurant' | 'beauty' | 'hotel' | 'retail';

export interface ConnectorFactory {
  restaurant: (tenant?: TenantContext) => RestaurantConnector;
  beauty: (tenant?: TenantContext) => BeautyConnector;
  hotel: (tenant?: TenantContext) => HotelConnector;
  retail: (tenant?: TenantContext) => RetailConnector;
}

export const connectors: ConnectorFactory = {
  restaurant: (tenant?: TenantContext) => new RestaurantConnector(tenant),
  beauty: (tenant?: TenantContext) => new BeautyConnector(tenant),
  hotel: (tenant?: TenantContext) => new HotelConnector(tenant),
  retail: (tenant?: TenantContext) => new RetailConnector(tenant),
};

/**
 * Get connector for industry
 */
export function getConnector(industry: IndustryType, tenant?: TenantContext) {
  return connectors[industry](tenant);
}
