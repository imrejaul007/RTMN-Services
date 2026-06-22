/**
 * GlamAI Integration Hub
 *
 * Connects GlamAI (Salon OS) to the RTNM ecosystem
 *
 * @module glamai-integration-hub
 * @version 1.0.0
 */

export { BeautyDiscoveryConnector, beautyDiscoveryConnector } from './beauty-discovery-connector';
export { SalonProcurementConnector, salonProcurementConnector } from './salon-procurement-connector';
export { SalonWealthConnector, salonWealthConnector } from './salon-wealth-connector';
export { SalonExpansionConnector, salonExpansionConnector } from './salon-expansion-connector';
export { StylistSchedulerConnector, stylistSchedulerConnector } from './stylist-scheduler-connector';
export { SalonInventoryConnector, salonInventoryConnector } from './salon-inventory-connector';

import { BeautyDiscoveryConnector } from './beauty-discovery-connector';
import { SalonProcurementConnector } from './salon-procurement-connector';
import { SalonWealthConnector } from './salon-wealth-connector';
import { SalonExpansionConnector } from './salon-expansion-connector';
import { StylistSchedulerConnector } from './stylist-scheduler-connector';
import { SalonInventoryConnector } from './salon-inventory-connector';

export class GlamAIIntegrationHub {
  public discovery: BeautyDiscoveryConnector;
  public procurement: SalonProcurementConnector;
  public wealth: SalonWealthConnector;
  public expansion: SalonExpansionConnector;
  public scheduler: StylistSchedulerConnector;
  public inventory: SalonInventoryConnector;

  constructor() {
    this.discovery = new BeautyDiscoveryConnector();
    this.procurement = new SalonProcurementConnector();
    this.wealth = new SalonWealthConnector();
    this.expansion = new SalonExpansionConnector();
    this.scheduler = new StylistSchedulerConnector();
    this.inventory = new SalonInventoryConnector();
  }

  async initialize(): Promise<{ success: boolean; connected: string[]; failed: string[] }> {
    const connected: string[] = [];
    const failed: string[] = [];

    const checks = [
      { name: 'discovery', fn: () => this.discovery.healthCheck() },
      { name: 'procurement', fn: () => this.procurement.healthCheck() },
      { name: 'wealth', fn: () => this.wealth.healthCheck() },
      { name: 'expansion', fn: () => this.expansion.healthCheck() },
      { name: 'scheduler', fn: () => this.scheduler.healthCheck() },
      { name: 'inventory', fn: () => this.inventory.healthCheck() },
    ];

    for (const check of checks) {
      try {
        const result = await check.fn();
        if (result.healthy) connected.push(check.name);
        else failed.push(check.name);
      } catch {
        failed.push(check.name);
      }
    }

    return { success: failed.length === 0, connected, failed };
  }

  async healthCheck(): Promise<{ healthy: boolean; services: Record<string, boolean> }> {
    const checks = await Promise.allSettled([
      this.discovery.healthCheck(),
      this.procurement.healthCheck(),
      this.wealth.healthCheck(),
      this.expansion.healthCheck(),
      this.scheduler.healthCheck(),
      this.inventory.healthCheck(),
    ]);

    const names = ['discovery', 'procurement', 'wealth', 'expansion', 'scheduler', 'inventory'];
    const services: Record<string, boolean> = {};
    let healthy = true;

    checks.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        services[names[i]] = result.value.healthy;
        if (!result.value.healthy) healthy = false;
      } else {
        services[names[i]] = false;
        healthy = false;
      }
    });

    return { healthy, services };
  }
}

export const glamAIHub = new GlamAIIntegrationHub();
