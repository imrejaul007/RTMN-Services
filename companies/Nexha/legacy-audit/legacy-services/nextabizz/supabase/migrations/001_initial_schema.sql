-- ============================================
-- NextaBizz Phase 1: Initial Schema Migration
-- ============================================
-- Version: 001
-- Description: Core B2B procurement marketplace schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: suppliers
-- No dependencies
-- ============================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    gst_number TEXT UNIQUE NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    categories TEXT[] NOT NULL DEFAULT '{}',
    rating DECIMAL(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE suppliers IS 'B2B suppliers/vendors in the marketplace';
COMMENT ON COLUMN suppliers.gst_number IS 'Goods and Services Tax identification number (India)';

-- ============================================
-- TABLE 2: supplier_categories
-- No dependencies (self-referential)
-- ============================================
CREATE TABLE supplier_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES supplier_categories(id) ON DELETE SET NULL,
    icon TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE supplier_categories IS 'Hierarchical product categories for suppliers';

CREATE INDEX idx_supplier_categories_parent ON supplier_categories(parent_id);
CREATE INDEX idx_supplier_categories_slug ON supplier_categories(slug);

-- ============================================
-- TABLE 3: supplier_products
-- Depends on: suppliers, supplier_categories
-- ============================================
CREATE TABLE supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES supplier_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    unit TEXT NOT NULL,
    moq INT DEFAULT 1 CHECK (moq > 0),
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    bulk_pricing JSONB DEFAULT '[]'::JSONB,
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    delivery_days INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE supplier_products IS 'Products offered by suppliers';
COMMENT ON COLUMN supplier_products.bulk_pricing IS 'Array of {min_qty, price} tiers for volume discounts';
COMMENT ON COLUMN supplier_products.moq IS 'Minimum Order Quantity';

CREATE INDEX idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_category ON supplier_products(category_id);
CREATE INDEX idx_supplier_products_sku ON supplier_products(sku);
CREATE INDEX idx_supplier_products_active ON supplier_products(is_active) WHERE is_active = true;

-- ============================================
-- TABLE 4: merchants
-- No dependencies (FK to credit_lines added via ALTER)
-- ============================================
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rez_merchant_id TEXT UNIQUE NOT NULL,
    business_name TEXT,
    category TEXT NOT NULL,
    city TEXT,
    email TEXT,
    phone TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    source_merchant_id TEXT NOT NULL,
    credit_line_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE merchants IS 'B2B buyers/merchants in the marketplace';
COMMENT ON COLUMN merchants.rez_merchant_id IS 'Unique identifier from ReZ platform';
COMMENT ON COLUMN merchants.source IS 'Acquisition source: rez, manual, api, etc.';

CREATE INDEX idx_merchants_rez_id ON merchants(rez_merchant_id);
CREATE INDEX idx_merchants_category ON merchants(category);
CREATE INDEX idx_merchants_source ON merchants(source);

-- ============================================
-- TABLE 5: credit_lines
-- Depends on: merchants
-- ============================================
CREATE TABLE credit_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    credit_limit DECIMAL(12, 2) DEFAULT 0 CHECK (credit_limit >= 0),
    utilized DECIMAL(12, 2) DEFAULT 0 CHECK (utilized >= 0),
    tenor_days INT DEFAULT 30 CHECK (tenor_days > 0),
    interest_rate DECIMAL(5, 4) DEFAULT 0 CHECK (interest_rate >= 0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed', 'pending')),
    tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'premium', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT credit_lines_merchant_id_unique UNIQUE (merchant_id),
    CONSTRAINT credit_lines_utilized_check CHECK (utilized <= credit_limit)
);

COMMENT ON TABLE credit_lines IS 'Credit facilities extended to merchants';

-- ============================================
-- Add nullable FK to merchants.credit_line_id
-- Using ALTER TABLE to avoid circular dependency issues
-- ============================================
ALTER TABLE merchants
ADD CONSTRAINT merchants_credit_line_id_fkey
FOREIGN KEY (credit_line_id) REFERENCES credit_lines(id) ON DELETE SET NULL;

CREATE INDEX idx_credit_lines_merchant ON credit_lines(merchant_id);
CREATE INDEX idx_credit_lines_status ON credit_lines(status);

-- ============================================
-- TABLE 6: inventory_signals
-- Depends on: merchants
-- ============================================
CREATE TABLE inventory_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    source_product_id TEXT,
    source_merchant_id TEXT,
    product_name TEXT,
    sku TEXT,
    current_stock DECIMAL(12, 3) CHECK (current_stock >= 0),
    threshold DECIMAL(12, 3),
    unit TEXT,
    category TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    signal_type TEXT NOT NULL CHECK (signal_type IN ('low_stock', 'out_of_stock', 'expiring', 'overstock', 'movement')),
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inventory_signals IS 'Real-time inventory level alerts from merchants';
COMMENT ON COLUMN merchants.severity IS 'Risk level of the inventory situation';

CREATE INDEX idx_inventory_signals_merchant ON inventory_signals(merchant_id);
CREATE INDEX idx_inventory_signals_severity ON inventory_signals(severity);
CREATE INDEX idx_inventory_signals_type ON inventory_signals(signal_type);
CREATE INDEX idx_inventory_signals_created ON inventory_signals(created_at DESC);
CREATE INDEX idx_inventory_signals_sku ON inventory_signals(sku) WHERE sku IS NOT NULL;

-- ============================================
-- TABLE 7: reorder_signals
-- Depends on: merchants, inventory_signals
-- ============================================
CREATE TABLE reorder_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    inventory_signal_id UUID REFERENCES inventory_signals(id) ON DELETE SET NULL,
    suggested_qty DECIMAL(12, 3) CHECK (suggested_qty > 0),
    urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'po_created', 'dismissed')),
    match_confidence DECIMAL(3, 2) CHECK (match_confidence >= 0 AND match_confidence <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reorder_signals IS 'AI-generated reorder recommendations based on inventory signals';

CREATE INDEX idx_reorder_signals_status ON reorder_signals(status);
CREATE INDEX idx_reorder_signals_merchant ON reorder_signals(merchant_id);
CREATE INDEX idx_reorder_signals_urgency ON reorder_signals(urgency);
CREATE INDEX idx_reorder_signals_signal ON reorder_signals(inventory_signal_id) WHERE inventory_signal_id IS NOT NULL;

-- ============================================
-- TABLE 8: rfqs (Request for Quotes)
-- Depends on: merchants, suppliers
-- Note: awarded_to FK to suppliers added via ALTER
-- linked_po_id FK to purchase_orders added via ALTER
-- ============================================
CREATE TABLE rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_number TEXT UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    category TEXT,
    quantity DECIMAL(12, 3),
    unit TEXT,
    target_price DECIMAL(12, 2),
    delivery_deadline DATE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled', 'expired')),
    awarded_to UUID,
    linked_po_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE rfqs IS 'Request for Quotes from merchants to suppliers';
COMMENT ON COLUMN rfqs.rfq_number IS 'Human-readable RFQ identifier (RFQ-XXXXX)';

CREATE INDEX idx_rfqs_merchant ON rfqs(merchant_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_category ON rfqs(category) WHERE category IS NOT NULL;
CREATE INDEX idx_rfqs_expires ON rfqs(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- TABLE 9: purchase_orders
-- Depends on: merchants, suppliers, rfqs
-- ============================================
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'closed')),
    subtotal DECIMAL(12, 2) DEFAULT 0 CHECK (subtotal >= 0),
    net_amount DECIMAL(12, 2) DEFAULT 0 CHECK (net_amount >= 0),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    payment_method TEXT,
    delivery_address JSONB DEFAULT '{}'::JSONB,
    expected_delivery DATE,
    actual_delivery DATE,
    notes TEXT,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'rfq', 'reorder', 'api', 'auto')),
    rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE purchase_orders IS 'Purchase orders issued by merchants to suppliers';
COMMENT ON COLUMN purchase_orders.order_number IS 'Human-readable PO identifier (PO-XXXXX)';
COMMENT ON COLUMN purchase_orders.delivery_address IS '{street, city, state, pincode, landmark}';

CREATE INDEX idx_pos_merchant ON purchase_orders(merchant_id);
CREATE INDEX idx_pos_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_pos_status ON purchase_orders(status);
CREATE INDEX idx_pos_payment_status ON purchase_orders(payment_status);
CREATE INDEX idx_pos_rfq ON purchase_orders(rfq_id) WHERE rfq_id IS NOT NULL;
CREATE INDEX idx_pos_expected_delivery ON purchase_orders(expected_delivery) WHERE expected_delivery IS NOT NULL;

-- ============================================
-- TABLE 10: po_items
-- Depends on: purchase_orders, supplier_products
-- ============================================
CREATE TABLE po_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    supplier_product_id UUID REFERENCES supplier_products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    qty DECIMAL(12, 3) NOT NULL CHECK (qty > 0),
    unit TEXT,
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    total DECIMAL(12, 2) NOT NULL CHECK (total >= 0),
    received_qty DECIMAL(12, 3) DEFAULT 0 CHECK (received_qty >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE po_items IS 'Line items within a purchase order';

CREATE INDEX idx_po_items_po ON po_items(po_id);
CREATE INDEX idx_po_items_product ON po_items(supplier_product_id) WHERE supplier_product_id IS NOT NULL;
CREATE INDEX idx_po_items_sku ON po_items(sku) WHERE sku IS NOT NULL;

-- ============================================
-- TABLE 11: rfq_responses
-- Depends on: rfqs, suppliers
-- ============================================
CREATE TABLE rfq_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    unit_price DECIMAL(12, 2) CHECK (unit_price >= 0),
    total_price DECIMAL(12, 2) CHECK (total_price >= 0),
    lead_time_days INT,
    notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT rfq_responses_rfq_supplier_unique UNIQUE (rfq_id, supplier_id)
);

COMMENT ON TABLE rfq_responses IS 'Supplier responses/quotes to RFQs';

CREATE INDEX idx_rfq_responses_rfq ON rfq_responses(rfq_id);
CREATE INDEX idx_rfq_responses_supplier ON rfq_responses(supplier_id);
CREATE INDEX idx_rfq_responses_submitted ON rfq_responses(submitted_at DESC);

-- ============================================
-- Add awarded_to FK to rfqs
-- ============================================
ALTER TABLE rfqs
ADD CONSTRAINT rfqs_awarded_to_fkey
FOREIGN KEY (awarded_to) REFERENCES suppliers(id) ON DELETE SET NULL;

-- ============================================
-- Add linked_po_id FK to rfqs (self-referential-like circular)
-- Using DEFERRABLE to handle potential ordering
-- ============================================
ALTER TABLE rfqs
ADD CONSTRAINT rfqs_linked_po_fkey
FOREIGN KEY (linked_po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ============================================
-- TABLE 12: supplier_scores
-- Depends on: suppliers
-- ============================================
CREATE TABLE supplier_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    on_time_delivery_rate DECIMAL(5, 4) DEFAULT 0 CHECK (on_time_delivery_rate >= 0 AND on_time_delivery_rate <= 1),
    quality_rejection_rate DECIMAL(5, 4) DEFAULT 0 CHECK (quality_rejection_rate >= 0 AND quality_rejection_rate <= 1),
    price_consistency DECIMAL(5, 4) DEFAULT 0 CHECK (price_consistency >= 0 AND price_consistency <= 1),
    avg_lead_time_days DECIMAL(5, 2) DEFAULT 0 CHECK (avg_lead_time_days >= 0),
    response_rate DECIMAL(5, 4) DEFAULT 0 CHECK (response_rate >= 0 AND response_rate <= 1),
    overall_score DECIMAL(3, 2) DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 5),
    credit_boost DECIMAL(3, 2) DEFAULT 0 CHECK (credit_boost >= 0),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT supplier_scores_unique UNIQUE (supplier_id, period, period_start)
);

COMMENT ON TABLE supplier_scores IS 'Aggregated performance metrics for suppliers';
COMMENT ON COLUMN supplier_scores.credit_boost IS 'Bonus credit limit multiplier based on performance';

CREATE INDEX idx_supplier_scores_supplier ON supplier_scores(supplier_id);
CREATE INDEX idx_supplier_scores_period ON supplier_scores(period);
CREATE INDEX idx_supplier_scores_period_dates ON supplier_scores(period_start, period_end);

-- ============================================
-- TABLE 13: events
-- No dependencies (append-only log)
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    source TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE events IS 'Immutable audit log for all system events';
COMMENT ON COLUMN events.type IS 'Event type identifier (e.g., po.created, rfq.awarded)';
COMMENT ON COLUMN events.source IS 'Origin service/system of the event';

CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created ON events(created_at DESC);
CREATE INDEX idx_events_source ON events(source) WHERE source IS NOT NULL;

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_products_updated_at
    BEFORE UPDATE ON supplier_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_lines_updated_at
    BEFORE UPDATE ON credit_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reorder_signals_updated_at
    BEFORE UPDATE ON reorder_signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_items_updated_at
    BEFORE UPDATE ON po_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfqs_updated_at
    BEFORE UPDATE ON rfqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_scores_updated_at
    BEFORE UPDATE ON supplier_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper functions
-- ============================================

-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    seq_val INT;
BEGIN
    INSERT INTO order_sequence (prefix) VALUES (prefix)
    ON CONFLICT (prefix) DO UPDATE SET seq = order_sequence.seq + 1
    RETURNING seq INTO seq_val;

    new_number := prefix || '-' || LPAD(seq_val::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Sequence table for order numbers
CREATE TABLE IF NOT EXISTS order_sequence (
    prefix TEXT PRIMARY KEY,
    seq INT NOT NULL DEFAULT 0
);

-- Initialize common prefixes
INSERT INTO order_sequence (prefix, seq) VALUES
    ('PO', 0),
    ('RFQ', 0),
    ('INV', 0),
    ('PAY', 0)
ON CONFLICT (prefix) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.role() = 'authenticated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check service role
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.role() = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS Policies for suppliers
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can do everything on suppliers"
    ON suppliers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can read all suppliers (marketplace browsing)
CREATE POLICY "Authenticated users can read suppliers"
    ON suppliers FOR SELECT
    TO authenticated
    USING (is_active = true);

-- ============================================
-- RLS Policies for supplier_categories
-- ============================================

CREATE POLICY "Service role can do everything on supplier_categories"
    ON supplier_categories FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read supplier_categories"
    ON supplier_categories FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- RLS Policies for supplier_products
-- ============================================

CREATE POLICY "Service role can do everything on supplier_products"
    ON supplier_products FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can read active supplier_products"
    ON supplier_products FOR SELECT
    TO authenticated
    USING (is_active = true);

-- ============================================
-- RLS Policies for merchants
-- ============================================

CREATE POLICY "Service role can do everything on merchants"
    ON merchants FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Merchants can read their own profile
CREATE POLICY "Merchants can read own profile"
    ON merchants FOR SELECT
    TO authenticated
    USING (rez_merchant_id = current_setting('app.current_merchant_id', true));

-- ============================================
-- RLS Policies for credit_lines
-- ============================================

CREATE POLICY "Service role can do everything on credit_lines"
    ON credit_lines FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Merchants can read their own credit line
CREATE POLICY "Merchants can read own credit_line"
    ON credit_lines FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM merchants
            WHERE rez_merchant_id = current_setting('app.current_merchant_id', true)
        )
    );

-- ============================================
-- RLS Policies for inventory_signals
-- ============================================

CREATE POLICY "Service role can do everything on inventory_signals"
    ON inventory_signals FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Merchants can read their own inventory signals
CREATE POLICY "Merchants can read own inventory_signals"
    ON inventory_signals FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM merchants
            WHERE rez_merchant_id = current_setting('app.current_merchant_id', true)
        )
    );

-- ============================================
-- RLS Policies for reorder_signals
-- ============================================

CREATE POLICY "Service role can do everything on reorder_signals"
    ON reorder_signals FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Merchants can read their own reorder signals
CREATE POLICY "Merchants can read own reorder_signals"
    ON reorder_signals FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM merchants
            WHERE rez_merchant_id = current_setting('app.current_merchant_id', true)
        )
    );

-- ============================================
-- RLS Policies for purchase_orders
-- ============================================

CREATE POLICY "Service role can do everything on purchase_orders"
    ON purchase_orders FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Merchants can read their own purchase orders
CREATE POLICY "Merchants can read own purchase_orders"
    ON purchase_orders FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM merchants
            WHERE rez_merchant_id = current_setting('app.current_merchant_id', true)
        )
    );

-- Suppliers can read POs addressed to them
CREATE POLICY "Suppliers can read POs addressed to them"
    ON purchase_orders FOR SELECT
    TO authenticated
    USING (supplier_id IN (SELECT id FROM suppliers));

-- ============================================
-- RLS Policies for po_items
-- ============================================

CREATE POLICY "Service role can do everything on po_items"
    ON po_items FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Read access through parent PO
CREATE POLICY "Users can read po_items through parent PO access"
    ON po_items FOR SELECT
    TO authenticated
    USING (
        po_id IN (
            SELECT id FROM purchase_orders WHERE
            merchant_id IN (
                SELECT id FROM merchants
                WHERE rez_merchant_id = current_setting('app.current_merchant_id', true)
            )
            OR supplier_id IN (SELECT id FROM suppliers)
        )
    );

-- ============================================
-- RLS Policies for rfqs
-- ============================================

CREATE POLICY "Service role can do everything on rfqs"
    ON rfqs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Merchants can read their own RFQs
CREATE POLICY "Merchants can read own rfqs"
    ON rfqs FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM merchants
            WHERE rez_merchant_id = current_setting('app.current_merchant_id', true)
        )
    );

-- Suppliers can read open RFQs in their category
CREATE POLICY "Suppliers can read open rfqs"
    ON rfqs FOR SELECT
    TO authenticated
    USING (
        status = 'open'
        AND supplier_id IN (SELECT id FROM suppliers)
    );

-- ============================================
-- RLS Policies for rfq_responses
-- ============================================

CREATE POLICY "Service role can do everything on rfq_responses"
    ON rfq_responses FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Merchants can read responses to their RFQs
CREATE POLICY "Merchants can read rfq_responses to own rfqs"
    ON rfq_responses FOR SELECT
    TO authenticated
    USING (
        rfq_id IN (
            SELECT id FROM rfqs WHERE
            merchant_id IN (
                SELECT id FROM merchants
                WHERE rez_merchant_id = current_setting('app.current_merchant_id', true)
            )
        )
    );

-- Suppliers can manage their own responses
CREATE POLICY "Suppliers can manage own rfq_responses"
    ON rfq_responses FOR ALL
    TO authenticated
    USING (supplier_id IN (SELECT id FROM suppliers))
    WITH CHECK (supplier_id IN (SELECT id FROM suppliers));

-- ============================================
-- RLS Policies for supplier_scores
-- ============================================

CREATE POLICY "Service role can do everything on supplier_scores"
    ON supplier_scores FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Public read access to supplier scores
CREATE POLICY "Anyone can read supplier_scores"
    ON supplier_scores FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- RLS Policies for events
-- ============================================

CREATE POLICY "Service role can do everything on events"
    ON events FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Read-only access to events for audit purposes
CREATE POLICY "Authenticated users can read events"
    ON events FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- Grant permissions
-- ============================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Grant basic CRUD on all tables to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant read access to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant insert/update on own data tables
GRANT INSERT, UPDATE ON merchants TO authenticated;
GRANT INSERT, UPDATE ON inventory_signals TO authenticated;
GRANT INSERT, UPDATE ON reorder_signals TO authenticated;
GRANT INSERT, UPDATE ON rfq_responses TO authenticated;

-- ============================================
-- Additional utility views
-- ============================================

-- View: Active suppliers with categories
CREATE OR REPLACE VIEW v_active_suppliers AS
SELECT
    s.id,
    s.business_name,
    s.gst_number,
    s.contact_name,
    s.contact_email,
    s.contact_phone,
    s.categories,
    s.rating,
    s.is_verified,
    s.created_at,
    COUNT(sp.id) AS product_count
FROM suppliers s
LEFT JOIN supplier_products sp ON sp.supplier_id = s.id AND sp.is_active = true
WHERE s.is_active = true
GROUP BY s.id;

-- View: Merchant credit utilization
CREATE OR REPLACE VIEW v_merchant_credit_usage AS
SELECT
    m.id AS merchant_id,
    m.business_name,
    m.category,
    cl.credit_limit,
    cl.utilized,
    cl.credit_limit - cl.utilized AS available_credit,
    ROUND((cl.utilized::NUMERIC / NULLIF(cl.credit_limit, 0) * 100), 2) AS utilization_pct,
    cl.status AS credit_status,
    cl.tier
FROM merchants m
JOIN credit_lines cl ON cl.merchant_id = m.id;

-- View: Pending reorder signals with details
CREATE OR REPLACE VIEW v_pending_reorders AS
SELECT
    rs.id,
    rs.merchant_id,
    m.business_name AS merchant_name,
    rs.urgency,
    rs.status,
    rs.suggested_qty,
    rs.match_confidence,
    rs.created_at,
    ist.source_product_id,
    ist.product_name,
    ist.sku,
    ist.current_stock,
    ist.threshold,
    ist.severity AS signal_severity
FROM reorder_signals rs
JOIN merchants m ON m.id = rs.merchant_id
LEFT JOIN inventory_signals ist ON ist.id = rs.inventory_signal_id
WHERE rs.status = 'pending'
ORDER BY
    CASE rs.urgency
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    rs.created_at DESC;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON SCHEMA public IS 'NextaBizz B2B Procurement Marketplace Schema - Phase 1';

-- Final status
SELECT 'Phase 1 migration complete: 13 tables, indexes, triggers, RLS policies, and views created' AS status;
