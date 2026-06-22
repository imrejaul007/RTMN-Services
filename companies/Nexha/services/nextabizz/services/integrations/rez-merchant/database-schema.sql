-- REZ Merchant Integration Database Schema
-- Creates tables for REZ Merchant connection and sync records

-- ============================================================================
-- REZ Merchant Connections Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rez_merchant_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    rez_merchant_store_id VARCHAR(255) NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    base_url TEXT DEFAULT 'https://api.rezmerchant.example.com/v1',
    webhook_url TEXT,
    webhook_secret TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint per merchant/store combination
    UNIQUE(merchant_id, rez_merchant_store_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_rez_merchant_connections_merchant_id ON rez_merchant_connections(merchant_id);
CREATE INDEX IF NOT EXISTS idx_rez_merchant_connections_store_id ON rez_merchant_connections(rez_merchant_store_id);
CREATE INDEX IF NOT EXISTS idx_rez_merchant_connections_status ON rez_merchant_connections(status);

-- ============================================================================
-- Order Sync Records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_sync_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES rez_merchant_connections(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    source_order_id VARCHAR(255) NOT NULL,
    source_order_number VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50),
    total DECIMAL(12, 2) DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    customer_name VARCHAR(255),
    shipping_address TEXT,
    metadata JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint per connection/order combination
    UNIQUE(connection_id, source_order_id)
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_order_sync_records_connection_id ON order_sync_records(connection_id);
CREATE INDEX IF NOT EXISTS idx_order_sync_records_merchant_id ON order_sync_records(merchant_id);
CREATE INDEX IF NOT EXISTS idx_order_sync_records_status ON order_sync_records(status);
CREATE INDEX IF NOT EXISTS idx_order_sync_records_synced_at ON order_sync_records(synced_at);

-- ============================================================================
-- Maintenance Sync Records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_sync_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES rez_merchant_connections(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    source_request_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    estimated_cost DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    location VARCHAR(500),
    room_number VARCHAR(50),
    reported_at TIMESTAMPTZ NOT NULL,
    scheduled_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    vendor_id VARCHAR(255),
    rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
    metadata JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint per connection/maintenance request combination
    UNIQUE(connection_id, source_request_id)
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_maintenance_sync_records_connection_id ON maintenance_sync_records(connection_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_sync_records_merchant_id ON maintenance_sync_records(merchant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_sync_records_status ON maintenance_sync_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_sync_records_priority ON maintenance_sync_records(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_sync_records_reported_at ON maintenance_sync_records(reported_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_sync_records_rfq_id ON maintenance_sync_records(rfq_id);

-- ============================================================================
-- Trigger: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to rez_merchant_connections
DROP TRIGGER IF EXISTS update_rez_merchant_connections_updated_at ON rez_merchant_connections;
CREATE TRIGGER update_rez_merchant_connections_updated_at
    BEFORE UPDATE ON rez_merchant_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE rez_merchant_connections IS 'Stores REZ Merchant API connection configurations';
COMMENT ON COLUMN rez_merchant_connections.rez_merchant_store_id IS 'Store ID in REZ Merchant system';
COMMENT ON COLUMN rez_merchant_connections.webhook_secret IS 'Secret for verifying incoming webhook signatures';
COMMENT ON COLUMN rez_merchant_connections.status IS 'Connection status: connected, disconnected, error, syncing';

COMMENT ON TABLE order_sync_records IS 'Tracks synced orders from REZ Merchant';
COMMENT ON COLUMN order_sync_records.source_order_id IS 'Original order ID in REZ Merchant';
COMMENT ON COLUMN order_sync_records.shipping_address IS 'Concatenated shipping address string';

COMMENT ON TABLE maintenance_sync_records IS 'Tracks synced maintenance requests from REZ Merchant';
COMMENT ON COLUMN maintenance_sync_records.source_request_id IS 'Original maintenance request ID in REZ Merchant';
COMMENT ON COLUMN maintenance_sync_records.rfq_id IS 'Optional link to RFQ created for this maintenance request';
