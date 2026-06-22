# HOJAI DATA MODEL SPECIFICATION
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** ARCHITECTURE SPEC

---

## Executive Summary

This document defines the canonical data model for Hojai v2.

Every entity in the platform is defined here with:
- Core fields
- Relationships
- Validation rules
- API contracts

This ensures consistency across all services.

---

## Entity Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE ENTITIES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          TENANT                                       │   │
│  │  The top-level organization (XYZ Retail, ABC Hospital, REZ)        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│              ┌─────────────────────┼─────────────────────┐               │
│              │                     │                     │               │
│              ▼                     ▼                     ▼               │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐      │
│  │     USER          │ │    LOCATION       │ │    ORGANIZATION   │      │
│  │ (person account)  │ │ (physical place) │ │ (org unit)       │      │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘      │
│              │                     │                     │               │
│              └─────────────────────┼─────────────────────┘               │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        CUSTOMER                                       │   │
│  │  A person interacting with a tenant's business                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│              ┌─────────────────────┼─────────────────────┐               │
│              │                     │                     │               │
│              ▼                     ▼                     ▼               │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐      │
│  │    IDENTITY       │ │   CONVERSATION    │ │     ORDER         │      │
│  │ (cross-platform)  │ │ (interaction)     │ │ (transaction)     │      │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘      │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         EVENT                                        │   │
│  │  Something that happened (timestamped, immutable)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Entities

### 1. Tenant

The top-level organization using Hojai.

```typescript
interface Tenant {
  // Identity
  id: string;                    // UUID
  name: string;                  // "XYZ Retail"
  slug: string;                   // "xyz-retail"
  type: TenantType;              // 'internal' | 'commercial'
  
  // Business
  industry: Industry;             // 'retail' | 'healthcare' | 'hospitality'
  size: 'startup' | 'smb' | 'enterprise';
  
  // Contact
  email: string;
  phone?: string;
  address?: Address;
  
  // Branding
  logo_url?: string;
  primary_color?: string;
  
  // Status
  status: 'active' | 'suspended' | 'churned';
  plan: 'starter' | 'professional' | 'enterprise';
  
  // Billing
  billing_email: string;
  billing_cycle: 'monthly' | 'yearly';
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  suspended_at?: Date;
}

type TenantType = 'internal' | 'commercial';
type Industry = 'retail' | 'healthcare' | 'hospitality' | 'jewellery' | 
                'education' | 'finance' | 'real_estate';
```

**Indexes:**
- `id` (unique)
- `slug` (unique)
- `email` (unique)
- `industry`

---

### 2. User

A person with an account in Hojai (employee of the tenant).

```typescript
interface User {
  // Identity
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  email: string;                 // Unique within tenant
  phone?: string;
  
  // Profile
  name: string;
  avatar_url?: string;
  role: UserRole;
  
  // Employment
  organization_id?: string;      // FK -> Organization
  department?: string;
  title?: string;
  
  // Status
  status: 'active' | 'invited' | 'disabled';
  last_login_at?: Date;
  
  // Metadata
  created_at: Date;
  created_by: string;            // User ID
  updated_at: Date;
}

type UserRole = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';
```

**Indexes:**
- `id` (unique)
- `tenant_id + email` (unique)
- `tenant_id`

---

### 3. Organization

An organizational unit within a tenant (store, branch, department).

```typescript
interface Organization {
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Identity
  name: string;                  // "Koramangala Store"
  code: string;                   // "KA-01"
  type: OrgType;                 // 'store' | 'department' | 'region'
  
  // Location
  location_id?: string;           // FK -> Location
  
  // Hierarchy
  parent_id?: string;            // FK -> Organization (self-reference)
  
  // Contact
  contact_email?: string;
  contact_phone?: string;
  
  // Status
  status: 'active' | 'inactive';
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

type OrgType = 'store' | 'department' | 'region' | 'franchise' | 'warehouse';
```

**Indexes:**
- `id` (unique)
- `tenant_id`
- `tenant_id + code` (unique)

---

### 4. Location

A physical place (store, office, branch).

```typescript
interface Location {
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Identity
  name: string;                  // "XYZ Retail Koramangala"
  type: LocationType;
  
  // Address
  address: Address;
  
  // Geo
  coordinates: {
    lat: number;
    lng: number;
  };
  
  // Zone (for hyperlocal)
  zone: ZoneHierarchy;
  
  // Operating Hours
  operating_hours: {
    [day: string]: {             // 'monday', 'tuesday', etc.
      open: string;             // '09:00'
      close: string;             // '21:00'
      is_closed: boolean;
    };
  };
  
  // Status
  status: 'active' | 'temporarily_closed' | 'permanent_closed';
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;              // ISO 3166-1 alpha-2
}

interface ZoneHierarchy {
  city: string;                  // 'bangalore'
  district?: string;              // 'koramangala'
  neighborhood?: string;          // 'ngb_bangalore_koramangala_5th_block'
  micro_zone?: string;            // 'mz_bangalore_koramangala_5th_block_building_123'
}

type LocationType = 'store' | 'warehouse' | 'office' | 'popup' | 'kiosk';
```

**Indexes:**
- `id` (unique)
- `tenant_id`
- `tenant_id + coordinates` ( geospatial)
- `zone`

---

## Customer Entities

### 5. Customer

A person who interacts with a tenant's business.

```typescript
interface Customer {
  // Identity
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Primary Contact
  phone?: string;                 // E.164 format: +919876543210
  email?: string;
  
  // Profile
  name?: string;
  avatar_url?: string;
  birthday?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Location
  location_id?: string;           // FK -> Location (preferred store)
  address?: Address;
  
  // Tags
  tags: string[];                // Custom tags: 'vip', 'wholesale'
  
  // Computed (updated by ML)
  lifetime_value: number;         // Total revenue generated
  order_count: number;
  avg_order_value: number;
  
  // Segments (computed)
  segments: string[];             // Dynamic segment IDs
  
  // Intelligence
  churn_risk: 'low' | 'medium' | 'high';
  engagement_score: number;      // 0-100
  
  // Preferences
  preferences: CustomerPreferences;
  
  // Status
  status: 'active' | 'inactive' | 'blocked';
  
  // Consent
  consents: ConsentRecord[];
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  first_interaction_at?: Date;
  last_interaction_at?: Date;
}

interface CustomerPreferences {
  language: string;              // 'en', 'hi'
  notification_channel: 'whatsapp' | 'sms' | 'email';
  communication_tone: 'formal' | 'friendly' | 'casual';
}
```

**Indexes:**
- `id` (unique)
- `tenant_id + phone` (unique, nullable)
- `tenant_id + email` (unique, nullable)
- `tenant_id`
- `churn_risk`

---

### 6. Identity

Cross-platform user identity (links same person across channels/devices).

```typescript
interface Identity {
  // Identity
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Primary Identifier
  primary_customer_id: string;   // FK -> Customer (canonical customer)
  
  // Linked Identifiers
  identifiers: IdentityIdentifier[];
  
  // Confidence
  confidence_score: number;        // 0-1
  resolution_method: 'rule' | 'ml' | 'manual';
  
  // Graph Data
  graph_data: {
    devices: string[];          // Device IDs
    ips: string[];               // IP addresses
    same_household: string[];    // Other Identity IDs
  };
  
  // Status
  status: 'active' | 'merged' | 'flagged';
  merged_into?: string;          // If merged, points to new Identity ID
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

interface IdentityIdentifier {
  type: IdentityType;
  value: string;
  customer_id?: string;          // FK -> Customer (if linked)
  verified: boolean;
  verified_at?: Date;
  first_seen_at: Date;
  last_seen_at: Date;
}

type IdentityType = 
  | 'phone' 
  | 'email' 
  | 'device_id'
  | 'device_fingerprint'
  | 'ip_address'
  | 'cookie_id'
  | 'account_id';
```

**Indexes:**
- `id` (unique)
- `tenant_id + primary_customer_id`
- `identifiers.type + identifiers.value`
- `tenant_id`

---

### 7. Customer Segment

A dynamic grouping of customers based on rules.

```typescript
interface CustomerSegment {
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Identity
  name: string;                  // "High Value VIP"
  description?: string;
  type: 'dynamic' | 'static';
  
  // Rules
  rules: SegmentRule[];
  logic: 'and' | 'or';          // How rules are combined
  
  // Computed
  customer_count: number;         // Cached count
  
  // Status
  status: 'active' | 'inactive';
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  created_by: string;            // User ID
}

interface SegmentRule {
  id: string;
  field: string;                 // 'lifetime_value', 'order_count', etc.
  operator: SegmentOperator;
  value: any;
}

type SegmentOperator = 
  | 'eq'           // equals
  | 'neq'          // not equals
  | 'gt'           // greater than
  | 'gte'          // greater than or equal
  | 'lt'           // less than
  | 'lte'          // less than or equal
  | 'contains'      // string contains
  | 'in'           // value in array
  | 'not_in'       // value not in array
  | 'between'       // between two values
  | 'exists'       // field exists
  | 'not_exists';  // field doesn't exist
```

**Indexes:**
- `id` (unique)
- `tenant_id`
- `tenant_id + type`

---

## Interaction Entities

### 8. Conversation

A messaging conversation with a customer.

```typescript
interface Conversation {
  // Identity
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Participants
  customer_id: string;            // FK -> Customer
  identity_id?: string;           // FK -> Identity
  
  // Channel
  channel: ConversationChannel;
  channel_conversation_id?: string; // External platform ID
  channel_user_id?: string;        // User ID on external platform
  
  // Assignment
  assigned_to_type?: 'user' | 'ai_employee';
  assigned_to_id?: string;
  
  // Status
  status: 'open' | 'pending' | 'closed' | 'archived';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // Content
  subject?: string;
  tags: string[];
  notes?: string;                 // Internal notes
  
  // Messages
  message_count: number;
  last_message_at?: Date;
  
  // Resolution
  resolution_type?: 'resolved' | 'escalated' | 'closed_no_resolution';
  resolution_time_minutes?: number;
  
  // CSAT
  csat_score?: number;           // 1-5
  csat_submitted_at?: Date;
  
  // Metadata
  opened_at: Date;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

type ConversationChannel = 
  | 'whatsapp' 
  | 'instagram' 
  | 'facebook'
  | 'webchat'
  | 'api';
```

**Indexes:**
- `id` (unique)
- `tenant_id + customer_id`
- `tenant_id + channel + channel_conversation_id`
- `tenant_id + status + opened_at`
- `assigned_to_id`

---

### 9. Message

A single message in a conversation.

```typescript
interface Message {
  // Identity
  id: string;                    // UUID
  conversation_id: string;         // FK -> Conversation
  tenant_id: string;             // FK -> Tenant
  
  // Sender
  sender_type: 'customer' | 'user' | 'ai';
  sender_id: string;             // Customer ID or User ID or AI Employee ID
  
  // Content
  content: string;
  content_type: MessageContentType;
  
  // Media
  media?: MessageMedia;
  
  // AI Metadata
  ai_metadata?: {
    generated: boolean;
    model?: string;
    confidence?: number;
    intent?: string;
    entities?: Record<string, string>;
  };
  
  // Delivery Status
  delivery_status: DeliveryStatus;
  delivered_at?: Date;
  read_at?: Date;
  
  // External
  external_id?: string;          // Message ID from external platform
  external_timestamp?: Date;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

interface MessageMedia {
  type: 'image' | 'document' | 'video' | 'audio' | 'location';
  url: string;
  thumbnail_url?: string;
  filename?: string;
  mime_type: string;
  size_bytes?: number;
}

type MessageContentType = 
  | 'text'
  | 'image'
  | 'document'
  | 'video'
  | 'audio'
  | 'location'
  | 'contact'
  | 'sticker'
  | 'template'
  | 'button_response'
  | 'interactive';

type DeliveryStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'bounced';
```

**Indexes:**
- `id` (unique)
- `conversation_id + created_at`
- `tenant_id + created_at`
- `sender_id + created_at`

---

## Transaction Entities

### 10. Order

A customer order/transaction.

```typescript
interface Order {
  // Identity
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Customer
  customer_id: string;            // FK -> Customer
  identity_id?: string;           // FK -> Identity
  
  // Organization
  organization_id?: string;       // FK -> Organization
  location_id?: string;          // FK -> Location
  
  // Order Details
  order_number: string;          // Human-readable: "ORD-2026-001234"
  type: OrderType;
  
  // Status
  status: OrderStatus;
  status_history: OrderStatusHistory[];
  
  // Items
  items: OrderItem[];
  item_count: number;
  subtotal: number;
  tax: number;
  discount: number;
  delivery_fee: number;
  total: number;
  currency: string;             // ISO 4217: 'INR'
  
  // Payment
  payment_status: PaymentStatus;
  payment_method?: string;
  paid_at?: Date;
  
  // Fulfillment
  fulfillment_status: FulfillmentStatus;
  assigned_to_user_id?: string; // Delivery agent
  
  // Source
  source: OrderSource;
  utm_data?: UTMData;
  
  // Attribution
  attribution?: AttributionData;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  cancelled_at?: Date;
}

interface OrderItem {
  id: string;
  product_id: string;            // FK -> Product
  variant_id?: string;
  
  name: string;                   // Snapshot at time of order
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  
  // Fulfillment
  fulfilled_quantity?: number;
  cancelled_quantity?: number;
}

interface OrderStatusHistory {
  status: OrderStatus;
  changed_at: Date;
  changed_by: string;
  reason?: string;
}

type OrderType = 'sale' | 'return' | 'exchange';
type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'partial_refund';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
type FulfillmentStatus = 'pending' | 'partial' | 'fulfilled';
type OrderSource = 'pos' | 'online' | 'whatsapp' | 'app' | 'api';
```

**Indexes:**
- `id` (unique)
- `tenant_id + order_number` (unique)
- `tenant_id + customer_id`
- `tenant_id + status + created_at`
- `created_at`

---

### 11. Product

A product or service offered by a tenant.

```typescript
interface Product {
  // Identity
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Catalog
  category_id?: string;           // FK -> Category
  organization_ids: string[];     // FK -> Organization[] (available at)
  
  // Identity
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  
  // Pricing
  price: Money;
  cost_price?: Money;
  margin?: number;               // Computed
  
  // Variants
  variants?: ProductVariant[];
  has_variants: boolean;
  
  // Media
  images: ProductImage[];
  
  // Inventory
  inventory_tracking: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number;
  
  // Availability
  status: 'active' | 'draft' | 'archived' | 'out_of_stock';
  available_online: boolean;
  available_in_store: boolean;
  
  // AI
  ai_description?: string;
  search_keywords: string[];
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

interface ProductVariant {
  id: string;
  name: string;                   // "Large", "Red"
  sku: string;
  barcode?: string;
  price: Money;
  stock_quantity?: number;
  attributes: Record<string, string>; // { "size": "large", "color": "red" }
}

interface Money {
  amount: number;                 // In smallest unit (cents/paise)
  currency: string;               // ISO 4217
}

interface ProductImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  sort_order: number;
}
```

**Indexes:**
- `id` (unique)
- `tenant_id + sku` (unique)
- `tenant_id + barcode`
- `tenant_id + category_id`
- `name` (full-text search)

---

### 12. Category

A product category.

```typescript
interface Category {
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Identity
  name: string;
  slug: string;
  description?: string;
  
  // Hierarchy
  parent_id?: string;            // FK -> Category (self-reference)
  level: number;                 // 0 = root, 1 = subcategory
  
  // Media
  image_url?: string;
  icon?: string;
  
  // Display
  sort_order: number;
  
  // Status
  status: 'active' | 'inactive';
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}
```

**Indexes:**
- `id` (unique)
- `tenant_id + slug` (unique)
- `tenant_id + parent_id`

---

## Event Entity

### 13. Event

Immutable record of something that happened.

```typescript
interface HojaiEvent {
  // Identity
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Event Details
  type: string;                  // 'order.created', 'customer.tagged'
  category: EventCategory;
  
  // Source
  source: string;               // Service name: 'pos', 'api', 'ai-employee'
  source_id?: string;            // ID in source system
  
  // Subjects (who/what the event is about)
  subject_type?: string;         // 'customer', 'order', 'product'
  subject_id?: string;           // ID of the subject
  
  // Actor (who triggered the event)
  actor_type?: 'customer' | 'user' | 'ai' | 'system';
  actor_id?: string;
  
  // Data
  data: Record<string, any>;     // Event-specific payload
  diff?: Record<string, { before: any; after: any }>; // For state changes
  
  // Context
  location_id?: string;
  device_info?: DeviceInfo;
  
  // Correlation
  correlation_id?: string;      // Links related events
  causation_id?: string;         // Parent event ID
  
  // Timestamps
  occurred_at: Date;             // When event actually happened
  created_at: Date;              // When event was recorded
  
  // Retention
  expires_at?: Date;            // For temporary events
}

type EventCategory = 
  | 'commerce'
  | 'identity'
  | 'loyalty'
  | 'engagement'
  | 'support'
  | 'communication'
  | 'ai'
  | 'system';
```

**Indexes:**
- `id` (unique)
- `tenant_id + type + occurred_at`
- `subject_type + subject_id + occurred_at`
- `correlation_id`
- `occurred_at` (TTL index for expiration)

**Event Envelope:**
```typescript
interface EventEnvelope {
  id: string;
  tenant_id: string;
  type: string;
  timestamp: string;
  version: string;               // Schema version
  source: string;
  data: Record<string, any>;
}
```

---

## Knowledge Entities

### 14. Knowledge Article

An article in the knowledge base.

```typescript
interface KnowledgeArticle {
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Category
  category_id?: string;           // FK -> Category
  
  // Content
  question: string;              // For FAQ
  answer: string;
  title?: string;                // For documentation
  
  // Variations (for NLP)
  variations: string[];          // Alternative phrasings
  
  // Metadata
  tags: string[];
  language: string;
  
  // Status
  status: 'draft' | 'published' | 'archived';
  published_at?: Date;
  
  // AI Training
  ai_training: {
    trained_at?: Date;
    usage_count: number;
    helpful_count: number;
    unhelpful_count: number;
    fallback_to?: string;        // Article ID to fallback to
  };
  
  // SEO
  meta_title?: string;
  meta_description?: string;
  
  // Metadata
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string;
}
```

**Indexes:**
- `id` (unique)
- `tenant_id + status`
- `tenant_id + tags`
- `question` (full-text)

---

### 15. AI Employee

An AI virtual employee.

```typescript
interface AIEmployee {
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Identity
  name: string;
  avatar_url?: string;
  title?: string;                 // "Customer Support Agent"
  
  // Type
  type: AIEmployeeType;
  
  // Configuration
  config: AIEmployeeConfig;
  
  // Behavior
  behavior: AIEmployeeBehavior;
  
  // Knowledge
  knowledge_base_ids: string[];   // FK -> KnowledgeArticle[]
  
  // Status
  status: 'active' | 'training' | 'inactive';
  activated_at?: Date;
  
  // Performance
  stats: AIEmployeeStats;
  
  // Version
  version: number;
  last_trained_at?: Date;
  
  // Metadata
  created_at: Date;
  created_by: string;
  updated_at: Date;
}

interface AIEmployeeConfig {
  working_hours: {
    enabled: boolean;
    timezone: string;
    schedule: WorkingHoursSchedule[];
  };
  
  channels: ConversationChannel[];
  languages: string[];
  
  handoff: {
    enabled: boolean;
    conditions: HandoffCondition[];
    message: string;
  };
  
  approval_required_for: string[]; // Topics needing approval
}

interface AIEmployeeBehavior {
  tone: 'formal' | 'friendly' | 'casual';
  use_emoji: boolean;
  max_response_length: number;
  traits: string[];
  disallowed_topics: string[];
}

interface AIEmployeeStats {
  total_conversations: number;
  resolved_conversations: number;
  escalated_conversations: number;
  avg_resolution_time_minutes: number;
  avg_csatscore: number;
  last_30d_conversations: number;
}

type AIEmployeeType = 
  | 'support' 
  | 'sales' 
  | 'booking' 
  | 'marketing' 
  | 'retention';
```

**Indexes:**
- `id` (unique)
- `tenant_id + type`
- `tenant_id + status`

---

## Workflow Entities

### 16. Workflow

An automated workflow.

```typescript
interface Workflow {
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  
  // Identity
  name: string;
  description?: string;
  type: WorkflowType;
  
  // Status
  status: 'draft' | 'active' | 'paused' | 'stopped';
  
  // Trigger
  trigger: WorkflowTrigger;
  
  // Steps
  steps: WorkflowStep[];
  
  // Audience (for broadcast/sequence)
  audience?: WorkflowAudience;
  
  // Stats
  stats: WorkflowStats;
  
  // Version
  version: number;
  
  // Metadata
  created_at: Date;
  created_by: string;
  updated_at: Date;
}

interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual' | 'api';
  
  // For event triggers
  event_type?: string;
  event_conditions?: WorkflowCondition[];
  
  // For schedule triggers
  schedule_cron?: string;
  schedule_timezone?: string;
}

interface WorkflowCondition {
  field: string;
  operator: string;
  value: any;
}

type WorkflowType = 'automation' | 'sequence' | 'broadcast' | 'reaction';
```

**Indexes:**
- `id` (unique)
- `tenant_id + status`
- `tenant_id + type`

---

## Consent Entities

### 17. Consent Record

Record of customer consent.

```typescript
interface ConsentRecord {
  id: string;                    // UUID
  tenant_id: string;             // FK -> Tenant
  customer_id: string;           // FK -> Customer
  
  // Consent Details
  purpose: ConsentPurpose;
  type: 'opt_in' | 'opt_out';
  
  // Channel
  channel?: ConversationChannel;
  
  // Source
  source: 'explicit' | 'implied' | 'document';
  
  // Proof
  proof?: {
    type: 'checkbox' | 'sms_reply' | 'email_click' | 'verbal';
    value: string;
    ip?: string;
    user_agent?: string;
  };
  
  // Validity
  granted_at: Date;
  expires_at?: Date;
  revoked_at?: Date;
  
  // Metadata
  created_at: Date;
}

type ConsentPurpose = 
  | 'marketing'
  | 'profiling'
  | 'third_party_sharing'
  | 'personalization'
  | 'communication';
```

**Indexes:**
- `id` (unique)
- `tenant_id + customer_id + purpose` (unique)
- `customer_id`

---

## Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIPS                               │
└─────────────────────────────────────────────────────────────────────────────┘

Tenant (1)
    │
    ├───┬── User (*)
    │   │
    │   └── Organization (*)
    │       │
    │       └── Location (*)
    │
    ├───┬── Customer (*)
    │   │
    │   ├───┬── Identity (*:1)
    │   │   │
    │   │   └──── IdentityIdentifier (*)
    │   │
    │   ├───┬── Conversation (*)
    │   │   │
    │   │   └──── Message (*)
    │   │
    │   ├───┬── Order (*)
    │   │   │
    │   │   └──── OrderItem (*)
    │   │
    │   ├───┬── CustomerSegment (*)
    │   │
    │   └───┬── ConsentRecord (*)
    │
    └───┬── Product (*)
        │
        └── Category (*)

Product (*)
    │
    └── ProductVariant (*)
```

---

## Common Fields

Every entity includes:

```typescript
interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

interface AuditFields {
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string;
}
```

---

## Validation Rules

### Phone Numbers
- Format: E.164 (`+919876543210`)
- Validation: Regex `/^\+[1-9]\d{6,14}$/`

### Email
- Format: RFC 5322
- Validation: Standard email regex

### Currency
- Format: ISO 4217 (`INR`, `USD`)
- Amount: Integer in smallest unit (paise, cents)

### Timestamps
- Format: ISO 8601
- Storage: UTC

---

## Document Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 29, 2026 | Hojai AI | Initial spec |

---

*This is the Hojai Data Model Specification.*
