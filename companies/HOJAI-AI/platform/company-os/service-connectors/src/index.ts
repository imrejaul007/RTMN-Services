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
export * from './healthcare-connector';
export * from './education-connector';
export * from './realestate-connector';
export * from './manufacturing-connector';

// Factory functions
export { createRestaurantConnector } from './restaurant-connector';
export { createBeautyConnector } from './beauty-connector';
export { createHotelConnector } from './hotel-connector';
export { createRetailConnector } from './retail-connector';
export { createHealthcareConnector } from './healthcare-connector';
export { createEducationConnector } from './education-connector';
export { createRealEstateConnector } from './realestate-connector';
export { createManufacturingConnector } from './manufacturing-connector';

// ============================================
// Connector Registry
// ============================================

import { TenantContext } from './shared/types';
import {
  RestaurantConnector,
  BeautyConnector,
  HotelConnector,
  RetailConnector,
  HealthcareConnector,
  EducationConnector,
  RealEstateConnector,
  ManufacturingConnector,
} from './index';

export type IndustryType =
  | 'restaurant'
  | 'beauty'
  | 'hotel'
  | 'retail'
  | 'healthcare'
  | 'education'
  | 'realestate'
  | 'manufacturing';

export interface ConnectorFactory {
  restaurant: (tenant?: TenantContext) => RestaurantConnector;
  beauty: (tenant?: TenantContext) => BeautyConnector;
  hotel: (tenant?: TenantContext) => HotelConnector;
  retail: (tenant?: TenantContext) => RetailConnector;
  healthcare: (tenant?: TenantContext) => HealthcareConnector;
  education: (tenant?: TenantContext) => EducationConnector;
  realestate: (tenant?: TenantContext) => RealEstateConnector;
  manufacturing: (tenant?: TenantContext) => ManufacturingConnector;
}

export const connectors: ConnectorFactory = {
  restaurant: (tenant?: TenantContext) => new RestaurantConnector(tenant),
  beauty: (tenant?: TenantContext) => new BeautyConnector(tenant),
  hotel: (tenant?: TenantContext) => new HotelConnector(tenant),
  retail: (tenant?: TenantContext) => new RetailConnector(tenant),
  healthcare: (tenant?: TenantContext) => new HealthcareConnector(tenant),
  education: (tenant?: TenantContext) => new EducationConnector(tenant),
  realestate: (tenant?: TenantContext) => new RealEstateConnector(tenant),
  manufacturing: (tenant?: TenantContext) => new ManufacturingConnector(tenant),
};

/**
 * Get connector for industry
 */
export function getConnector(industry: IndustryType, tenant?: TenantContext) {
  return connectors[industry](tenant);
}

/**
 * Get all available industries
 */
export function getAvailableIndustries(): IndustryType[] {
  return ['restaurant', 'beauty', 'hotel', 'retail', 'healthcare', 'education', 'realestate', 'manufacturing'];
}
