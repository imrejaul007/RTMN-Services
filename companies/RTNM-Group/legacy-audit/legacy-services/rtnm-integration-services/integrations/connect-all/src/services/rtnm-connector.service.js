/**
 * RTNM Ecosystem Connector
 * Real integration with RTNM services
 */

const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/rtnm-connector.log' })
    ]
});

class RTNMConnector {
    constructor() {
        // Service URLs - these connect to actual RTNM services
        this.services = {
            // HOJAI AI - AI Platform
            hojai: {
                baseUrl: process.env.HOJAi_URL || 'http://localhost:4800',
                timeout: 30000,
                retries: 3
            },

            // RABTUL - Payment Infrastructure
            rabtul: {
                baseUrl: process.env.RABTUL_URL || 'http://localhost:4005',
                timeout: 15000,
                retries: 3
            },

            // CorpPerks - HRMS
            corpperks: {
                baseUrl: process.env.CORPPERKS_URL || 'http://localhost:4700',
                timeout: 15000,
                retries: 3
            },

            // AdBazaar - Marketing
            adbazaar: {
                baseUrl: process.env.ADBAZAAR_URL || 'http://localhost:4200',
                timeout: 15000,
                retries: 3
            },

            // SafeQR - Safety & Verification
            safeqr: {
                baseUrl: process.env.SAFEQR_URL || 'http://localhost:4001',
                timeout: 10000,
                retries: 3
            },

            // Nexha - Identity
            nexha: {
                baseUrl: process.env.NEXHA_URL || 'http://localhost:4100',
                timeout: 10000,
                retries: 3
            }
        };

        // Internal token for service-to-service communication
        this.internalToken = process.env.INTERNAL_SERVICE_TOKEN || 'rtmn-internal-token';
    }

    /**
     * Create HTTP client for a service
     */
    getClient(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }

        return axios.create({
            baseURL: service.baseUrl,
            timeout: service.timeout,
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Token': this.internalToken
            }
        });
    }

    /**
     * Call service with retry
     */
    async call(serviceName, method, path, data = null) {
        const client = this.getClient(serviceName);
        let lastError;

        for (let attempt = 1; attempt <= this.services[serviceName].retries; attempt++) {
            try {
                const response = await client[method](path, data);
                return {
                    success: true,
                    data: response.data,
                    service: serviceName
                };
            } catch (error) {
                lastError = error;
                logger.warn({
                    type: 'service_call_retry',
                    service: serviceName,
                    path,
                    attempt,
                    error: error.message
                });

                if (attempt < this.services[serviceName].retries) {
                    await this.delay(1000 * attempt);
                }
            }
        }

        return {
            success: false,
            error: lastError?.message || 'Service unavailable',
            service: serviceName
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ====================
    // RABTUL Operations
    // ====================

    /**
     * Create wallet for user
     */
    async createWallet(userId, name, email, phone, metadata = {}) {
        logger.info({ type: 'creating_wallet', userId, email });

        const result = await this.call('rabtul', 'post', '/api/wallet/create', {
            userId,
            name,
            email,
            phone,
            type: 'employee',
            metadata: {
                ...metadata,
                source: 'corpperks',
                createdBy: 'rtmn-integration'
            }
        });

        if (result.success) {
            logger.info({ type: 'wallet_created', userId, walletId: result.data?.id });
            return {
                service: 'rabtul',
                action: 'wallet_created',
                walletId: result.data?.id || result.data?.walletId,
                status: 'success'
            };
        }

        logger.error({ type: 'wallet_creation_failed', userId, error: result.error });
        return {
            service: 'rabtul',
            action: 'wallet_created',
            status: 'failed',
            error: result.error
        };
    }

    /**
     * Get wallet balance
     */
    async getWalletBalance(walletId) {
        const result = await this.call('rabtul', 'get', `/api/wallet/${walletId}/balance`);
        return result;
    }

    /**
     * Create payment
     */
    async createPayment(amount, orderId, customer, metadata = {}) {
        const result = await this.call('rabtul', 'post', '/api/payments/create', {
            amount,
            orderId,
            customer,
            currency: 'INR',
            metadata
        });
        return result;
    }

    /**
     * Process refund
     */
    async processRefund(paymentId, amount, reason) {
        const result = await this.call('rabtul', 'post', '/api/payments/refund', {
            paymentId,
            amount,
            reason
        });
        return result;
    }

    // ====================
    // CorpPerks Operations
    // ====================

    /**
     * Create employee
     */
    async createEmployee(employeeData) {
        logger.info({ type: 'creating_employee', email: employeeData.email });

        const result = await this.call('corpperks', 'post', '/api/employees', {
            name: employeeData.name,
            email: employeeData.email,
            phone: employeeData.phone,
            department: employeeData.department,
            role: employeeData.role,
            joinDate: employeeData.joinDate,
            salary: employeeData.salary,
            metadata: {
                source: 'rtmn-integration',
                tenantId: employeeData.tenantId
            }
        });

        if (result.success) {
            logger.info({ type: 'employee_created', employeeId: result.data?.id });
            return {
                service: 'corpperks',
                action: 'employee_created',
                employeeId: result.data?.id || result.data?.employeeId,
                status: 'success',
                data: result.data
            };
        }

        return {
            service: 'corpperks',
            action: 'employee_created',
            status: 'failed',
            error: result.error
        };
    }

    /**
     * Get employee
     */
    async getEmployee(employeeId) {
        const result = await this.call('corpperks', 'get', `/api/employees/${employeeId}`);
        return result;
    }

    /**
     * Run payroll
     */
    async runPayroll(month, year, employeeIds) {
        const result = await this.call('corpperks', 'post', '/api/payroll/run', {
            month,
            year,
            employees: employeeIds
        });
        return result;
    }

    // ====================
    // SafeQR Operations
    // ====================

    /**
     * Create safety badge
     */
    async createSafetyBadge(userId, name, email, phone, tenantId) {
        logger.info({ type: 'creating_safety_badge', userId });

        const result = await this.call('safeqr', 'post', '/api/safety/badge/create', {
            userId,
            name,
            email,
            phone,
            type: 'employee',
            tenantId,
            metadata: {
                source: 'corpperks',
                createdBy: 'rtmn-integration'
            }
        });

        if (result.success) {
            logger.info({ type: 'safety_badge_created', userId, badgeId: result.data?.id });
            return {
                service: 'safeqr',
                action: 'badge_created',
                badgeId: result.data?.id || result.data?.badgeId,
                status: 'success'
            };
        }

        return {
            service: 'safeqr',
            action: 'badge_created',
            status: 'failed',
            error: result.error
        };
    }

    /**
     * Generate QR code
     */
    async generateQR(type, entityId, metadata = {}) {
        const result = await this.call('safeqr', 'post', '/api/qr/generate', {
            type,
            entityId,
            metadata
        });
        return result;
    }

    /**
     * Verify QR code
     */
    async verifyQR(qrCode) {
        const result = await this.call('safeqr', 'post', '/api/qr/verify', { qrCode });
        return result;
    }

    // ====================
    // Nexha Operations
    // ====================

    /**
     * Create identity
     */
    async createIdentity(name, email, phone, type, metadata = {}) {
        logger.info({ type: 'creating_identity', email });

        const result = await this.call('nexha', 'post', '/api/entities', {
            type: type || 'person',
            name,
            email,
            phone,
            metadata: {
                ...metadata,
                source: 'rtmn-integration'
            }
        });

        if (result.success) {
            logger.info({ type: 'identity_created', entityId: result.data?.id });
            return {
                service: 'nexha',
                action: 'identity_created',
                entityId: result.data?.id || result.data?.entityId,
                status: 'success'
            };
        }

        return {
            service: 'nexha',
            action: 'identity_created',
            status: 'failed',
            error: result.error
        };
    }

    /**
     * Get trust score
     */
    async getTrustScore(entityId) {
        const result = await this.call('nexha', 'get', `/api/trust/${entityId}`);
        return result;
    }

    // ====================
    // HOJAI Operations
    // ====================

    /**
     * Chat with AI
     */
    async chat(message, context = {}) {
        const result = await this.call('hojai', 'post', '/api/chat', {
            message,
            context,
            source: 'rtmn-integration'
        });
        return result;
    }

    /**
     * Execute AI agent
     */
    async executeAgent(agentId, task, context = {}) {
        const result = await this.call('hojai', 'post', `/api/agents/${agentId}/execute`, {
            task,
            context,
            source: 'rtmn-integration'
        });
        return result;
    }

    // ====================
    // AdBazaar Operations
    // ====================

    /**
     * Create campaign
     */
    async createCampaign(campaignData) {
        const result = await this.call('adbazaar', 'post', '/api/campaigns', {
            ...campaignData,
            source: 'rtmn-integration'
        });
        return result;
    }

    /**
     * Get campaign analytics
     */
    async getCampaignAnalytics(campaignId, startDate, endDate) {
        const result = await this.call('adbazaar', 'get', `/api/campaigns/${campaignId}/analytics`, {
            params: { startDate, endDate }
        });
        return result;
    }

    // ====================
    // Health Check
    // ====================

    /**
     * Check all service health
     */
    async checkAllHealth() {
        const results = await Promise.allSettled(
            Object.entries(this.services).map(async ([name, service]) => {
                try {
                    const response = await axios.get(`${service.baseUrl}/health`, {
                        timeout: 5000,
                        headers: { 'X-Internal-Token': this.internalToken }
                    });
                    return {
                        service: name,
                        status: 'online',
                        response: response.data
                    };
                } catch (error) {
                    return {
                        service: name,
                        status: 'offline',
                        error: error.message
                    };
                }
            })
        );

        return results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
    }

    /**
     * Check specific service health
     */
    async checkServiceHealth(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            return { service: serviceName, status: 'unknown', error: 'Service not found' };
        }

        try {
            const response = await axios.get(`${service.baseUrl}/health`, {
                timeout: 5000
            });
            return {
                service: serviceName,
                status: 'online',
                response: response.data
            };
        } catch (error) {
            return {
                service: serviceName,
                status: 'offline',
                error: error.message
            };
        }
    }
}

// Singleton instance
const rtnmConnector = new RTNMConnector();

module.exports = { RTNMConnector, rtnmConnector };