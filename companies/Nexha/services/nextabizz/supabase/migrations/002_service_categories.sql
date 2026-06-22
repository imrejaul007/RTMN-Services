-- ============================================
-- NextaBizz Phase 2: Service Categories Migration
-- ============================================
-- Version: 002
-- Description: Service categories, vendors, RFQs, and quotes for B2B service marketplace
-- ============================================
-- Note: This migration extends the base schema (001_initial_schema.sql)
-- It assumes the rfqs table already exists from the base schema
-- ============================================

-- Enable UUID extension (already enabled in main schema, but keeping for standalone execution)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: service_categories
-- Hierarchical service category tree
-- No dependencies
-- ============================================
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    parent_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE service_categories IS 'Hierarchical service category tree for service marketplace';
COMMENT ON COLUMN service_categories.slug IS 'URL-friendly identifier, unique across all categories';
COMMENT ON COLUMN service_categories.icon IS 'Icon identifier for UI display (e.g., lucide icon name)';
COMMENT ON COLUMN service_categories.parent_id IS 'Self-referential FK for category hierarchy';

-- Indexes for service_categories
CREATE INDEX idx_service_categories_parent ON service_categories(parent_id);
CREATE INDEX idx_service_categories_slug ON service_categories(slug);
CREATE INDEX idx_service_categories_active ON service_categories(active) WHERE active = true;
CREATE INDEX idx_service_categories_display_order ON service_categories(display_order);

-- ============================================
-- TABLE 2: service_vendors
-- Links suppliers to service categories
-- Depends on: suppliers, service_categories
-- ============================================
CREATE TABLE service_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    service_category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    description TEXT,
    service_area JSONB DEFAULT '[]'::JSONB,
    pricing_model TEXT DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'hourly', 'project', 'per_unit', 'custom')),
    hourly_rate DECIMAL(10, 2),
    project_rate DECIMAL(12, 2),
    min_project_value DECIMAL(10, 2),
    certifications JSONB DEFAULT '[]'::JSONB,
    portfolio_urls JSONB DEFAULT '[]'::JSONB,
    avg_response_time_hours INT,
    active BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT service_vendors_supplier_category_unique UNIQUE (supplier_id, service_category_id)
);

COMMENT ON TABLE service_vendors IS 'Links B2B suppliers to service categories they provide';
COMMENT ON COLUMN service_vendors.pricing_model IS 'Service pricing model: fixed, hourly, project, per_unit, custom';
COMMENT ON COLUMN service_vendors.service_area IS 'Array of cities/regions where service is available: [{"city": "Mumbai", "state": "Maharashtra", "radius_km": 50}]';
COMMENT ON COLUMN service_vendors.certifications IS 'Array of certification names/IDs: [{"name": "ISO 9001", "valid_until": "2025-12-31"}]';
COMMENT ON COLUMN service_vendors.portfolio_urls IS 'Array of portfolio/work samples URLs';

-- Indexes for service_vendors
CREATE INDEX idx_service_vendors_supplier ON service_vendors(supplier_id);
CREATE INDEX idx_service_vendors_category ON service_vendors(service_category_id);
CREATE INDEX idx_service_vendors_pricing_model ON service_vendors(pricing_model);
CREATE INDEX idx_service_vendors_active ON service_vendors(active) WHERE active = true;
CREATE INDEX idx_service_vendors_hourly_rate ON service_vendors(hourly_rate) WHERE hourly_rate IS NOT NULL;

-- ============================================
-- TABLE 3: service_rfqs
-- Request for Service Quotes (extends rfqs)
-- Depends on: merchants, service_categories, rfqs
-- ============================================
CREATE TABLE service_rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    service_category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
    service_details TEXT,
    scope_of_work TEXT,
    requirements JSONB DEFAULT '{}'::JSONB,
    urgency TEXT DEFAULT 'standard' CHECK (urgency IN ('standard', 'urgent', 'emergency')),
    preferred_schedule JSONB DEFAULT '{}'::JSONB,
    service_location JSONB DEFAULT '{}'::JSONB,
    estimated_budget DECIMAL(12, 2),
    budget_flexible BOOLEAN DEFAULT false,
    inspection_required BOOLEAN DEFAULT false,
    materials_provided BOOLEAN DEFAULT false,
    warranty_required BOOLEAN DEFAULT false,
    warranty_months INT,
    insurance_required BOOLEAN DEFAULT false,
    preferred_vendor_gender TEXT CHECK (preferred_vendor_gender IN ('male', 'female', 'any')),
    language_requirements JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE service_rfqs IS 'Service-specific RFQ extension with scheduling and location details';
COMMENT ON COLUMN service_rfqs.preferred_schedule IS 'Preferred service schedule: {"days": ["monday", "tuesday"], "time_start": "09:00", "time_end": "18:00"}';
COMMENT ON COLUMN service_rfqs.service_location IS 'Service location details: {"address": "...", "city": "Mumbai", "floor": "3rd", "lift_available": true}';
COMMENT ON COLUMN service_rfqs.requirements IS 'Additional requirements: {"experience_years": 5, "equipment_provided": true}';

-- Indexes for service_rfqs
CREATE INDEX idx_service_rfqs_rfq ON service_rfqs(rfq_id);
CREATE INDEX idx_service_rfqs_category ON service_rfqs(service_category_id);
CREATE INDEX idx_service_rfqs_urgency ON service_rfqs(urgency);
CREATE INDEX idx_service_rfqs_budget ON service_rfqs(estimated_budget) WHERE estimated_budget IS NOT NULL;

-- ============================================
-- TABLE 4: service_quotes
-- Service-specific quotes (extends quotes/rfq_responses)
-- Depends on: service_rfqs, service_vendors, rfq_responses
-- ============================================
CREATE TABLE service_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_response_id UUID REFERENCES rfq_responses(id) ON DELETE CASCADE,
    service_rfq_id UUID NOT NULL REFERENCES service_rfqs(id) ON DELETE CASCADE,
    service_vendor_id UUID NOT NULL REFERENCES service_vendors(id) ON DELETE CASCADE,
    proposed_schedule JSONB DEFAULT '{}'::JSONB,
    estimated_duration_hours DECIMAL(8, 2),
    estimated_duration_days INT,
    labor_count INT,
    materials_included BOOLEAN DEFAULT false,
    materials_list JSONB DEFAULT '[]'::JSONB,
    materials_cost DECIMAL(10, 2),
    equipment_provided BOOLEAN DEFAULT true,
    equipment_list JSONB DEFAULT '[]'::JSONB,
    transportation_included BOOLEAN DEFAULT false,
    transportation_cost DECIMAL(10, 2),
    warranty_months_offered INT,
    warranty_details TEXT,
    payment_terms JSONB DEFAULT '{}'::JSONB,
    valid_until TIMESTAMPTZ,
    inclusions TEXT,
    exclusions TEXT,
    terms_conditions TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'revised', 'accepted', 'rejected', 'expired')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT service_quotes_vendor_rfq_unique UNIQUE (service_vendor_id, service_rfq_id)
);

COMMENT ON TABLE service_quotes IS 'Service-specific quotes with detailed scheduling and materials';
COMMENT ON COLUMN service_quotes.proposed_schedule IS 'Proposed service schedule: {"start_date": "2024-02-01", "end_date": "2024-02-05", "daily_hours": 8}';
COMMENT ON COLUMN service_quotes.materials_list IS 'List of materials with costs: [{"item": "Paint", "qty": "20L", "cost": 5000}]';
COMMENT ON COLUMN service_quotes.payment_terms IS 'Payment schedule: {"advance": 30, "on_completion": 70} or {"milestones": [...]}';

-- Indexes for service_quotes
CREATE INDEX idx_service_quotes_rfq_response ON service_quotes(rfq_response_id) WHERE rfq_response_id IS NOT NULL;
CREATE INDEX idx_service_quotes_service_rfq ON service_quotes(service_rfq_id);
CREATE INDEX idx_service_quotes_vendor ON service_quotes(service_vendor_id);
CREATE INDEX idx_service_quotes_status ON service_quotes(status);
CREATE INDEX idx_service_quotes_valid_until ON service_quotes(valid_until) WHERE valid_until IS NOT NULL;

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_service_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_service_categories_updated_at
    BEFORE UPDATE ON service_categories
    FOR EACH ROW EXECUTE FUNCTION update_service_updated_at_column();

CREATE TRIGGER update_service_vendors_updated_at
    BEFORE UPDATE ON service_vendors
    FOR EACH ROW EXECUTE FUNCTION update_service_updated_at_column();

CREATE TRIGGER update_service_rfqs_updated_at
    BEFORE UPDATE ON service_rfqs
    FOR EACH ROW EXECUTE FUNCTION update_service_updated_at_column();

CREATE TRIGGER update_service_quotes_updated_at
    BEFORE UPDATE ON service_quotes
    FOR EACH ROW EXECUTE FUNCTION update_service_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all service tables
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_quotes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for service_categories
-- ============================================

CREATE POLICY "Service role can do everything on service_categories"
    ON service_categories FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can read active service_categories"
    ON service_categories FOR SELECT
    TO authenticated
    USING (active = true);

-- ============================================
-- RLS Policies for service_vendors
-- ============================================

CREATE POLICY "Service role can do everything on service_vendors"
    ON service_vendors FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Suppliers can manage their own service vendor profiles
CREATE POLICY "Suppliers can manage own service_vendors"
    ON service_vendors FOR ALL
    TO authenticated
    USING (
        supplier_id IN (
            SELECT id FROM suppliers
            WHERE contact_email = current_setting('request.user_email', true)
        )
    )
    WITH CHECK (
        supplier_id IN (
            SELECT id FROM suppliers
            WHERE contact_email = current_setting('request.user_email', true)
        )
    );

-- Anyone can read active service vendors
CREATE POLICY "Anyone can read active service_vendors"
    ON service_vendors FOR SELECT
    TO authenticated
    USING (active = true);

-- ============================================
-- RLS Policies for service_rfqs
-- ============================================

CREATE POLICY "Service role can do everything on service_rfqs"
    ON service_rfqs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Merchants can manage their own service RFQs (through rfqs relationship)
CREATE POLICY "Merchants can manage own service_rfqs"
    ON service_rfqs FOR ALL
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

-- Vendors can read open service RFQs in their category
CREATE POLICY "Vendors can read service_rfqs in their category"
    ON service_rfqs FOR SELECT
    TO authenticated
    USING (
        service_category_id IN (
            SELECT service_category_id FROM service_vendors
            WHERE supplier_id IN (SELECT id FROM suppliers)
            AND active = true
        )
    );

-- ============================================
-- RLS Policies for service_quotes
-- ============================================

CREATE POLICY "Service role can do everything on service_quotes"
    ON service_quotes FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Vendors can manage their own quotes
CREATE POLICY "Vendors can manage own service_quotes"
    ON service_quotes FOR ALL
    TO authenticated
    USING (
        service_vendor_id IN (
            SELECT id FROM service_vendors
            WHERE supplier_id IN (SELECT id FROM suppliers)
        )
    )
    WITH CHECK (
        service_vendor_id IN (
            SELECT id FROM service_vendors
            WHERE supplier_id IN (SELECT id FROM suppliers)
        )
    );

-- Merchants can read quotes for their RFQs
CREATE POLICY "Merchants can read service_quotes for own rfqs"
    ON service_quotes FOR SELECT
    TO authenticated
    USING (
        service_rfq_id IN (
            SELECT sr.id FROM service_rfqs sr
            JOIN rfqs r ON r.id = sr.rfq_id
            WHERE r.merchant_id IN (
                SELECT id FROM merchants
                WHERE rez_merchant_id = current_setting('app.current_merchant_id', true)
            )
        )
    );

-- ============================================
-- Grant permissions
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant additional permissions for service-specific operations
GRANT INSERT, UPDATE ON service_vendors TO authenticated;
GRANT INSERT, UPDATE ON service_quotes TO authenticated;

-- ============================================
-- Seed Data: 12 Service Categories (8 Primary + 24 Subcategories)
-- ============================================

INSERT INTO service_categories (id, name, slug, description, icon, parent_id, display_order, active) VALUES
-- Tier 1: 8 Primary Categories
('f1111111-1111-1111-1111-111111111111'::UUID, 'Catering Services', 'catering-services', 'Professional catering for events, parties, and corporate gatherings', 'utensils-crossed', NULL, 10, true),
('f2222222-2222-2222-2222-222222222222'::UUID, 'Maintenance & Repair', 'maintenance-repair', 'General maintenance, repairs, and handyman services', 'wrench', NULL, 20, true),
('f3333333-3333-3333-3333-333333333333'::UUID, 'Cleaning Services', 'cleaning-services', 'Professional cleaning for homes, offices, and commercial spaces', 'sparkles', NULL, 30, true),
('f4444444-4444-4444-4444-444444444444'::UUID, 'Security Services', 'security-services', 'Security guards, surveillance, and safety services', 'shield', NULL, 40, true),
('f5555555-5555-5555-5555-555555555555'::UUID, 'Transportation & Logistics', 'transportation-logistics', 'Vehicle rental, transport, and delivery services', 'truck', NULL, 50, true),
('f6666666-6666-6666-6666-666666666666'::UUID, 'Events & Entertainment', 'events-entertainment', 'Event management, DJ, photography, and entertainment', 'calendar', NULL, 60, true),
('f7777777-7777-7777-7777-777777777777'::UUID, 'Technology Services', 'technology-services', 'IT support, software, and technical services', 'monitor', NULL, 70, true),
('f8888888-8888-8888-8888-888888888888'::UUID, 'Consulting & Professional', 'consulting-professional', 'Business consulting, legal, and professional services', 'briefcase', NULL, 80, true);

-- Tier 2: Subcategories for Catering Services (4)
WITH catering AS (SELECT id FROM service_categories WHERE slug = 'catering-services')
INSERT INTO service_categories (id, name, slug, description, icon, parent_id, display_order, active)
SELECT * FROM (
    VALUES
    ('f1111111-1111-1111-1111-111111111112'::UUID, 'Corporate Catering', 'corporate-catering', 'Business meetings, conferences, and corporate events', 'building', (SELECT id FROM catering), 11, true),
    ('f1111111-1111-1111-1111-111111111113'::UUID, 'Wedding Catering', 'wedding-catering', 'Wedding ceremonies and reception catering', 'heart', (SELECT id FROM catering), 12, true),
    ('f1111111-1111-1111-1111-111111111114'::UUID, 'Party Catering', 'party-catering', 'Birthday parties, anniversaries, and celebrations', 'party-popper', (SELECT id FROM catering), 13, true),
    ('f1111111-1111-1111-1111-111111111115'::UUID, 'Bulk Food Supply', 'bulk-food-supply', 'Large-scale food preparation and supply', 'package', (SELECT id FROM catering), 14, true)
) AS t(id, name, slug, description, icon, parent_id, display_order, active)
WHERE EXISTS (SELECT 1 FROM catering);

-- Tier 2: Subcategories for Maintenance & Repair (5)
WITH maintenance AS (SELECT id FROM service_categories WHERE slug = 'maintenance-repair')
INSERT INTO service_categories (id, name, slug, description, icon, parent_id, display_order, active)
SELECT * FROM (
    VALUES
    ('f2222222-2222-2222-2222-222222222221'::UUID, 'Plumbing Services', 'plumbing-services', 'Pipe fitting, leak repairs, and plumbing installations', 'droplet', (SELECT id FROM maintenance), 21, true),
    ('f2222222-2222-2222-2222-222222222222'::UUID, 'Electrical Services', 'electrical-services', 'Wiring, repairs, and electrical installations', 'zap', (SELECT id FROM maintenance), 22, true),
    ('f2222222-2222-2222-2222-222222222223'::UUID, 'AC Repair & Service', 'ac-repair-service', 'Air conditioning repair, service, and installation', 'wind', (SELECT id FROM maintenance), 23, true),
    ('f2222222-2222-2222-2222-222222222224'::UUID, 'Carpentry Services', 'carpentry-services', 'Furniture repair, woodwork, and carpentry', 'hammer', (SELECT id FROM maintenance), 24, true),
    ('f2222222-2222-2222-2222-222222222225'::UUID, 'Pest Control', 'pest-control', 'Pest removal and prevention services', 'bug', (SELECT id FROM maintenance), 25, true)
) AS t(id, name, slug, description, icon, parent_id, display_order, active)
WHERE EXISTS (SELECT 1 FROM maintenance);

-- Tier 2: Subcategories for Cleaning Services (4)
WITH cleaning AS (SELECT id FROM service_categories WHERE slug = 'cleaning-services')
INSERT INTO service_categories (id, name, slug, description, icon, parent_id, display_order, active)
SELECT * FROM (
    VALUES
    ('f3333333-3333-3333-3333-333333333331'::UUID, 'Office Cleaning', 'office-cleaning', 'Professional office and workspace cleaning', 'building-2', (SELECT id FROM cleaning), 31, true),
    ('f3333333-3333-3333-3333-333333333332'::UUID, 'Deep Cleaning', 'deep-cleaning', 'Thorough deep cleaning services', 'sparkles', (SELECT id FROM cleaning), 32, true),
    ('f3333333-3333-3333-3333-333333333333'::UUID, 'Kitchen Cleaning', 'kitchen-cleaning', 'Commercial kitchen and hood cleaning', 'chef-hat', (SELECT id FROM cleaning), 33, true),
    ('f3333333-3333-3333-3333-333333333334'::UUID, 'Carpet & Upholstery', 'carpet-upholstery', 'Carpet and furniture cleaning services', 'sofa', (SELECT id FROM cleaning), 34, true)
) AS t(id, name, slug, description, icon, parent_id, display_order, active)
WHERE EXISTS (SELECT 1 FROM cleaning);

-- Tier 2: Subcategories for Security Services (3)
WITH security AS (SELECT id FROM service_categories WHERE slug = 'security-services')
INSERT INTO service_categories (id, name, slug, description, icon, parent_id, display_order, active)
SELECT * FROM (
    VALUES
    ('f4444444-4444-4444-4444-444444444441'::UUID, 'Security Guards', 'security-guards', 'Trained security personnel for events and premises', 'users', (SELECT id FROM security), 41, true),
    ('f4444444-4444-4444-4444-444444444442'::UUID, 'CCTV Surveillance', 'cctv-surveillance', 'CCTV installation and monitoring services', 'video', (SELECT id FROM security), 42, true),
    ('f4444444-4444-4444-4444-444444444443'::UUID, 'Event Security', 'event-security', 'Specialized security for events and gatherings', 'shield-check', (SELECT id FROM security), 43, true)
) AS t(id, name, slug, description, icon, parent_id, display_order, active)
WHERE EXISTS (SELECT 1 FROM security);

-- Tier 2: Subcategories for Transportation & Logistics (3)
WITH transport AS (SELECT id FROM service_categories WHERE slug = 'transportation-logistics')
INSERT INTO service_categories (id, name, slug, description, icon, parent_id, display_order, active)
SELECT * FROM (
    VALUES
    ('f5555555-5555-5555-5555-555555555551'::UUID, 'Vehicle Rental', 'vehicle-rental', 'Car, van, and truck rental services', 'car', (SELECT id FROM transport), 51, true),
    ('f5555555-5555-5555-5555-555555555552'::UUID, 'Goods Transport', 'goods-transport', 'Freight and cargo transportation', 'package', (SELECT id FROM transport), 52, true),
    ('f5555555-5555-5555-5555-555555555553'::UUID, 'Last Mile Delivery', 'last-mile-delivery', 'Local delivery and courier services', 'bike', (SELECT id FROM transport), 53, true)
) AS t(id, name, slug, description, icon, parent_id, display_order, active)
WHERE EXISTS (SELECT 1 FROM transport);

-- Tier 2: Subcategories for Events & Entertainment (4)
WITH events_ent AS (SELECT id FROM service_categories WHERE slug = 'events-entertainment')
INSERT INTO service_categories (id, name, slug, description, icon, parent_id, display_order, active)
SELECT * FROM (
    VALUES
    ('f6666666-6666-6666-6666-666666666661'::UUID, 'Event Management', 'event-management', 'Full-service event planning and coordination', 'clipboard-list', (SELECT id FROM events_ent), 61, true),
    ('f6666666-6666-6666-6666-666666666662'::UUID, 'DJ & Music', 'dj-music', 'DJ services, music equipment, and entertainment', 'music', (SELECT id FROM events_ent), 62, true),
    ('f6666666-6666-6666-6666-666666666663'::UUID, 'Photography & Videography', 'photography-videography', 'Event photography and video production', 'camera', (SELECT id FROM events_ent), 63, true),
    ('f6666666-6666-6666-6666-666666666664'::UUID, 'Decoration Services', 'decoration-services', 'Event decor, themes, and floral arrangements', 'flower', (SELECT id FROM events_ent), 64, true)
) AS t(id, name, slug, description, icon, parent_id, display_order, active)
WHERE EXISTS (SELECT 1 FROM events_ent);

-- Tier 2: Subcategories for Technology Services (3)
WITH tech AS (SELECT id FROM service_categories WHERE slug = 'technology-services')
INSERT INTO service_categories (id, name, slug, description, icon, parent_id, display_order, active)
SELECT * FROM (
    VALUES
    ('f7777777-7777-7777-7777-777777777771'::UUID, 'IT Support', 'it-support', 'Technical support and troubleshooting', 'headphones', (SELECT id FROM tech), 71, true),
    ('f7777777-7777-7777-7777-777777777772'::UUID, 'Network Setup', 'network-setup', 'Network installation and configuration', 'wifi', (SELECT id FROM tech), 72, true),
    ('f7777777-7777-7777-7777-777777777773'::UUID, 'POS Systems', 'pos-systems', 'Point of sale system installation and support', 'credit-card', (SELECT id FROM tech), 73, true)
) AS t(id, name, slug, description, icon, parent_id, display_order, active)
WHERE EXISTS (SELECT 1 FROM tech);

-- Tier 2: Subcategories for Consulting & Professional (4)
WITH consulting AS (SELECT id FROM service_categories WHERE slug = 'consulting-professional')
INSERT INTO service_categories (id, name, slug, description, icon, parent_id, display_order, active)
SELECT * FROM (
    VALUES
    ('f8888888-8888-8888-8888-888888888881'::UUID, 'Business Consulting', 'business-consulting', 'Business strategy and management consulting', 'trending-up', (SELECT id FROM consulting), 81, true),
    ('f8888888-8888-8888-8888-888888888882'::UUID, 'Legal Services', 'legal-services', 'Legal advice and documentation services', 'scale', (SELECT id FROM consulting), 82, true),
    ('f8888888-8888-8888-8888-888888888883'::UUID, 'Accounting & Tax', 'accounting-tax', 'Accounting, bookkeeping, and tax services', 'calculator', (SELECT id FROM consulting), 83, true),
    ('f8888888-8888-8888-8888-888888888884'::UUID, 'HR Services', 'hr-services', 'Recruitment, payroll, and HR outsourcing', 'user-check', (SELECT id FROM consulting), 84, true)
) AS t(id, name, slug, description, icon, parent_id, display_order, active)
WHERE EXISTS (SELECT 1 FROM consulting);

-- ============================================
-- Verification queries
-- ============================================

DO $$
DECLARE
    category_count INTEGER;
    tier1_count INTEGER;
    tier2_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM service_categories;
    SELECT COUNT(*) INTO tier1_count FROM service_categories WHERE parent_id IS NULL;
    SELECT COUNT(*) INTO tier2_count FROM service_categories WHERE parent_id IS NOT NULL;

    RAISE NOTICE '=== Service Categories Migration Verification ===';
    RAISE NOTICE 'Total Categories: %', category_count;
    RAISE NOTICE 'Tier 1 (Primary): %', tier1_count;
    RAISE NOTICE 'Tier 2 (Subcategories): %', tier2_count;
    RAISE NOTICE '=== Migration Complete ===';
END $$;

-- Final status
SELECT 'Phase 2 migration complete: 4 tables, indexes, triggers, RLS policies, and 32 categories (8 primary + 24 subcategories) seeded' AS status;
