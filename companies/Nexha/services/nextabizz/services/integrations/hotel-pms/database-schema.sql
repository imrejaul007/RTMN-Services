-- Hotel PMS Integration Database Schema
-- Run this SQL in Supabase to create the required tables

-- ============================================================================
-- Hotel PMS Connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS hotel_pms_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    hotel_pms_hotel_id VARCHAR(255) NOT NULL,
    hotel_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    api_secret VARCHAR(500) NOT NULL,
    base_url VARCHAR(500) DEFAULT 'https://api.hotelpms.example.com/v1',
    webhook_url VARCHAR(500) NOT NULL,
    webhook_secret VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_id, hotel_pms_hotel_id)
);

-- Index for looking up connections by hotel ID
CREATE INDEX IF NOT EXISTS idx_hotel_pms_connections_hotel_id ON hotel_pms_connections(hotel_pms_hotel_id);

-- Index for merchant lookups
CREATE INDEX IF NOT EXISTS idx_hotel_pms_connections_merchant ON hotel_pms_connections(merchant_id);

-- ============================================================================
-- Hotel PMS Service Requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS hotel_pms_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES hotel_pms_connections(id) ON DELETE CASCADE,
    hotel_pms_request_id VARCHAR(255) NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('plumbing', 'electrical', 'hvac', 'cleaning', 'laundry', 'general')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
    location VARCHAR(255) NOT NULL,
    room_number VARCHAR(50),
    estimated_cost DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    vendor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    last_synced_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, hotel_pms_request_id)
);

-- Index for syncing
CREATE INDEX IF NOT EXISTS idx_service_requests_sync ON hotel_pms_service_requests(connection_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_service_requests_rfq ON hotel_pms_service_requests(rfq_id);

-- ============================================================================
-- Hotel Laundry Configs
-- ============================================================================
CREATE TABLE IF NOT EXISTS hotel_laundry_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES hotel_pms_connections(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    daily_volume DECIMAL(10, 2),
    unit VARCHAR(20) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'pieces')),
    preferred_vendor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id)
);

-- ============================================================================
-- Hotel Laundry Requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS hotel_laundry_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_laundry_config_id UUID NOT NULL REFERENCES hotel_laundry_configs(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('kg', 'pieces')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_progress', 'delivered', 'completed')),
    pickup_date TIMESTAMPTZ,
    delivery_date TIMESTAMPTZ,
    notes TEXT,
    rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for laundry request lookups
CREATE INDEX IF NOT EXISTS idx_laundry_requests_config ON hotel_laundry_requests(hotel_laundry_config_id);
CREATE INDEX IF NOT EXISTS idx_laundry_requests_status ON hotel_laundry_requests(status);

-- ============================================================================
-- Hotel PMS Sync Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS hotel_pms_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES hotel_pms_connections(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL DEFAULT 'full' CHECK (sync_type IN ('full', 'incremental', 'webhook')),
    synced_requests INTEGER DEFAULT 0,
    created_rfqs INTEGER DEFAULT 0,
    errors TEXT[],
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sync log lookups
CREATE INDEX IF NOT EXISTS idx_sync_logs_connection ON hotel_pms_sync_logs(connection_id, created_at DESC);

-- ============================================================================
-- Webhook Events (for audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    hotel_id VARCHAR(255),
    connection_id UUID REFERENCES hotel_pms_connections(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    success BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for webhook event lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_connection ON webhook_events(connection_id) WHERE connection_id IS NOT NULL;

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE hotel_pms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_pms_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_laundry_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_laundry_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_pms_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policies for hotel_pms_connections
CREATE POLICY "Merchants can view their own connections"
    ON hotel_pms_connections FOR SELECT
    USING (merchant_id = (SELECT id FROM merchants WHERE auth.uid()::text = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Service role can manage connections"
    ON hotel_pms_connections FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for service requests
CREATE POLICY "Merchants can view their own service requests"
    ON hotel_pms_service_requests FOR SELECT
    USING (merchant_id = (SELECT id FROM merchants WHERE auth.uid()::text = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Service role can manage service requests"
    ON hotel_pms_service_requests FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for laundry configs
CREATE POLICY "Merchants can view their own laundry configs"
    ON hotel_laundry_configs FOR SELECT
    USING (merchant_id = (SELECT id FROM merchants WHERE auth.uid()::text = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Service role can manage laundry configs"
    ON hotel_laundry_configs FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for laundry requests
CREATE POLICY "Merchants can view their own laundry requests"
    ON hotel_laundry_requests FOR SELECT
    USING (merchant_id = (SELECT id FROM merchants WHERE auth.uid()::text = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Service role can manage laundry requests"
    ON hotel_laundry_requests FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for sync logs (read-only for merchants)
CREATE POLICY "Merchants can view their own sync logs"
    ON hotel_pms_sync_logs FOR SELECT
    USING (connection_id IN (
        SELECT id FROM hotel_pms_connections
        WHERE merchant_id = (SELECT id FROM merchants WHERE auth.uid()::text = current_setting('request.jwt.claims', true)::json->>'sub')
    ));

CREATE POLICY "Service role can manage sync logs"
    ON hotel_pms_sync_logs FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for webhook events (read-only for merchants)
CREATE POLICY "Merchants can view their own webhook events"
    ON webhook_events FOR SELECT
    USING (connection_id IN (
        SELECT id FROM hotel_pms_connections
        WHERE merchant_id = (SELECT id FROM merchants WHERE auth.uid()::text = current_setting('request.jwt.claims', true)::json->>'sub')
    ));

CREATE POLICY "Service role can manage webhook events"
    ON webhook_events FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotel_pms_connections_updated_at
    BEFORE UPDATE ON hotel_pms_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_pms_service_requests_updated_at
    BEFORE UPDATE ON hotel_pms_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_laundry_configs_updated_at
    BEFORE UPDATE ON hotel_laundry_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_laundry_requests_updated_at
    BEFORE UPDATE ON hotel_laundry_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
