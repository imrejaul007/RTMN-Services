/**
 * HOJAI Industry AI - Integration Index
 *
 * Re-exports all connectors for easy importing
 */

export { RestaurantConnector, type RestaurantConnectorConfig } from './restaurant-connector';
export { SalonConnector, type SalonConnectorConfig } from './salon-connector';
export { HotelConnector, type HotelConnectorConfig } from './hotel-connector';
export { FitnessConnector, type FitnessConnectorConfig } from './fitness-connector';
export { RetailConnector, type RetailConnectorConfig } from './retail-connector';
export { HealthcareConnector, type HealthcareConnectorConfig } from './healthcare-connector';

/**
 * Factory function to create connector based on client type
 */
export function createConnector(
  industry: 'restaurant' | 'salon' | 'hotel' | 'fitness' | 'retail' | 'healthcare',
  config: {
    useREZServices: boolean;
    rezApiKey?: string;
    rezBaseUrl?: string;
  }
) {
  switch (industry) {
    case 'restaurant':
      return new RestaurantConnector(config);
    case 'salon':
      return new SalonConnector(config);
    case 'hotel':
      return new HotelConnector(config);
    case 'fitness':
      return new FitnessConnector(config);
    case 'retail':
      return new RetailConnector(config);
    case 'healthcare':
      return new HealthcareConnector(config);
    default:
      throw new Error(`Unknown industry: ${industry}`);
  }
}


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'integrations',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe (for Kubernetes)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
app.get('/health/ready', async (req, res) => {
  try {
    // Add readiness checks here (DB connection, etc.)
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
