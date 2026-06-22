/**
 * Service Registry - Tracks all services in the ecosystem
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Service Registry singleton
 */
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
  }

  /**
   * Register a service
   */
  register(service) {
    const entry = {
      id: service.id || uuidv4(),
      name: service.name,
      type: service.type, // 'industry', 'core', 'utility'
      industry: service.industry,
      url: service.url,
      healthUrl: service.healthUrl,
      status: 'unknown',
      lastCheck: null,
      metadata: service.metadata || {}
    };
    
    this.services.set(entry.id, entry);
    return entry.id;
  }

  /**
   * Unregister a service
   */
  unregister(serviceId) {
    return this.services.delete(serviceId);
  }

  /**
   * Get service by ID
   */
  get(serviceId) {
    return this.services.get(serviceId);
  }

  /**
   * Get all services
   */
  getAll() {
    return Array.from(this.services.values());
  }

  /**
   * Get services by type
   */
  getByType(type) {
    return this.getAll().filter(s => s.type === type);
  }

  /**
   * Get services by industry
   */
  getByIndustry(industry) {
    return this.getAll().filter(s => s.industry === industry);
  }

  /**
   * Get healthy services
   */
  getHealthy() {
    return this.getAll().filter(s => s.status === 'healthy');
  }

  /**
   * Update service status
   */
  updateStatus(serviceId, status) {
    const service = this.services.get(serviceId);
    if (service) {
      service.status = status;
      service.lastCheck = new Date().toISOString();
    }
    return service;
  }

  /**
   * Get registry status
   */
  getStatus() {
    const services = this.getAll();
    return {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
      unknown: services.filter(s => s.status === 'unknown').length
    };
  }

  /**
   * Initialize with default services
   */
  initializeDefaults() {
    const defaults = [
      // Core services
      { name: 'twin-os', type: 'core', industry: 'general', url: process.env.TWIN_OS_URL },
      { name: 'agent-os', type: 'core', industry: 'general', url: process.env.AGENT_OS_URL },
      { name: 'rez-crm', type: 'core', industry: 'general', url: process.env.REZ_CRM_URL },
      
      // Industry services
      { name: 'legal-os', type: 'industry', industry: 'legal', url: process.env.LEGAL_OS_URL },
      { name: 'healthcare-os', type: 'industry', industry: 'healthcare', url: process.env.HEALTHCARE_OS_URL },
      { name: 'finance-os', type: 'industry', industry: 'finance', url: process.env.FINANCE_OS_URL },
      { name: 'retail-os', type: 'industry', industry: 'retail', url: process.env.RETAIL_OS_URL },
      { name: 'education-os', type: 'industry', industry: 'education', url: process.env.EDUCATION_OS_URL },
      { name: 'manufacturing-os', type: 'industry', industry: 'manufacturing', url: process.env.MANUFACTURING_OS_URL },
      { name: 'realestate-os', type: 'industry', industry: 'realestate', url: process.env.REALESTATE_OS_URL },
      { name: 'travel-os', type: 'industry', industry: 'travel', url: process.env.TRAVEL_OS_URL },
      { name: 'restaurant-os', type: 'industry', industry: 'restaurant', url: process.env.RESTAURANT_OS_URL },
      { name: 'fitness-os', type: 'industry', industry: 'fitness', url: process.env.FITNESS_OS_URL },
      { name: 'automotive-os', type: 'industry', industry: 'automotive', url: process.env.AUTOMOTIVE_OS_URL },
      { name: 'entertainment-os', type: 'industry', industry: 'entertainment', url: process.env.ENTERTAINMENT_OS_URL },
      { name: 'gaming-os', type: 'industry', industry: 'gaming', url: process.env.GAMING_OS_URL },
      { name: 'agriculture-os', type: 'industry', industry: 'agriculture', url: process.env.AGRICULTURE_OS_URL },
      { name: 'construction-os', type: 'industry', industry: 'construction', url: process.env.CONSTRUCTION_OS_URL },
      { name: 'beauty-os', type: 'industry', industry: 'beauty', url: process.env.BEAUTY_OS_URL },
      { name: 'fashion-os', type: 'industry', industry: 'fashion', url: process.env.FASHION_OS_URL },
      { name: 'sports-os', type: 'industry', industry: 'sports', url: process.env.SPORTS_OS_URL },
      { name: 'government-os', type: 'industry', industry: 'government', url: process.env.GOVERNMENT_OS_URL },
      { name: 'homeservices-os', type: 'industry', industry: 'homeservices', url: process.env.HOMESERVICES_OS_URL },
      { name: 'professional-os', type: 'industry', industry: 'professional', url: process.env.PROFESSIONAL_OS_URL },
      { name: 'nonprofit-os', type: 'industry', industry: 'nonprofit', url: process.env.NONPROFIT_OS_URL },
      { name: 'media-os', type: 'industry', industry: 'media', url: process.env.MEDIA_OS_URL },
      { name: 'energy-os', type: 'industry', industry: 'energy', url: process.env.ENERGY_OS_URL }
    ];
    
    defaults.forEach(service => this.register(service));
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();

// Initialize with defaults
serviceRegistry.initializeDefaults();

export default serviceRegistry;
