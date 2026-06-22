# ReZ Ride — Database Schema

## Overview

```
DATABASE: PostgreSQL (Primary)
CACHE: Redis
EVENTS: Kafka / Redis Streams
LOGS: MongoDB
```

---

## Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users    │────▶│   rides    │◀────│  drivers    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │                   │                   │
      ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  wallets   │     │ impressions │     │ vehicles    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    ads     │
                    └─────────────┘
```

---

## Core Tables

### 1. users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rez_user_id UUID UNIQUE NOT NULL, -- Links to ReZ ecosystem
  phone VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user' | 'driver'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'deleted'
  default_payment_method VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_rez_user_id ON users(rez_user_id);
```

### 2. drivers

```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id),

  -- Profile
  license_number VARCHAR(50) NOT NULL,
  license_expiry DATE,
  license_image_url TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'offline', -- 'offline' | 'online' | 'busy' | 'riding'
  current_location POINT,
  last_location_at TIMESTAMPTZ,

  -- Ratings & Stats
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_rides INTEGER DEFAULT 0,
  acceptance_rate DECIMAL(5,2) DEFAULT 100.00,

  -- Earnings
  total_earnings DECIMAL(12,2) DEFAULT 0,
  pending_payout DECIMAL(12,2) DEFAULT 0,
  ad_revenue_share DECIMAL(5,2) DEFAULT 60.00, -- 60%

  -- Verification
  kyc_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'verified' | 'rejected'
  onboarding_completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_location ON drivers USING GIST(current_location);
```

### 3. vehicles

```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,

  -- Vehicle Details
  vehicle_type VARCHAR(20) NOT NULL, -- 'auto' | 'cab' | 'suv' | 'bus'
  vehicle_number VARCHAR(20) NOT NULL,
  vehicle_model VARCHAR(100),
  vehicle_color VARCHAR(50),
  vehicle_year INTEGER,

  -- Documents
  rc_number VARCHAR(50) NOT NULL,
  rc_expiry DATE,
  rc_image_url TEXT,
  insurance_number VARCHAR(50),
  insurance_expiry DATE,
  insurance_image_url TEXT,
  pollution_certificate VARCHAR(50),
  pollution_expiry DATE,

  -- Screen
  screen_device_id VARCHAR(100),
  screen_installed_at TIMESTAMPTZ,
  screen_status VARCHAR(20) DEFAULT 'inactive', -- 'inactive' | 'active' | 'offline'

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'maintenance' | 'inactive'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX idx_vehicles_number ON vehicles(vehicle_number);
```

### 4. rides

```sql
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Users
  user_id UUID NOT NULL REFERENCES users(id),
  driver_id UUID REFERENCES drivers(id),

  -- Locations
  pickup_location JSONB NOT NULL, -- {lat, lng, address, city}
  drop_location JSONB NOT NULL,
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),
  drop_lat DECIMAL(10, 8),
  drop_lng DECIMAL(11, 8),

  -- Route
  route_polyline TEXT,
  estimated_distance DECIMAL(8, 2), -- km
  estimated_duration INTEGER, -- seconds

  -- Vehicle
  vehicle_type VARCHAR(20) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),

  -- Fare
  base_fare DECIMAL(8, 2) NOT NULL,
  distance_fare DECIMAL(8, 2) NOT NULL,
  time_fare DECIMAL(8, 2) NOT NULL,
  waiting_fare DECIMAL(8, 2) DEFAULT 0,
  surge_multiplier DECIMAL(3, 2) DEFAULT 1.00,
  discount_amount DECIMAL(8, 2) DEFAULT 0,
  fare_amount DECIMAL(8, 2) NOT NULL, -- Final fare
  cashback_amount DECIMAL(8, 2) NOT NULL, -- 10% of fare

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'requested',
  -- 'requested' | 'assigned' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  pickup_eta TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Cancellation
  cancelled_by VARCHAR(20), -- 'user' | 'driver' | 'system'
  cancellation_reason TEXT,

  -- Payment
  payment_method VARCHAR(50) NOT NULL DEFAULT 'wallet',
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'refunded'
  payment_id VARCHAR(100),
  paid_at TIMESTAMPTZ,

  -- Ad
  ad_served BOOLEAN DEFAULT FALSE,
  ad_campaign_id UUID,
  ad_creative_id UUID,

  -- Rating
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rides_user_id ON rides(user_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_created_at ON rides(created_at);
CREATE INDEX idx_rides_pickup_location ON rides USING GIST(ST_MakePoint(pickup_lng, pickup_lat));
```

### 5. ad_impressions

```sql
CREATE TABLE ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  ride_id UUID NOT NULL REFERENCES rides(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  user_id UUID NOT NULL REFERENCES users(id),
  campaign_id UUID NOT NULL,
  creative_id UUID NOT NULL,

  -- Timing
  served_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_duration INTEGER, -- seconds
  interaction_time TIMESTAMPTZ,

  -- Interaction
  interacted BOOLEAN DEFAULT FALSE,
  interaction_type VARCHAR(50), -- 'tap' | 'link_click' | 'call'

  -- Revenue
  cashback_generated DECIMAL(8, 2) DEFAULT 0,
  revenue_amount DECIMAL(8, 2) DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impressions_ride_id ON ad_impressions(ride_id);
CREATE INDEX idx_impressions_driver_id ON ad_impressions(driver_id);
CREATE INDEX idx_impressions_campaign_id ON ad_impressions(campaign_id);
CREATE INDEX idx_impressions_served_at ON ad_impressions(served_at);
```

### 6. driver_earnings

```sql
CREATE TABLE driver_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),

  -- Source breakdown
  ride_fare DECIMAL(10, 2) DEFAULT 0,
  ad_revenue DECIMAL(10, 2) DEFAULT 0,
  bonus DECIMAL(10, 2) DEFAULT 0,
  total_earnings DECIMAL(10, 2) NOT NULL,

  -- Deductions
  platform_fee DECIMAL(10, 2) DEFAULT 0,
  tds_deducted DECIMAL(10, 2) DEFAULT 0,
  other_deductions DECIMAL(10, 2) DEFAULT 0,
  total_deductions DECIMAL(10, 2) DEFAULT 0,

  -- Net
  net_payable DECIMAL(10, 2) NOT NULL,

  -- Period
  earnings_date DATE NOT NULL,

  -- Payout
  payout_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'paid'
  payout_id UUID,
  paid_at TIMESTAMPTZ,

  -- Metadata
  ride_count INTEGER DEFAULT 0,
  ride_ids UUID[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX idx_earnings_date ON driver_earnings(earnings_date);
CREATE INDEX idx_earnings_payout ON driver_earnings(payout_status);
```

### 7. cashback_transactions

```sql
CREATE TABLE cashback_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  ride_id UUID REFERENCES rides(id),

  amount DECIMAL(8, 2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- 'credit' | 'debit'
  balance_after DECIMAL(12, 2) NOT NULL,

  -- Source
  source VARCHAR(50) NOT NULL, -- 'ride_cashback' | 'referral' | 'promo' | 'expiry'
  source_id UUID,

  -- Expiry
  expires_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'completed', -- 'pending' | 'completed' | 'expired' | 'used'

  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cashback_user_id ON cashback_transactions(user_id);
CREATE INDEX idx_cashback_ride_id ON cashback_transactions(ride_id);
CREATE INDEX idx_cashback_expires ON cashback_transactions(expires_at);
```

### 8. driver_payouts

```sql
CREATE TABLE driver_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),

  amount DECIMAL(12, 2) NOT NULL,
  method VARCHAR(20) NOT NULL, -- 'upi' | 'bank_transfer'
  UPI_id VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_ifsc VARCHAR(20),

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  utr_number VARCHAR(50),
  failure_reason TEXT,

  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_driver_id ON driver_payouts(driver_id);
CREATE INDEX idx_payouts_status ON driver_payouts(status);
```

---

## Lookup Tables

### 9. cities

```sql
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(50) DEFAULT 'India',
  country_code VARCHAR(5) DEFAULT 'IN',

  -- Pricing
  currency VARCHAR(10) DEFAULT 'INR',
  surge_enabled BOOLEAN DEFAULT TRUE,
  auto_pricing JSONB, -- Dynamic pricing config

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'inactive' | 'coming_soon'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 10. pricing_zones

```sql
CREATE TABLE pricing_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id),
  name VARCHAR(100),

  -- Zone definition (polygon)
  zone_geometry JSONB NOT NULL, -- GeoJSON polygon

  -- Pricing overrides
  base_fare_multiplier DECIMAL(3, 2) DEFAULT 1.00,
  per_km_multiplier DECIMAL(3, 2) DEFAULT 1.00,
  night_multiplier DECIMAL(3, 2) DEFAULT 1.25,

  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Audit & Logs

### 11. ride_events

```sql
CREATE TABLE ride_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id),

  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  actor_type VARCHAR(20), -- 'user' | 'driver' | 'system'
  actor_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ride_events_ride_id ON ride_events(ride_id);
CREATE INDEX idx_ride_events_type ON ride_events(event_type);
```

### 12. audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,

  actor_type VARCHAR(20),
  actor_id UUID,

  old_value JSONB,
  new_value JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

## Enums

```sql
-- Vehicle Types
CREATE TYPE vehicle_type AS ENUM ('auto', 'cab', 'suv', 'bus');

-- Ride Status
CREATE TYPE ride_status AS ENUM (
  'requested',
  'assigned',
  'accepted',
  'arrived',
  'in_progress',
  'completed',
  'cancelled'
);

-- Driver Status
CREATE TYPE driver_status AS ENUM (
  'offline',
  'online',
  'busy',
  'riding'
);

-- Payment Status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded'
);
```

---

## Key Queries

### Find Nearest Available Drivers

```sql
-- Find 5 nearest drivers for an auto in a city
SELECT
  d.id,
  d.user_id,
  d.vehicle_id,
  d.rating,
  d.current_location,
  v.vehicle_type,
  ST_Distance(
    d.current_location,
    ST_MakePoint($lng, $lat)::geography
  ) as distance_meters
FROM drivers d
JOIN vehicles v ON v.id = d.vehicle_id
WHERE d.status = 'online'
  AND v.vehicle_type = 'auto'
  AND d.kyc_status = 'verified'
  AND ST_DWithin(
    d.current_location,
    ST_MakePoint($lng, $lat)::geography,
    5000 -- 5km radius
  )
ORDER BY distance_meters ASC
LIMIT 5;
```

### Get Driver Earnings Summary

```sql
SELECT
  driver_id,
  COUNT(*) as total_rides,
  SUM(ride_fare) as total_fare,
  SUM(ad_revenue) as total_ad_revenue,
  SUM(total_earnings) as gross_earnings,
  SUM(total_deductions) as total_deductions,
  SUM(net_payable) as net_payable
FROM driver_earnings
WHERE earnings_date BETWEEN $start_date AND $end_date
  AND driver_id = $driver_id
GROUP BY driver_id;
```

### Ad Performance Report

```sql
SELECT
  DATE(served_at) as date,
  COUNT(*) as impressions,
  COUNT(*) FILTER (WHERE interacted = TRUE) as interactions,
  SUM(revenue_amount) as total_revenue,
  SUM(cashback_generated) as total_cashback
FROM ad_impressions
WHERE served_at BETWEEN $start AND $end
GROUP BY DATE(served_at)
ORDER BY date DESC;
```
