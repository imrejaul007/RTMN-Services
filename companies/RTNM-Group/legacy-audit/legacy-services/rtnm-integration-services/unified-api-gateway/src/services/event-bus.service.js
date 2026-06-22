/**
 * Event Bus Service
 * Unified event system for RTMN
 * Enables real-time communication between services
 */

const EventEmitter = require('events');
const axios = require('axios');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.handlers = new Map();
        this.eventHistory = [];
        this.maxHistory = 1000;

        // Redis connection for distributed events
        this.redis = null;
        this.isConnected = false;
    }

    /**
     * Initialize event bus
     */
    async initialize(redisUrl) {
        try {
            // In production, connect to Redis for distributed events
            // this.redis = await redis.createClient({ url: redisUrl });
            // this.redis.connect();
            // this.isConnected = true;
            console.log('Event bus initialized');
        } catch (error) {
            console.error('Event bus initialization failed:', error);
            // Fall back to in-memory
            this.isConnected = false;
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {object} data - Event data
     */
    async emit(event, data) {
        const eventData = {
            event,
            data,
            timestamp: new Date().toISOString(),
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // Store in history
        this.addToHistory(eventData);

        // Emit locally
        this.emit(event, eventData);

        // Publish to Redis if connected
        if (this.isConnected && this.redis) {
            await this.redis.publish('events', JSON.stringify(eventData));
        }

        // Log event
        logger.info(Event emitted: ${event}`, eventData);

        return eventData;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function} handler - Event handler
     */
    on(event, handler) {
        // Store handler
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event).push(handler);

        // Also use EventEmitter
        super.on(event, handler);

        return () => this.off(event, handler);
    }

    /**
     * Subscribe once
     * @param {string} event - Event name
     * @param {function} handler - Event handler
     */
    once(event, handler) {
        super.once(event, handler);
        return () => this.off(event, handler);
    }

    /**
     * Unsubscribe from event
     * @param {string} event - Event name
     * @param {function} handler - Event handler
     */
    off(event, handler) {
        if (handler) {
            super.off(event, handler);
            const handlers = this.handlers.get(event);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) handlers.splice(index, 1);
            }
        } else {
            super.off(event);
            this.handlers.delete(event);
        }
    }

    /**
     * Add event to history
     */
    addToHistory(eventData) {
        this.eventHistory.push(eventData);
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }
    }

    /**
     * Get event history
     */
    getHistory(event, limit = 100) {
        let history = this.eventHistory;
        if (event) {
            history = history.filter(e => e.event === event);
        }
        return history.slice(-limit);
    }

    /**
     * Disconnect
     */
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
        }
        this.isConnected = false;
    }
}

// Predefined event types
const EventTypes = {
    // CorpPerks events
    CORPPERKS: {
        EMPLOYEE_CREATED: 'corpperks.employee.created',
        EMPLOYEE_UPDATED: 'corpperks.employee.updated',
        EMPLOYEE_DELETED: 'corpperks.employee.deleted',
        PAYROLL_COMPLETED: 'corpperks.payroll.completed',
        ATTENDANCE_MARKED: 'corpperks.attendance.marked'
    },

    // RABTUL events
    RABTUL: {
        PAYMENT_CREATED: 'rabtul.payment.created',
        PAYMENT_COMPLETED: 'rabtul.payment.completed',
        PAYMENT_FAILED: 'rabtul.payment.failed',
        WALLET_CREATED: 'rabtul.wallet.created',
        WALLET_TOPUP: 'rabtul.wallet.topup',
        WALLET_TRANSFER: 'rabtul.wallet.transfer',
        BNPL_ORDER_CREATED: 'rabtul.bnpl.order.created'
    },

    // AdBazaar events
    ADBAZAAR: {
        CAMPAIGN_CREATED: 'adbazaar.campaign.created',
        CAMPAIGN_STARTED: 'adbazaar.campaign.started',
        CAMPAIGN_ENDED: 'adbazaar.campaign.ended',
        CAMPAIGN_GOAL_MET: 'adbazaar.campaign.goal_met',
        INFLUENCER_ENROLLED: 'adbazaar.influencer.enrolled'
    },

    // SafeQR events
    SAFEQR: {
        QR_SCANNED: 'safeqr.qr.scanned',
        QR_VERIFIED: 'safeqr.qr.verified',
        WARRANTY_REGISTERED: 'safeqr.warranty.registered',
        SAFETY_ALERT: 'safeqr.safety.alert'
    },

    // Nexha events
    NEXHA: {
        ENTITY_CREATED: 'nexha.entity.created',
        ENTITY_UPDATED: 'nexha.entity.updated',
        TRUST_UPDATED: 'nexha.trust.updated',
        IDENTITY_LINKED: 'nexha.identity.linked'
    },

    // HOJAI events
    HOJAi: {
        CHAT_COMPLETED: 'hojai.chat.completed',
        AGENT_EXECUTED: 'hojai.agent.executed',
        PREDICTION_GENERATED: 'hojai.prediction.generated'
    }
};

// Predefined handlers
const EventHandlers = {
    // CorpPerks → RABTUL integration
    async [EventTypes.CORPPERKS.EMPLOYEE_CREATED](event) {
        console.log('Handling employee created:', event.data);
        // Create wallet for new employee
        // This would call RABTUL service
    },

    // SafeQR → RABTUL integration
    async [EventTypes.SAFEQR.QR_SCANNED](event) {
        console.log('Handling QR scanned:', event.data);
        // Award loyalty points
    }
};

module.exports = { EventBus, EventTypes, EventHandlers };
