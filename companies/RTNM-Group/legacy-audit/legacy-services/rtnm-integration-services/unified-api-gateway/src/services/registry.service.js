/**
 * Service Registry
 * Manages all RTMN services and their health
 */

const axios = require('axios');

class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.healthCache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    /**
     * Initialize registry with all RTMN services
     */
    initialize() {
        // Register all RTMN services
        this.registerService({
            name: 'hojai',
            displayName: 'HOJAI AI',
            description: 'AI platform with 600+ agents',
            baseUrl: process.env.HOJAi_URL || 'http://localhost:4800',
            healthEndpoint: '/health',
            category: 'ai'
        });

        this.registerService({
            name: 'rabtul',
            displayName: 'RABTUL Payments',
            description: 'Payment infrastructure',
            baseUrl: process.env.RABTUL_URL || 'http://localhost:4005',
            healthEndpoint: '/health',
            category: 'payments'
        });

        this.registerService({
            name: 'corpperks',
            displayName: 'CorpPerks HRMS',
            description: 'Human Resource Management System',
            baseUrl: process.env.CORPPERKS_URL || 'http://localhost:4700',
            healthEndpoint: '/health',
            category: 'hr'
        });

        this.registerService({
            name: 'adbazaar',
            displayName: 'AdBazaar Marketing',
            description: 'Marketing and advertising platform',
            baseUrl: process.env.ADBAZAAR_URL || 'http://localhost:4200',
            healthEndpoint: '/health',
            category: 'marketing'
        });

        this.registerService({
            name: 'safeqr',
            displayName: 'SafeQR',
            description: 'Safety and verification QR platform',
            baseUrl: process.env.SAFEQR_URL || 'http://localhost:4001',
            healthEndpoint: '/health',
            category: 'safety'
        });

        this.registerService({
            name: 'nexha',
            displayName: 'Nexha Identity',
            description: 'Universal identity graph',
            baseUrl: process.env.NEXHA_URL || 'http://localhost:4100',
            healthEndpoint: '/health',
            category: 'identity'
        });

        this.registerService({
            name: 'risacare',
            displayName: 'RisaCare Healthcare',
            description: 'Healthcare OS',
            baseUrl: process.env.RISACARE_URL || 'http://localhost:4700',
            healthEndpoint: '/health',
            category: 'healthcare'
        });

        this.registerService({
            name: 'risnaestate',
            displayName: 'RisnaEstate',
            description: 'Real estate platform',
            baseUrl: process.env.RISNAESTATE_URL || 'http://localhost:4100',
            healthEndpoint: '/health',
            category: 'realestate'
        });

        logger.info(Service registry initialized with ${this.services.size} services`);
    }

    /**
     * Register a service
     */
    registerService(service) {
        this.services.set(service.name, {
            ...service,
            registeredAt: new Date(),
            status: 'unknown'
        });
    }

    /**
     * Get all services
     */
    getAllServices() {
        return Array.from(this.services.values());
    }

    /**
     * Get service by name
     */
    getService(name) {
        return this.services.get(name);
    }

    /**
     * Check service health
     */
    async checkHealth(name) {
        const service = this.services.get(name);
        if (!service) return null;

        try {
            const start = Date.now();
            const response = await axios.get(
                `${service.baseUrl}${service.healthEndpoint}`,
                { timeout: 5000 }
            );
            const latency = Date.now() - start;

            const health = {
                name: service.name,
                status: 'online',
                latency,
                responseTime: response.headers['x-response-time'],
                timestamp: new Date().toISOString()
            };

            this.healthCache.set(name, health);
            return health;
        } catch (error) {
            const health = {
                name: service.name,
                status: 'offline',
                error: error.message,
                timestamp: new Date().toISOString()
            };

            this.healthCache.set(name, health);
            return health;
        }
    }

    /**
     * Get cached health
     */
    getCachedHealth(name) {
        const cached = this.healthCache.get(name);
        if (!cached) return null;

        const age = Date.now() - new Date(cached.timestamp).getTime();
        if (age > this.cacheTimeout) return null;

        return cached;
    }

    /**
     * Check all services health
     */
    async checkAllHealth() {
        const checks = await Promise.allSettled(
            Array.from(this.services.keys()).map(name => this.checkHealth(name))
        );

        return checks
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
    }

    /**
     * Get services by category
     */
    getByCategory(category) {
        return this.getAllServices().filter(s => s.category === category);
    }

    /**
     * Unregister service
     */
    unregister(name) {
        return this.services.delete(name);
    }
}

module.exports = { ServiceRegistry };
