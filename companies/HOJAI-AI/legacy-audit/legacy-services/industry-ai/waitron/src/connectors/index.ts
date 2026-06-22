/**
 * Waitron Integration Hub
 *
 * Unified integration layer that connects all Waitron services
 * Provides a single interface for all external service calls
 *
 * @module waitron-integration-hub
 * @version 1.0.0
 */

// Export all connectors
export { WeatherConnector, weatherConnector, WeatherData, WeatherPrediction } from './weather-connector';
export { QRTableConnector, qrTableConnector, QRScanResult, CustomerProfile } from './qr-table-connector';
export { NexhaProcurementConnector, nexhaProcurementConnector, InventoryAlert } from './nexha-procurement-connector';
export { GenieRestaurantConnector, genieRestaurantConnector, DiscoveryResult } from './genie-restaurant-connector';
export { CateringHandler, cateringHandler, CateringInquiry } from './catering-handler';
export { AssetMindConnector, assetMindConnector, ProfitData } from './assetmind-connector';
export { RestaurantExpansionAgent, restaurantExpansionAgent, ExpansionPlan } from './restaurant-expansion-agent';

import { WeatherConnector } from './weather-connector';
import { QRTableConnector } from './qr-table-connector';
import { NexhaProcurementConnector } from './nexha-procurement-connector';
import { GenieRestaurantConnector } from './genie-restaurant-connector';
import { CateringHandler } from './catering-handler';
import { AssetMindConnector } from './assetmind-connector';
import { RestaurantExpansionAgent } from './restaurant-expansion-agent';

/**
 * Waitron Integration Hub
 * Central orchestrator for all Waitron integrations
 */
export class WaitronIntegrationHub {
  public weather: WeatherConnector;
  public qrTable: QRTableConnector;
  public procurement: NexhaProcurementConnector;
  public restaurant: GenieRestaurantConnector;
  public catering: CateringHandler;
  public wealth: AssetMindConnector;
  public expansion: RestaurantExpansionAgent;

  constructor() {
    this.weather = new WeatherConnector();
    this.qrTable = new QRTableConnector();
    this.procurement = new NexhaProcurementConnector();
    this.restaurant = new GenieRestaurantConnector();
    this.catering = new CateringHandler();
    this.wealth = new AssetMindConnector();
    this.expansion = new RestaurantExpansionAgent();
  }

  /**
   * Initialize all connectors
   */
  async initialize(): Promise<{
    success: boolean;
    connected: string[];
    failed: string[];
  }> {
    const connected: string[] = [];
    const failed: string[] = [];

    // Check each connector
    const checks = [
      { name: 'weather', fn: () => this.weather.healthCheck() },
      { name: 'qrTable', fn: () => this.qrTable.healthCheck() },
      { name: 'procurement', fn: () => this.procurement.healthCheck() },
      { name: 'restaurant', fn: () => this.restaurant.healthCheck() },
      { name: 'catering', fn: () => this.catering.healthCheck() },
      { name: 'wealth', fn: () => this.wealth.healthCheck() },
      { name: 'expansion', fn: () => this.expansion.healthCheck() }
    ];

    for (const check of checks) {
      try {
        const result = await check.fn();
        if (result.healthy) {
          connected.push(check.name);
        } else {
          failed.push(check.name);
        }
      } catch (e) {
        failed.push(check.name);
      }
    }

    return {
      success: failed.length === 0,
      connected,
      failed
    };
  }

  /**
   * Full health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
  }> {
    const checks = await Promise.allSettled([
      this.weather.healthCheck(),
      this.qrTable.healthCheck(),
      this.procurement.healthCheck(),
      this.restaurant.healthCheck(),
      this.catering.healthCheck(),
      this.wealth.healthCheck(),
      this.expansion.healthCheck()
    ]);

    const serviceNames = ['weather', 'qrTable', 'procurement', 'restaurant', 'catering', 'wealth', 'expansion'];
    const services: Record<string, boolean> = {};
    let healthy = true;

    checks.forEach((result, i) => {
      const name = serviceNames[i];
      if (result.status === 'fulfilled') {
        services[name] = result.value.healthy;
        if (!result.value.healthy) healthy = false;
      } else {
        services[name] = false;
        healthy = false;
      }
    });

    return { healthy, services };
  }
}

// Export singleton instance
export const waitronHub = new WaitronIntegrationHub();

export default WaitronIntegrationHub;