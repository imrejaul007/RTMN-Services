/**
 * Service Registry - Centralized service endpoint management
 *
 * Maintains URLs and connection info for all REZ services across companies.
 */

import axios, { AxiosInstance } from 'axios';

export interface ServiceEndpoint {
  id: string;
  name: string;
  company: 'RABTUL' | 'REZ-Intelligence' | 'REZ-Media' | 'REZ-Consumer' | 'REZ-Merchant' | 'External';
  category: string;
  url: string;
  authHeader?: string;
  timeout: number;
  healthCheck?: string;
}

export class ServiceRegistry {
  private services: Map<string, ServiceEndpoint> = new Map();
  private clients: Map<string, AxiosInstance> = new Map();

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    const services: ServiceEndpoint[] = [
      // ===== RABTUL Platform (Infrastructure) =====
      {
        id: 'rabtul-auth',
        name: 'Auth Service',
        company: 'RABTUL',
        category: 'auth',
        url: process.env.RABTUL_AUTH_URL || 'http://localhost:4002',
        timeout: 5000,
        healthCheck: '/api/auth/health'
      },
      {
        id: 'rabtul-payment',
        name: 'Payment Service',
        company: 'RABTUL',
        category: 'payment',
        url: process.env.RABTUL_PAYMENT_URL || 'http://localhost:4001',
        timeout: 10000,
        healthCheck: '/api/payment/health'
      },
      {
        id: 'rabtul-wallet',
        name: 'Wallet Service',
        company: 'RABTUL',
        category: 'wallet',
        url: process.env.RABTUL_WALLET_URL || 'http://localhost:4004',
        timeout: 5000,
        healthCheck: '/api/wallet/health'
      },
      {
        id: 'rabtul-order',
        name: 'Order Service',
        company: 'RABTUL',
        category: 'commerce',
        url: process.env.RABTUL_ORDER_URL || 'http://localhost:4006',
        timeout: 5000,
        healthCheck: '/api/orders/health'
      },
      {
        id: 'rabtul-notifications',
        name: 'Notifications Service',
        company: 'RABTUL',
        category: 'notifications',
        url: process.env.RABTUL_NOTIFICATIONS_URL || 'http://localhost:4011',
        timeout: 5000,
        healthCheck: '/api/notifications/health'
      },
      {
        id: 'rabtul-profile',
        name: 'Profile Service',
        company: 'RABTUL',
        category: 'profile',
        url: process.env.RABTUL_PROFILE_URL || 'http://localhost:4013',
        timeout: 5000,
        healthCheck: '/api/profiles/health'
      },
      {
        id: 'rabtul-gamification',
        name: 'Gamification Service',
        company: 'RABTUL',
        category: 'gamification',
        url: process.env.RABTUL_GAMIFICATION_URL || 'http://localhost:4041',
        timeout: 5000,
        healthCheck: '/api/gamification/health'
      },

      // ===== REZ-Intelligence (AI/ML) =====
      {
        id: 'rez-intent-predictor',
        name: 'Intent Predictor',
        company: 'REZ-Intelligence',
        category: 'ai',
        url: process.env.REZ_INTENT_URL || 'http://localhost:4018',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-identity-graph',
        name: 'Identity Graph',
        company: 'REZ-Intelligence',
        category: 'identity',
        url: process.env.REZ_IDENTITY_GRAPH_URL || 'http://localhost:4050',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-predictive-engine',
        name: 'Predictive Engine',
        company: 'REZ-Intelligence',
        category: 'ai',
        url: process.env.REZ_PREDICTIVE_URL || 'https://REZ-predictive-engine.onrender.com',
        timeout: 10000,
        healthCheck: '/health'
      },
      {
        id: 'rez-unified-profile',
        name: 'Unified Profile',
        company: 'REZ-Intelligence',
        category: 'profile',
        url: process.env.REZ_UNIFIED_PROFILE_URL || 'http://localhost:4120',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-care-service',
        name: 'REZ Care Service',
        company: 'REZ-Intelligence',
        category: 'support',
        url: process.env.REZ_CARE_URL || 'http://localhost:4055',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-merchant-intelligence',
        name: 'Merchant Intelligence',
        company: 'REZ-Intelligence',
        category: 'analytics',
        url: process.env.REZ_MERCHANT_INTEL_URL || 'http://localhost:4122',
        timeout: 5000,
        healthCheck: '/health'
      },

      // Expert Services
      {
        id: 'rez-fitness-expert',
        name: 'Fitness Expert',
        company: 'REZ-Intelligence',
        category: 'expert',
        url: process.env.REZ_FITNESS_EXPERT_URL || 'http://localhost:3010',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-salon-expert',
        name: 'Salon Expert',
        company: 'REZ-Intelligence',
        category: 'expert',
        url: process.env.REZ_SALON_EXPERT_URL || 'http://localhost:3005',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-travel-expert',
        name: 'Travel Expert',
        company: 'REZ-Intelligence',
        category: 'expert',
        url: process.env.REZ_TRAVEL_EXPERT_URL || 'http://localhost:3003',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-health-expert',
        name: 'Health Expert',
        company: 'REZ-Intelligence',
        category: 'expert',
        url: process.env.REZ_HEALTH_EXPERT_URL || 'http://localhost:3011',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-hospitality-expert',
        name: 'Hospitality Expert',
        company: 'REZ-Intelligence',
        category: 'expert',
        url: process.env.REZ_HOSPITALITY_EXPERT_URL || 'http://localhost:3000',
        timeout: 5000,
        healthCheck: '/health'
      },

      // ===== REZ-Media (Marketing) =====
      {
        id: 'rez-ad-ai',
        name: 'Ad AI Service',
        company: 'REZ-Media',
        category: 'advertising',
        url: process.env.REZ_AD_AI_URL || 'http://localhost:4021',
        timeout: 10000,
        healthCheck: '/health'
      },
      {
        id: 'rez-karma-service',
        name: 'Karma Service',
        company: 'REZ-Media',
        category: 'loyalty',
        url: process.env.REZ_KARMA_URL || 'http://localhost:4068',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-dooh-service',
        name: 'DOOH Service',
        company: 'REZ-Media',
        category: 'advertising',
        url: process.env.REZ_DOOH_URL || 'http://localhost:4018',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-engagement',
        name: 'Engagement Platform',
        company: 'REZ-Media',
        category: 'engagement',
        url: process.env.REZ_ENGAGEMENT_URL || 'http://localhost:4017',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-adbazaar',
        name: 'AdBazaar Service',
        company: 'REZ-Media',
        category: 'advertising',
        url: process.env.REZ_ADBAZAAR_URL || 'http://localhost:4068',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'rez-lead-intelligence',
        name: 'Lead Intelligence',
        company: 'REZ-Media',
        category: 'analytics',
        url: process.env.REZ_LEAD_INTEL_URL || 'http://localhost:4019',
        timeout: 5000,
        healthCheck: '/health'
      },

      // ===== BuzzLocal (Local) =====
      {
        id: 'buzzlocal-ask',
        name: 'BuzzLocal Ask Service',
        company: 'REZ-Consumer',
        category: 'local',
        url: process.env.BUZZLOCAL_ASK_URL || 'http://localhost:4015',
        timeout: 10000,
        healthCheck: '/health'
      },
      {
        id: 'buzzlocal-trust',
        name: 'BuzzLocal Trust Service',
        company: 'REZ-Consumer',
        category: 'local',
        url: process.env.BUZZLOCAL_TRUST_URL || 'http://localhost:4016',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'buzzlocal-safety',
        name: 'BuzzLocal Safety Service',
        company: 'REZ-Consumer',
        category: 'local',
        url: process.env.BUZZLOCAL_SAFETY_URL || 'http://localhost:4017',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'buzzlocal-agency',
        name: 'BuzzLocal Agency Service',
        company: 'REZ-Consumer',
        category: 'local',
        url: process.env.BUZZLOCAL_AGENCY_URL || 'http://localhost:4018',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'buzzlocal-society',
        name: 'BuzzLocal Society Service',
        company: 'REZ-Consumer',
        category: 'local',
        url: process.env.BUZZLOCAL_SOCIETY_URL || 'http://localhost:4019',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'buzzlocal-marketplace',
        name: 'BuzzLocal Marketplace',
        company: 'REZ-Consumer',
        category: 'local',
        url: process.env.BUZZLOCAL_MARKETPLACE_URL || 'http://localhost:4020',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'buzzlocal-offers',
        name: 'BuzzLocal Merchant Offers',
        company: 'REZ-Consumer',
        category: 'local',
        url: process.env.BUZZLOCAL_OFFERS_URL || 'http://localhost:4023',
        timeout: 5000,
        healthCheck: '/health'
      },
      {
        id: 'buzzlocal-services-local',
        name: 'BuzzLocal Local Services',
        company: 'REZ-Consumer',
        category: 'local',
        url: process.env.BUZZLOCAL_SERVICES_URL || 'http://localhost:4024',
        timeout: 5000,
        healthCheck: '/health'
      },

      // ===== REZ-Merchant =====
      {
        id: 'rez-merchant-service',
        name: 'Merchant Service',
        company: 'REZ-Merchant',
        category: 'commerce',
        url: process.env.REZ_MERCHANT_URL || 'http://localhost:3001',
        timeout: 5000,
        healthCheck: '/api/health'
      },
      {
        id: 'rez-kds',
        name: 'Kitchen Display System',
        company: 'REZ-Merchant',
        category: 'operations',
        url: process.env.REZ_KDS_URL || 'http://localhost:3002',
        timeout: 5000,
        healthCheck: '/health'
      },
    ];

    // Register all services
    services.forEach(service => this.register(service));
  }

  register(service: ServiceEndpoint) {
    this.services.set(service.id, service);

    // Create axios client for this service
    const client = axios.create({
      baseURL: service.url,
      timeout: service.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || '',
        'X-Service-Name': 'rez-integration-hub',
      }
    });

    this.clients.set(service.id, client);
  }

  get(serviceId: string): ServiceEndpoint | undefined {
    return this.services.get(serviceId);
  }

  getClient(serviceId: string): AxiosInstance | undefined {
    return this.clients.get(serviceId);
  }

  getByCategory(category: string): ServiceEndpoint[] {
    return Array.from(this.services.values()).filter(s => s.category === category);
  }

  getByCompany(company: string): ServiceEndpoint[] {
    return Array.from(this.services.values()).filter(s => s.company === company);
  }

  async call(serviceId: string, method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any): Promise<any> {
    const client = this.clients.get(serviceId);
    if (!client) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    try {
      const response = await client.request({
        method,
        url: path,
        data
      });
      return response.data;
    } catch (error: any) {
      console.error(`Service call failed: ${serviceId}${path}`, error.message);
      throw error;
    }
  }

  async healthCheck(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId);
    if (!service || !service.healthCheck) return false;

    try {
      const client = this.clients.get(serviceId);
      if (!client) return false;

      await client.get(service.healthCheck);
      return true;
    } catch {
      return false;
    }
  }

  async getAllHealth(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const serviceId of this.services.keys()) {
      results.set(serviceId, await this.healthCheck(serviceId));
    }

    return results;
  }

  listAll(): ServiceEndpoint[] {
    return Array.from(this.services.values());
  }
}
