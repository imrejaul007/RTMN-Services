-- RTMN Database Initialization Script
-- Creates all required databases and users

-- Create RTMN user
CREATE USER rtmn WITH PASSWORD 'rtmn123';

-- Create databases
CREATE DATABASE rtmn_sso;
CREATE DATABASE rtmn_billing;
CREATE DATABASE rtmn_integration;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rtmn_sso TO rtmn;
GRANT ALL PRIVILEGES ON DATABASE rtmn_billing TO rtmn;
GRANT ALL PRIVILEGES ON DATABASE rtmn_integration TO rtmn;

-- Connect to SSO database
\c rtmn_sso

-- SSO Schema
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active'
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

CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert demo tenant
INSERT INTO tenants (id, name, domain) VALUES ('default', 'Default Tenant', 'rtmn.com')
ON CONFLICT (id) DO NOTHING;

-- Connect to Billing database
\c rtmn_billing

-- Billing Schema
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

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50),
    invoice_id UUID REFERENCES invoices(id),
    customer_id UUID REFERENCES customers(id),
    amount DECIMAL(15,2),
    currency VARCHAR(10),
    method VARCHAR(50),
    status VARCHAR(50),
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert demo plans
INSERT INTO plans (id, name, description, price, billing_cycle, products, features) VALUES
    ('starter', 'Starter', 'For small teams', 5000, 'monthly', ARRAY['hojai', 'safeqr'], ARRAY['5 users', 'Basic support']),
    ('growth', 'Growth', 'For growing businesses', 25000, 'monthly', ARRAY['hojai', 'rabtul', 'corpperks', 'safeqr'], ARRAY['50 users', 'Priority support']),
    ('enterprise', 'Enterprise', 'For large organizations', 75000, 'monthly', ARRAY['hojai', 'rabtul', 'corpperks', 'adbazaar', 'safeqr', 'nexha'], ARRAY['Unlimited users', '24/7 support'])
ON CONFLICT (id) DO NOTHING;

-- Insert demo customer
INSERT INTO customers (id, name, email, phone, company, gstin) VALUES
    ('cust-001', 'Acme Corporation', 'billing@acme.com', '+919876543210', 'Acme Corporation', '27AAACM1234C1ZB')
ON CONFLICT (id) DO NOTHING;

-- Connect to Integration database
\c rtmn_integration

-- Integration Schema
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID,
    tenant_id VARCHAR(100),
    source VARCHAR(100),
    target VARCHAR(100),
    status VARCHAR(50),
    request_data JSONB,
    response_data JSONB,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    action VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integration_logs ON integration_logs(integration_id);