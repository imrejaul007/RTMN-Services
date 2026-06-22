/**
 * RTMN Database Service
 * Real PostgreSQL + Redis connections
 */

const { Pool } = require('pg');
const redis = require('redis').Redis;

class DatabaseService {
    constructor() {
        this.pools = {};
        this.redis = null;
        this.connected = false;
    }

    /**
     * Initialize all database connections
     */
    async initialize() {
        try {
            // PostgreSQL connection pools
            this.pools.sso = new Pool({
                host: process.env.SSO_DB_HOST || 'localhost',
                port: parseInt(process.env.SSO_DB_PORT) || 5432,
                user: process.env.SO_USER || 'rtmn',
                password: process.env.SSO_DB_PASSWORD || 'rtmn123',
                database: 'rtmn_sso',
                max: 20,
                idleTimeoutMillis: 30000,
            });

            this.pools.billing = new Pool({
                host: process.env.BILLING_DB_HOST || 'localhost',
                port: parseInt(process.env.BILLING_DB_PORT) || 5432,
                user: process.env.BILLING_DB_USER || 'rtmn',
                password: process.env.BILLING_DB_PASSWORD || 'rtmn123',
                database: 'rtmn_billing',
                max: 20,
                idleTimeoutMillis: 30000,
            });

            this.pools.integration = new Pool({
                host: process.env.INTEGRATION_DB_HOST || 'localhost',
                port: parseInt(process.env.INTEGRATION_DB_PORT) || 5432,
                user: process.env.INTEGRATION_DB_USER || 'rtmn',
                password: process.env.INTEGRATION_DB_PASSWORD || 'rtmn123',
                database: 'rtmn_integration',
                max: 20,
                idleTimeoutMillis: 30000,
            });

            // Test connections
            await Promise.all([
                this.pools.sso.query('SELECT 1'),
                this.pools.billing.query('SELECT 1'),
                this.pools.integration.query('SELECT 1'),
            ]);

            // Initialize Redis
            this.redis = new redis({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });
            await this.redis.connect();

            this.connected = true;
            console.log('All database connections established');

            // Initialize schemas
            await this.initializeSchemas();

        } catch (error) {
            console.error('Database initialization error:', error.message);
            this.connected = false;
            // Fall back to in-memory mode
            this.useInMemoryFallback();
        }
    }

    /**
     * Fallback to in-memory storage
     */
    useInMemoryFallback() {
        console.log('Using in-memory fallback mode');
        this.inMemory = {
            users: new Map(),
            tenants: new Map(),
            sessions: new Map(),
            customers: new Map(),
            subscriptions: new Map(),
            invoices: new Map(),
            transactions: new Map(),
            integrations: new Map(),
            integrationLogs: []
        };

        // Insert demo data
        this.insertDemoData();
    }

    /**
     * Insert demo data
     */
    insertDemoData() {
        // Demo tenant
        this.inMemory.tenants.set('default', {
            id: 'default',
            name: 'Default Tenant',
            domain: 'rtmn.com',
            createdAt: new Date().toISOString()
        });

        // Demo user
        this.inMemory.users.set('demo@rtmn.com', {
            id: 'user-demo-001',
            email: 'demo@rtmn.com',
            password: '$2a$10$demo', // bcrypt hash of 'demo123'
            name: 'Demo User',
            tenantId: 'default',
            providers: ['local'],
            createdAt: new Date().toISOString()
        });

        // Demo customer
        this.inMemory.customers.set('cust-001', {
            id: 'cust-001',
            name: 'Acme Corporation',
            email: 'billing@acme.com',
            phone: '+919876543210',
            company: 'Acme Corporation',
            gstin: '27AAACM1234C1ZB',
            createdAt: new Date().toISOString()
        });

        console.log('Demo data inserted (in-memory mode)');
    }

    /**
     * Initialize database schemas
     */
    async initializeSchemas() {
        // SSO Schema
        await this.pools.sso.query(`
            CREATE TABLE IF NOT EXISTS tenants (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                domain VARCHAR(255),
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL,
                password VARCHAR(255),
                name VARCHAR(255),
                tenant_id VARCHAR(100),
                providers TEXT[] DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP,
                UNIQUE(email, tenant_id)
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Billing Schema
        await this.pools.billing.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                company VARCHAR(255),
                address TEXT,
                gstin VARCHAR(50),
                pan VARCHAR(20),
                balance DECIMAL(15,2) DEFAULT 0,
                credit_limit DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS plans (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(15,2) NOT NULL,
                billing_cycle VARCHAR(20),
                products TEXT[],
                features TEXT[],
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
                plan_id VARCHAR(100),
                plan_name VARCHAR(255),
                billing_cycle VARCHAR(20),
                base_price DECIMAL(15,2),
                status VARCHAR(50) DEFAULT 'active',
                start_date TIMESTAMP,
                next_billing_date TIMESTAMP,
                products TEXT[],
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                customer_id UUID REFERENCES customers(id),
                subscription_id UUID REFERENCES subscriptions(id),
                items JSONB DEFAULT '[]',
                subtotal DECIMAL(15,2),
                cgst DECIMAL(15,2),
                sgst DECIMAL(15,2),
                total DECIMAL(15,2),
                currency VARCHAR(10) DEFAULT 'INR',
                status VARCHAR(50) DEFAULT 'pending',
                due_date TIMESTAMP,
                paid_at TIMESTAMP,
                payment_transaction_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Integration Schema
        await this.pools.integration.query(`
            CREATE TABLE IF NOT EXISTS integrations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                request_id UUID,
                tenant_id VARCHAR(100),
                source VARCHAR(100),
                target VARCHAR(100),
                status VARCHAR(50),
                data JSONB DEFAULT '{}',
                error TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS integration_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
                action VARCHAR(100),
                details JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Insert demo data
        await this.insertDemoDataToDb();
    }

    /**
     * Insert demo data to real databases
     */
    async insertDemoDataToDb() {
        try {
            // Demo tenant
            await this.pools.sso.query(`
                INSERT INTO tenants (id, name, domain)
                VALUES ('default', 'Default Tenant', 'rtmn.com')
                ON CONFLICT (id) DO NOTHING
            `);

            // Demo plans
            await this.pools.billing.query(`
                INSERT INTO plans (id, name, description, price, billing_cycle, products, features)
                VALUES
                    ('starter', 'Starter', 'For small teams', 5000, 'monthly', ARRAY['hojai', 'safeqr'], ARRAY['5 users', 'Basic support']),
                    ('growth', 'Growth', 'For growing businesses', 25000, 'monthly', ARRAY['hojai', 'rabtul', 'corpperks', 'safeqr'], ARRAY['50 users', 'Priority support']),
                    ('enterprise', 'Enterprise', 'For large organizations', 75000, 'monthly', ARRAY['hojai', 'rabtul', 'corpperks', 'adbazaar', 'safeqr', 'nexha'], ARRAY['Unlimited users', '24/7 support'])
                ON CONFLICT (id) DO NOTHING
            `);

            // Demo customer
            await this.pools.billing.query(`
                INSERT INTO customers (id, name, email, phone, company, gstin)
                VALUES ('cust-001', 'Acme Corporation', 'billing@acme.com', '+919876543210', 'Acme Corporation', '27AAACM1234C1ZB')
                ON CONFLICT (id) DO NOTHING
            `);

            console.log('Demo data inserted to databases');
        } catch (error) {
            console.log('Demo data insertion skipped:', error.message);
        }
    }

    // ====================
    // SSO Operations
    // ====================

    async createUser(userData) {
        if (!this.connected) {
            const id = `user-${Date.now()}`;
            this.inMemory.users.set(userData.email, { ...userData, id });
            return { id, ...userData };
        }

        const result = await this.pools.sso.query(
            `INSERT INTO users (email, password, name, tenant_id, providers)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userData.email, userData.password, userData.name, userData.tenantId, userData.providers]
        );
        return result.rows[0];
    }

    async findUserByEmail(email, tenantId) {
        if (!this.connected) {
            return this.inMemory.users.get(email);
        }

        const result = await this.pools.sso.query(
            `SELECT * FROM users WHERE email = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
            [email, tenantId]
        );
        return result.rows[0];
    }

    async createTenant(tenantData) {
        if (!this.connected) {
            this.inMemory.tenants.set(tenantData.id, tenantData);
            return tenantData;
        }

        const result = await this.pools.sso.query(
            `INSERT INTO tenants (id, name, domain, settings) VALUES ($1, $2, $3, $4) RETURNING *`,
            [tenantData.id, tenantData.name, tenantData.domain, JSON.stringify(tenantData.settings || {})]
        );
        return result.rows[0];
    }

    async findTenant(tenantId) {
        if (!this.connected) {
            return this.inMemory.tenants.get(tenantId);
        }

        const result = await this.pools.sso.query(
            `SELECT * FROM tenants WHERE id = $1`,
            [tenantId]
        );
        return result.rows[0];
    }

    // ====================
    // Billing Operations
    // ====================

    async createCustomer(customerData) {
        if (!this.connected) {
            const id = `cust-${Date.now()}`;
            const customer = { ...customerData, id };
            this.inMemory.customers.set(id, customer);
            return customer;
        }

        const result = await this.pools.billing.query(
            `INSERT INTO customers (name, email, phone, company, address, gstin, pan)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [customerData.name, customerData.email, customerData.phone, customerData.company,
             customerData.address, customerData.gstin, customerData.pan]
        );
        return result.rows[0];
    }

    async findCustomer(customerId) {
        if (!this.connected) {
            return this.inMemory.customers.get(customerId);
        }

        const result = await this.pools.billing.query(
            `SELECT * FROM customers WHERE id = $1`,
            [customerId]
        );
        return result.rows[0];
    }

    async getPlans() {
        if (!this.connected) {
            return [
                { id: 'starter', name: 'Starter', price: 5000, billing_cycle: 'monthly' },
                { id: 'growth', name: 'Growth', price: 25000, billing_cycle: 'monthly' },
                { id: 'enterprise', name: 'Enterprise', price: 75000, billing_cycle: 'monthly' }
            ];
        }

        const result = await this.pools.billing.query(`SELECT * FROM plans`);
        return result.rows;
    }

    async createSubscription(subscriptionData) {
        if (!this.connected) {
            const id = `sub-${Date.now()}`;
            const sub = { ...subscriptionData, id };
            this.inMemory.subscriptions.set(id, sub);
            return sub;
        }

        const result = await this.pools.billing.query(
            `INSERT INTO subscriptions (customer_id, plan_id, plan_name, billing_cycle, base_price, status, start_date, next_billing_date, products)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [subscriptionData.customerId, subscriptionData.planId, subscriptionData.planName,
             subscriptionData.billingCycle, subscriptionData.basePrice, 'active',
             new Date(), new Date(Date.now() + 30*24*60*60*1000), subscriptionData.products]
        );
        return result.rows[0];
    }

    async createInvoice(invoiceData) {
        if (!this.connected) {
            const id = `inv-${Date.now()}`;
            const invoice = { ...invoiceData, id };
            this.inMemory.invoices.set(id, invoice);
            return invoice;
        }

        const result = await this.pools.billing.query(
            `INSERT INTO invoices (invoice_number, customer_id, subscription_id, items, subtotal, cgst, sgst, total, currency, status, due_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [invoiceData.invoiceNumber, invoiceData.customerId, invoiceData.subscriptionId,
             JSON.stringify(invoiceData.items || []), invoiceData.subtotal, invoiceData.cgst,
             invoiceData.sgst, invoiceData.total, invoiceData.currency || 'INR', 'pending',
             new Date(Date.now() + 30*24*60*60*1000)]
        );
        return result.rows[0];
    }

    async updateInvoiceStatus(invoiceId, status, transactionId) {
        if (!this.connected) {
            const invoice = this.inMemory.invoices.get(invoiceId);
            if (invoice) {
                invoice.status = status;
                invoice.paidAt = status === 'paid' ? new Date().toISOString() : null;
                invoice.paymentTransactionId = transactionId;
            }
            return invoice;
        }

        const updateFields = status === 'paid'
            ? `status = $2, paid_at = NOW(), payment_transaction_id = $3`
            : `status = $2`;

        const params = status === 'paid'
            ? [invoiceId, status, transactionId]
            : [invoiceId, status];

        const result = await this.pools.billing.query(
            `UPDATE invoices SET ${updateFields} WHERE id = $1 RETURNING *`,
            params
        );
        return result.rows[0];
    }

    // ====================
    // Integration Operations
    // ====================

    async logIntegration(integrationData) {
        if (!this.connected) {
            const id = `int-${Date.now()}`;
            const log = { ...integrationData, id, createdAt: new Date().toISOString() };
            this.inMemory.integrationLogs.push(log);
            return log;
        }

        const result = await this.pools.integration.query(
            `INSERT INTO integrations (request_id, tenant_id, source, target, status, data)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [integrationData.requestId, integrationData.tenantId, integrationData.source,
             integrationData.target, integrationData.status, JSON.stringify(integrationData.data || {})]
        );
        return result.rows[0];
    }

    async logIntegrationAction(integrationId, action, details) {
        if (!this.connected) {
            return { integrationId, action, details };
        }

        await this.pools.integration.query(
            `INSERT INTO integration_logs (integration_id, action, details)
             VALUES ($1, $2, $3)`,
            [integrationId, action, JSON.stringify(details)]
        );
    }

    // ====================
    // Redis Operations
    // ====================

    async cacheSet(key, value, ttl = 3600) {
        if (!this.redis) return;
        await this.redis.setEx(key, ttl, JSON.stringify(value));
    }

    async cacheGet(key) {
        if (!this.redis) return null;
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
    }

    async cacheDelete(key) {
        if (!this.redis) return;
        await this.redis.del(key);
    }

    /**
     * Rate limiting
     */
    async checkRateLimit(key, maxRequests = 100, windowSeconds = 60) {
        if (!this.redis) return { allowed: true, remaining: maxRequests };

        const current = await this.redis.incr(key);
        if (current === 1) {
            await this.redis.expire(key, windowSeconds);
        }

        return {
            allowed: current <= maxRequests,
            remaining: Math.max(0, maxRequests - current),
            resetIn: await this.redis.ttl(key)
        };
    }

    /**
     * Session management
     */
    async createSession(sessionId, userId, ttl = 7 * 24 * 60 * 60) {
        if (!this.redis) {
            this.inMemory.sessions.set(sessionId, { userId, createdAt: Date.now() });
            return sessionId;
        }

        await this.redis.setEx(`session:${sessionId}`, ttl, userId);
        return sessionId;
    }

    async getSession(sessionId) {
        if (!this.redis) {
            return this.inMemory.sessions.get(sessionId);
        }

        return await this.redis.get(`session:${sessionId}`);
    }

    async deleteSession(sessionId) {
        if (!this.redis) {
            this.inMemory.sessions.delete(sessionId);
            return;
        }

        await this.redis.del(`session:${sessionId}`);
    }

    /**
     * Close all connections
     */
    async close() {
        if (this.pools.sso) await this.pools.sso.end();
        if (this.pools.billing) await this.pools.billing.end();
        if (this.pools.integration) await this.pools.integration.end();
        if (this.redis) await this.redis.quit();
        this.connected = false;
    }
}

// Singleton instance
const dbService = new DatabaseService();

module.exports = dbService;