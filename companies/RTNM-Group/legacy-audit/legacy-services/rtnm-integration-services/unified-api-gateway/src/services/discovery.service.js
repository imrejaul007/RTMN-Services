/**
 * Service Discovery & Registry
 * Maps RTMN product routes to actual RTNM ecosystem services
 *
 * This file connects the RTMN gateway to the real RTNM ecosystem
 */

const axios = require('axios');

// Service registry - maps service names to actual URLs
const SERVICE_REGISTRY = {
    // HOJAI AI - 600+ AI agents
    hojai: {
        name: 'HOJAI AI',
        version: '1.0.0',
        baseUrl: process.env.HOJAi_URL || 'http://localhost:4800',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'AI platform with 600+ specialized agents for all industries'
    },

    // RABTUL Technologies - Payment Infrastructure
    rabtul: {
        name: 'RABTUL Payments',
        version: '1.0.0',
        baseUrl: process.env.RABTUL_URL || 'http://localhost:4005',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Payment infrastructure - UPI, Cards, Wallet, BNPL, Business Payments'
    },

    // CorpPerks - HRMS
    corpperks: {
        name: 'CorpPerks HRMS',
        version: '1.0.0',
        baseUrl: process.env.CORPPERKS_URL || 'http://localhost:4700',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Complete HRMS - Payroll, Attendance, Onboarding, Performance, Learning'
    },

    // AdBazaar - Marketing
    adbazaar: {
        name: 'AdBazaar Marketing',
        version: '1.0.0',
        baseUrl: process.env.ADBAZAAR_URL || 'http://localhost:4200',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Marketing automation - Campaigns, Influencers, DOOH, Social Media'
    },

    // SafeQR - Safety & Verification
    safeqr: {
        name: 'SafeQR',
        version: '1.0.0',
        baseUrl: process.env.SAFEQR_URL || 'http://localhost:4001',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Safety, Verification, Loyalty - QR codes for products, people, places'
    },

    // Nexha - Identity Graph
    nexha: {
        name: 'Nexha Identity',
        version: '1.0.0',
        baseUrl: process.env.NEXHA_URL || 'http://localhost:4100',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Universal identity graph and trust scoring across ecosystem'
    },

    // RisaCare - Healthcare
    risacare: {
        name: 'RisaCare Healthcare',
        version: '1.0.0',
        baseUrl: process.env.RISACARE_URL || 'http://localhost:4700',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Healthcare OS - Patients, Appointments, Medical Records, Telemedicine'
    },

    // RisnaEstate - Real Estate
    risnaestate: {
        name: 'RisnaEstate',
        version: '1.0.0',
        baseUrl: process.env.RISNAESTATE_URL || 'http://localhost:4100',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Real Estate CRM - Leads, Properties, Site Visits, Agreements'
    },

    // AssetMind - Financial Intelligence
    assetmind: {
        name: 'AssetMind',
        version: '1.0.0',
        baseUrl: process.env.ASSETMIND_URL || 'http://localhost:5001',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Financial Intelligence - Bloomberg/TradingView competitor'
    },

    // LawGens - Legal AI
    lawgens: {
        name: 'LawGens Legal',
        version: '1.0.0',
        baseUrl: process.env.LAWGENS_URL || 'http://localhost:5099',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Legal AI - Harvey AI competitor for Indian legal services'
    },

    // HIB - Security Intelligence
    hib: {
        name: 'HIB Security',
        version: '1.0.0',
        baseUrl: process.env.HIB_URL || 'http://localhost:3055',
        healthEndpoint: '/health',
        docs: '/api/docs',
        description: 'Security Intelligence - Palantir + CrowdStrike competitor'
    }
};

// Route mappings - which service handles which routes
const ROUTE_MAPPINGS = {
    '/api/v1/hojai': 'hojai',
    '/api/v1/rabtul': 'rabtul',
    '/api/v1/corpperks': 'corpperks',
    '/api/v1/adbazaar': 'adbazaar',
    '/api/v1/safeqr': 'safeqr',
    '/api/v1/nexha': 'nexha',
    '/api/v1/risacare': 'risacare',
    '/api/v1/risnaestate': 'risnaestate',
    '/api/v1/assetmind': 'assetmind',
    '/api/v1/lawgens': 'lawgens',
    '/api/v1/hib': 'hib'
};

class ServiceDiscovery {
    constructor() {
        this.services = SERVICE_REGISTRY;
        this.routeMappings = ROUTE_MAPPINGS;
        this.healthCache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    /**
     * Get service by route
     */
    getServiceByRoute(route) {
        for (const [prefix, serviceId] of Object.entries(this.routeMappings)) {
            if (route.startsWith(prefix)) {
                return this.services[serviceId];
            }
        }
        return null;
    }

    /**
     * Get service by ID
     */
    getService(serviceId) {
        return this.services[serviceId];
    }

    /**
     * Get all services
     */
    getAllServices() {
        return Object.entries(this.services).map(([id, service]) => ({
            id,
            ...service
        }));
    }

    /**
     * Check service health
     */
    async checkHealth(serviceId) {
        const service = this.services[serviceId];
        if (!service) return null;

        // Check cache
        const cached = this.healthCache.get(serviceId);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached;
        }

        try {
            const start = Date.now();
            const response = await axios.get(
                `${service.baseUrl}${service.healthEndpoint}`,
                { timeout: 5000 }
            );

            const health = {
                serviceId,
                status: 'online',
                latency: Date.now() - start,
                response: response.data,
                timestamp: new Date().toISOString()
            };

            this.healthCache.set(serviceId, health);
            return health;
        } catch (error) {
            const health = {
                serviceId,
                status: 'offline',
                error: error.message,
                timestamp: new Date().toISOString()
            };

            this.healthCache.set(serviceId, health);
            return health;
        }
    }

    /**
     * Check all services health
     */
    async checkAllHealth() {
        const results = await Promise.allSettled(
            Object.keys(this.services).map(id => this.checkHealth(id))
        );

        return results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
    }

    /**
     * Register a new service
     */
    registerService(serviceId, config) {
        this.services[serviceId] = {
            name: config.name,
            version: config.version || '1.0.0',
            baseUrl: config.baseUrl,
            healthEndpoint: config.healthEndpoint || '/health',
            docs: config.docs,
            description: config.description || ''
        };

        if (config.routes) {
            config.routes.forEach(route => {
                this.routeMappings[route] = serviceId;
            });
        }
    }

    /**
     * Get service documentation URL
     */
    getDocsUrl(serviceId) {
        const service = this.services[serviceId];
        return service ? `${service.baseUrl}${service.docs}` : null;
    }

    /**
     * Get gateway route for service
     */
    getGatewayRoute(serviceId) {
        for (const [route, sid] of Object.entries(this.routeMappings)) {
            if (sid === serviceId) {
                return route;
            }
        }
        return null;
    }
}

// Export singleton instance
const serviceDiscovery = new ServiceDiscovery();

module.exports = {
    ServiceDiscovery,
    serviceDiscovery,
    SERVICE_REGISTRY,
    ROUTE_MAPPINGS
};