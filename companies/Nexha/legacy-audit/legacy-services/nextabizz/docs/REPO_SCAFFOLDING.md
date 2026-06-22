# NextaBizz — Repo Scaffolding Spec

## Repo
`imrejaul007/nextabizz`
- **Stack:** Next.js 15 + TypeScript + Supabase (Postgres) + Turborepo monorepo
- **Pattern:** Same as AdBazaar — Next.js frontend, Supabase backend (Auth + DB + Realtime)
- **Hosting:** Vercel

---

## Monorepo Structure

```
nextabizz/
├── apps/
│   ├── web/                        # Merchant-facing web app
│   │   ├── app/
│   │   │   ├── (auth)/            # Login, register
│   │   │   ├── (dashboard)/        # Main merchant dashboard
│   │   │   │   ├── orders/        # PO management
│   │   │   │   ├── signals/       # Inventory signals + reorder
│   │   │   │   ├── catalog/       # Supplier catalog browse
│   │   │   │   ├── rfqs/          # RFQ management
│   │   │   │   ├── finance/       # BNPL, credit line
│   │   │   │   └── analytics/     # Procurement analytics
│   │   │   └── api/               # Next.js route handlers
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   │
│   └── supplier-portal/            # Supplier-facing web app (Phase 2)
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── package.json
│
├── packages/
│   ├── shared-types/              # Canonical TypeScript types
│   │   ├── src/
│   │   │   ├── entities/         # Merchant, Supplier, Product, PO, etc.
│   │   │   ├── events/           # Event schemas
│   │   │   └── api/               # API request/response types
│   │   └── package.json
│   │
│   ├── webhook-sdk/               # Consumed by RestoPapa, Hotel PMS, ReZ Merchant
│   │   ├── src/
│   │   │   └── sendSignal.ts     # Send inventory signals to NextaBizz
│   │   └── package.json
│   │
│   └── rez-auth-client/           # REZ Auth integration
│       ├── src/
│       │   └── sso.ts             # REZ SSO token validation
│       └── package.json
│
├── services/                       # Background workers (separate Node processes)
│   ├── reorder-engine/            # Derives ReorderSignal from InventorySignal
│   │   ├── src/
│   │   │   ├── matcher.ts         # Match signals to SupplierProducts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── scoring-engine/            # Calculates SupplierScore (monthly)
│   │   ├── src/
│   │   │   ├── calculator.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── payment-settlement/         # B2B payment settlement (Net Terms / BNPL)
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── supabase/
│   ├── migrations/                # Postgres migrations
│   │   └── 001_initial_schema.sql
│   └── seed.sql                   # Seed categories, etc.
│
├── .env.example
├── .gitignore
├── turbo.json                     # Turborepo config
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
├── eslint.config.js
└── README.md
```

---

## Supabase Schema (Phase 1)

### Tables

```sql
-- Merchant: linked to ReZ Merchant
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rez_merchant_id TEXT UNIQUE NOT NULL,    -- from REZ
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,                  -- restaurant | hotel | salon | retail | pharmacy
  city TEXT,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL,                   -- 'rez-merchant' | 'restopapa' | 'hotel-pms'
  source_merchant_id TEXT NOT NULL,       -- ID in source system
  credit_line_id UUID,                    -- link to credit_lines
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier: B2B seller on NextaBizz
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  gst_number TEXT UNIQUE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  categories TEXT[] NOT NULL,             -- ['food', 'beverages', 'packaging']
  rating DECIMAL(3,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SupplierCategory: for browsing
CREATE TABLE supplier_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES supplier_categories(id),
  icon TEXT,                              -- icon name
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SupplierProduct: supplier's product listing
CREATE TABLE supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  category_id UUID REFERENCES supplier_categories(id),
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  unit TEXT NOT NULL,                      -- 'kg' | 'units' | 'liters' | 'packs'
  moq INT DEFAULT 1,
  price DECIMAL(12,2) NOT NULL,
  bulk_pricing JSONB,                     -- [{qty: 100, price: 90}, {qty: 500, price: 80}]
  images TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  delivery_days INT,                       -- typical delivery
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- InventorySignal: inbound from integrated platforms
CREATE TABLE inventory_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  source TEXT NOT NULL,                   -- 'restopapa' | 'rez-merchant' | 'hotel-pms'
  source_product_id TEXT NOT NULL,
  source_merchant_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  current_stock DECIMAL(12,3) NOT NULL,
  threshold DECIMAL(12,3) NOT NULL,
  unit TEXT NOT NULL,
  category TEXT,
  severity TEXT NOT NULL,                  -- 'low' | 'critical' | 'out_of_stock'
  signal_type TEXT NOT NULL,              -- 'threshold_breach' | 'manual_request' | 'forecast_deficit'
  metadata JSONB,                          -- source-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ReorderSignal: derived from InventorySignal
CREATE TABLE reorder_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  inventory_signal_id UUID REFERENCES inventory_signals(id),
  suggested_qty DECIMAL(12,3),
  urgency TEXT NOT NULL,                   -- 'high' | 'medium' | 'low'
  status TEXT DEFAULT 'pending',           -- 'pending' | 'matched' | 'po_created' | 'ignored'
  match_confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PurchaseOrder
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,      -- NXB-2026-00001
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
    -- draft | submitted | confirmed | processing | shipped | partial | received | cancelled
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',   -- 'pending' | 'partial' | 'paid'
  payment_method TEXT,                    -- 'prepaid' | 'net_terms' | 'bnpl'
  delivery_address JSONB,
  expected_delivery DATE,
  actual_delivery DATE,
  notes TEXT,
  source TEXT DEFAULT 'manual',           -- 'manual' | 'reorder_signal' | 'rfq'
  rfq_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PurchaseOrderItem
CREATE TABLE po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  supplier_product_id UUID REFERENCES supplier_products(id),
  name TEXT NOT NULL,
  sku TEXT,
  qty DECIMAL(12,3) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  received_qty DECIMAL(12,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SupplierScore (updated monthly)
CREATE TABLE supplier_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  period TEXT NOT NULL,                   -- 'monthly' | 'quarterly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  on_time_delivery_rate DECIMAL(5,4) DEFAULT 0,
  quality_rejection_rate DECIMAL(5,4) DEFAULT 0,
  price_consistency DECIMAL(5,4) DEFAULT 0,
  avg_lead_time_days DECIMAL(5,2),
  response_rate DECIMAL(5,4) DEFAULT 0,
  overall_score DECIMAL(3,2) DEFAULT 0,
  credit_boost DECIMAL(3,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, period, period_start)
);

-- RFQ
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT UNIQUE NOT NULL,        -- NXB-RFQ-00001
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  quantity DECIMAL(12,3) NOT NULL,
  unit TEXT NOT NULL,
  target_price DECIMAL(12,2),
  delivery_deadline DATE,
  status TEXT DEFAULT 'open',
  awarded_to UUID REFERENCES suppliers(id),
  linked_po_id UUID REFERENCES purchase_orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RFQResponse
CREATE TABLE rfq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  lead_time_days INT,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

-- CreditLine
CREATE TABLE credit_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL UNIQUE,
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  utilized DECIMAL(12,2) DEFAULT 0,
  tenor_days INT DEFAULT 30,
  interest_rate DECIMAL(5,4) DEFAULT 0,   -- APR on overdue
  status TEXT DEFAULT 'active',
  tier TEXT DEFAULT 'standard',             -- 'standard' | 'premium' | 'enterprise'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events log (append-only, for analytics)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  source TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inventory_signals_merchant ON inventory_signals(merchant_id);
CREATE INDEX idx_inventory_signals_severity ON inventory_signals(severity);
CREATE INDEX idx_reorder_signals_status ON reorder_signals(status);
CREATE INDEX idx_pos_merchant ON purchase_orders(merchant_id);
CREATE INDEX idx_pos_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_pos_status ON purchase_orders(status);
CREATE INDEX idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_category ON supplier_products(category_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created ON events(created_at);
```

---

## API Routes (apps/web)

```
POST   /api/webhooks/restopapa/inventory       ← RestoPapa sends stock signals
POST   /api/webhooks/rez-merchant/inventory    ← ReZ Merchant sends stock signals
POST   /api/webhooks/hotel-pms/inventory      ← Hotel PMS sends stock signals

POST   /api/auth/sso                          ← REZ SSO login/register
GET    /api/auth/me                           ← Current merchant session

GET    /api/merchants/:id/signals             ← List inventory signals
GET    /api/merchants/:id/reorder-signals     ← List reorder signals
GET    /api/merchants/:id/orders              ← List POs
POST   /api/merchants/:id/orders              ← Create PO
PATCH  /api/merchants/:id/orders/:orderId     ← Update PO status
GET    /api/merchants/:id/credit-line         ← Get credit line

GET    /api/catalog/products                  ← Browse supplier products
GET    /api/catalog/categories                ← Browse categories
GET    /api/catalog/suppliers/:id             ← Supplier profile

POST   /api/rfqs                             ← Create RFQ
GET    /api/rfqs/:id                         ← RFQ detail
POST   /api/rfqs/:id/respond                 ← Supplier responds to RFQ
```

---

## Env Vars (.env.example)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# REZ Integration (service-to-service)
REZ_AUTH_SERVICE_URL=https://auth.rez.money/api
REZ_WALLET_SERVICE_URL=https://wallet.rez.money/api
REZ_API_GATEWAY_URL=https://api.rez.money/api
REZ_INTERNAL_KEY=your_rez_internal_service_token

# Webhook secrets (verify incoming from integrated platforms)
WEBHOOK_SECRET_RESTOPAPA=generate_with_openssl_rand_hex_32
WEBHOOK_SECRET_REZ_MERCHANT=generate_with_openssl_rand_hex_32
WEBHOOK_SECRET_HOTEL_PMS=generate_with_openssl_rand_hex_32

# App
NEXT_PUBLIC_APP_URL=https://nextabizz.rez.money
NEXT_PUBLIC_REZ_APP_URL=https://rezapp.com

# Notifications (Resend email)
RESEND_API_KEY=re_xxx
```

---

## Build Order

```
Week 1: Repo scaffold + Supabase setup + migrations
  → Create GitHub repo, clone, turbo setup
  → Run Supabase migrations
  → Wire REZ Auth SSO

Week 2: Webhook consumer + Signal ingestion
  → Build webhook endpoints
  → Create webhook-sdk package
  → Integrate into RestoPapa (send signals)
  → Integrate into ReZ Merchant (send signals)

Week 3: PO Engine + Merchant Dashboard UI
  → PO CRUD API routes
  → Merchant portal UI (orders, signals)
  → REZ Wallet for B2B payment terms (future)

Week 4: Reorder Engine + Catalog
  → Matcher logic (signal → supplier products)
  → Catalog browse UI
  → Supplier matching
```
