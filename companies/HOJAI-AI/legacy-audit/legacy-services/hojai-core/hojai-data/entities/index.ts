/**
 * Hojai Data Platform - Canonical Entities
 * Version: 1.0 | Date: May 29, 2026
 * Purpose: Single source of truth for all entity definitions
 */

// ============================================
// BASE ENTITY
// ============================================

export interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEntity extends BaseEntity {
  created_by?: string;
  updated_by?: string;
}

// ============================================
// TENANT
// ============================================

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  type: 'internal' | 'commercial';
  industry: Industry;
  size: 'startup' | 'smb' | 'enterprise';
  email: string;
  phone?: string;
  address?: Address;
  logo_url?: string;
  primary_color?: string;
  status: 'active' | 'suspended' | 'churned';
  plan: 'starter' | 'professional' | 'enterprise';
  billing_email: string;
  billing_cycle: 'monthly' | 'yearly';
  suspended_at?: string;
}

export type Industry =
  | 'retail'
  | 'healthcare'
  | 'hospitality'
  | 'jewellery'
  | 'education'
  | 'finance'
  | 'real_estate';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// ============================================
// USER
// ============================================

export interface User extends BaseEntity {
  tenant_id: string;
  email: string;
  phone?: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  organization_id?: string;
  department?: string;
  title?: string;
  status: 'active' | 'invited' | 'disabled';
  last_login_at?: string;
  created_by: string;
}

export type UserRole = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';

// ============================================
// ORGANIZATION
// ============================================

export interface Organization extends BaseEntity {
  tenant_id: string;
  name: string;
  code: string;
  type: OrgType;
  location_id?: string;
  parent_id?: string;
  contact_email?: string;
  contact_phone?: string;
  status: 'active' | 'inactive';
}

export type OrgType = 'store' | 'department' | 'region' | 'franchise' | 'warehouse';

// ============================================
// LOCATION
// ============================================

export interface Location extends BaseEntity {
  tenant_id: string;
  name: string;
  type: LocationType;
  address: Address;
  coordinates: GeoPoint;
  zone: ZoneHierarchy;
  operating_hours: OperatingHours;
  status: 'active' | 'temporarily_closed' | 'permanent_closed';
}

export type LocationType = 'store' | 'warehouse' | 'office' | 'popup' | 'kiosk';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ZoneHierarchy {
  city: string;
  district?: string;
  neighborhood?: string;
  micro_zone?: string;
  venue_cluster?: string;
}

export interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
    is_closed: boolean;
  };
}

// ============================================
// CUSTOMER
// ============================================

export interface Customer extends BaseEntity {
  tenant_id: string;
  phone?: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location_id?: string;
  address?: Address;
  tags: string[];
  lifetime_value: number;
  order_count: number;
  avg_order_value: number;
  last_order_date?: string;
  first_interaction_at?: string;
  last_interaction_at?: string;
  churn_risk: 'low' | 'medium' | 'high';
  engagement_score: number;
  segments: string[];
  preferences: CustomerPreferences;
  status: 'active' | 'inactive' | 'blocked';
}

export interface CustomerPreferences {
  language: string;
  notification_channel: 'whatsapp' | 'sms' | 'email';
  communication_tone: 'formal' | 'friendly' | 'casual';
}

// ============================================
// IDENTITY
// ============================================

export interface Identity extends BaseEntity {
  tenant_id: string;
  primary_customer_id: string;
  identifiers: IdentityIdentifier[];
  confidence_score: number;
  resolution_method: 'rule' | 'ml' | 'manual';
  graph_data: GraphData;
  status: 'active' | 'merged' | 'flagged';
  merged_into?: string;
}

export interface IdentityIdentifier {
  type: IdentityType;
  value: string;
  customer_id?: string;
  verified: boolean;
  verified_at?: string;
  first_seen_at: string;
  last_seen_at: string;
}

export type IdentityType =
  | 'phone'
  | 'email'
  | 'device_id'
  | 'device_fingerprint'
  | 'ip_address'
  | 'cookie_id'
  | 'account_id';

export interface GraphData {
  devices: string[];
  ips: string[];
  same_household: string[];
}

// ============================================
// CONVERSATION
// ============================================

export interface Conversation extends BaseEntity {
  tenant_id: string;
  customer_id: string;
  identity_id?: string;
  channel: ConversationChannel;
  channel_conversation_id?: string;
  channel_user_id?: string;
  assigned_to_type?: 'user' | 'ai_employee';
  assigned_to_id?: string;
  status: 'open' | 'pending' | 'closed' | 'archived';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  subject?: string;
  tags: string[];
  notes?: string;
  message_count: number;
  last_message_at?: string;
  resolution_type?: 'resolved' | 'escalated' | 'closed_no_resolution';
  resolution_time_minutes?: number;
  csat_score?: number;
  csat_submitted_at?: string;
  opened_at: string;
  closed_at?: string;
}

export type ConversationChannel =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'webchat'
  | 'api';

// ============================================
// MESSAGE
// ============================================

export interface Message extends BaseEntity {
  conversation_id: string;
  tenant_id: string;
  sender_type: 'customer' | 'user' | 'ai';
  sender_id: string;
  content: string;
  content_type: MessageContentType;
  media?: MessageMedia;
  ai_metadata?: AIMetadata;
  delivery_status: DeliveryStatus;
  delivered_at?: string;
  read_at?: string;
  external_id?: string;
  external_timestamp?: string;
}

export type MessageContentType =
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

export interface MessageMedia {
  type: 'image' | 'document' | 'video' | 'audio' | 'location';
  url: string;
  thumbnail_url?: string;
  filename?: string;
  mime_type: string;
  size_bytes?: number;
}

export interface AIMetadata {
  generated: boolean;
  model?: string;
  confidence?: number;
  intent?: string;
  entities?: Record<string, string>;
}

export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'bounced';

// ============================================
// ORDER
// ============================================

export interface Order extends BaseEntity {
  tenant_id: string;
  customer_id: string;
  identity_id?: string;
  organization_id?: string;
  location_id?: string;
  order_number: string;
  type: OrderType;
  status: OrderStatus;
  status_history: OrderStatusHistory[];
  items: OrderItem[];
  item_count: number;
  subtotal: number;
  tax: number;
  discount: number;
  delivery_fee: number;
  total: number;
  currency: string;
  payment_status: PaymentStatus;
  payment_method?: string;
  paid_at?: string;
  fulfillment_status: FulfillmentStatus;
  assigned_to_user_id?: string;
  source: OrderSource;
  utm_data?: UTMData;
  attribution?: AttributionData;
  completed_at?: string;
  cancelled_at?: string;
}

export type OrderType = 'sale' | 'return' | 'exchange';
export type OrderStatus =
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

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
export type FulfillmentStatus = 'pending' | 'partial' | 'fulfilled';
export type OrderSource = 'pos' | 'online' | 'whatsapp' | 'app' | 'api';

export interface OrderStatusHistory {
  status: OrderStatus;
  changed_at: string;
  changed_by: string;
  reason?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  fulfilled_quantity?: number;
  cancelled_quantity?: number;
}

export interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface AttributionData {
  channel?: string;
  campaign?: string;
  source?: string;
  medium?: string;
}

// ============================================
// PRODUCT
// ============================================

export interface Product extends BaseEntity {
  tenant_id: string;
  category_id?: string;
  organization_ids: string[];
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: Money;
  cost_price?: Money;
  margin?: number;
  variants?: ProductVariant[];
  has_variants: boolean;
  images: ProductImage[];
  inventory_tracking: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number;
  status: 'active' | 'draft' | 'archived' | 'out_of_stock';
  available_online: boolean;
  available_in_store: boolean;
  ai_description?: string;
  search_keywords: string[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: Money;
  stock_quantity?: number;
  attributes: Record<string, string>;
}

export interface ProductImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Money {
  amount: number;
  currency: string;
}

// ============================================
// CATEGORY
// ============================================

export interface Category extends BaseEntity {
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  level: number;
  image_url?: string;
  icon?: string;
  sort_order: number;
  status: 'active' | 'inactive';
}

// ============================================
// EVENT
// ============================================

export interface HojaiEvent extends BaseEntity {
  tenant_id: string;
  type: string;
  category: EventCategory;
  source: string;
  source_id?: string;
  subject_type?: string;
  subject_id?: string;
  actor_type?: 'customer' | 'user' | 'ai' | 'system';
  actor_id?: string;
  data: Record<string, any>;
  diff?: Record<string, { before: any; after: any }>;
  location_id?: string;
  device_info?: DeviceInfo;
  correlation_id?: string;
  causation_id?: string;
  occurred_at: string;
  expires_at?: string;
}

export type EventCategory =
  | 'commerce'
  | 'identity'
  | 'loyalty'
  | 'engagement'
  | 'support'
  | 'communication'
  | 'ai'
  | 'system';

export interface DeviceInfo {
  type: 'mobile' | 'desktop' | 'tablet';
  os?: string;
  browser?: string;
  device_id?: string;
}

// ============================================
// WORKFLOW
// ============================================

export interface Workflow extends BaseEntity {
  tenant_id: string;
  name: string;
  description?: string;
  type: WorkflowType;
  status: 'draft' | 'active' | 'paused' | 'stopped';
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  version: number;
  created_by: string;
}

export type WorkflowType = 'automation' | 'sequence' | 'broadcast' | 'reaction';

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual' | 'api';
  event_type?: string;
  schedule_cron?: string;
  schedule_timezone?: string;
}

export interface WorkflowStep {
  id: string;
  order: number;
  type: 'message' | 'delay' | 'condition' | 'action' | 'ai';
  config: Record<string, any>;
}

// ============================================
// AI EMPLOYEE
// ============================================

export interface AIEmployee extends BaseEntity {
  tenant_id: string;
  name: string;
  avatar_url?: string;
  title?: string;
  type: AgentType;
  status: 'active' | 'training' | 'inactive';
  version: number;
  last_trained_at?: string;
  config: AIEmployeeConfig;
  behavior: AIEmployeeBehavior;
  knowledge_base_ids: string[];
  stats: AIEmployeeStats;
  created_by: string;
}

export type AgentType = 'support' | 'sales' | 'booking' | 'marketing' | 'retention';

export interface AIEmployeeConfig {
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
  approval_required_for: string[];
}

export interface WorkingHoursSchedule {
  day: number;
  start_time: string;
  end_time: string;
}

export interface HandoffCondition {
  type: 'keyword' | 'sentiment' | 'intent' | 'escalation_count';
  operator: 'contains' | 'eq' | 'gt';
  value: any;
}

export interface AIEmployeeBehavior {
  tone: 'formal' | 'friendly' | 'casual';
  use_emoji: boolean;
  max_response_length: number;
  traits: string[];
  disallowed_topics: string[];
}

export interface AIEmployeeStats {
  total_conversations: number;
  resolved_conversations: number;
  escalated_conversations: number;
  avg_resolution_time_minutes: number;
  avg_csat_score: number;
}

// ============================================
// SEGMENT
// ============================================

export interface CustomerSegment extends BaseEntity {
  tenant_id: string;
  name: string;
  description?: string;
  type: 'dynamic' | 'static';
  rules: SegmentRule[];
  logic: 'and' | 'or';
  customer_count: number;
  status: 'active' | 'inactive';
  created_by: string;
}

export interface SegmentRule {
  id: string;
  field: string;
  operator: SegmentOperator;
  value: any;
}

export type SegmentOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'in'
  | 'not_in'
  | 'between'
  | 'exists'
  | 'not_exists';

// ============================================
// INTELLIGENCE ENTITIES
// ============================================

export interface IntelligencePrediction extends BaseEntity {
  tenant_id: string;
  user_id?: string;
  type: PredictionType;
  model: string;
  score: number;
  confidence: number;
  features: Record<string, unknown>;
  prediction: unknown;
  metadata?: Record<string, unknown>;
}

export type PredictionType =
  | 'churn'
  | 'ltv'
  | 'propensity'
  | 'revisit'
  | 'conversion'
  | 'intent';

export interface IntelligenceRecommendation extends BaseEntity {
  tenant_id: string;
  user_id?: string;
  type: RecommendationType;
  items: RecommendationItem[];
  strategy: string;
  metadata?: Record<string, unknown>;
}

export type RecommendationType =
  | 'product'
  | 'content'
  | 'action'
  | 'personalized';

export interface RecommendationItem {
  id: string;
  type: string;
  score: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface IntelligenceInsight extends BaseEntity {
  tenant_id: string;
  user_id?: string;
  type: InsightType;
  title: string;
  description: string;
  severity: InsightSeverity;
  recommendation?: string;
  data?: Record<string, unknown>;
}

export type InsightType =
  | 'segment'
  | 'trend'
  | 'anomaly'
  | 'opportunity'
  | 'risk';

export type InsightSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

// ============================================
// EVENT ENTITIES
// ============================================

export interface EventSubscription extends BaseEntity {
  tenant_id: string;
  name: string;
  event_type: string;
  event_pattern?: string;
  handler: string;
  filter?: Record<string, unknown>;
  active: boolean;
  stats: SubscriptionStats;
}

export interface SubscriptionStats {
  received: number;
  processed: number;
  failed: number;
}

export interface EventStream extends BaseEntity {
  tenant_id: string;
  name: string;
  event_types: string[];
  retention_days: number;
}

// ============================================
// SHARED SERVICE ENTITIES
// ============================================

export interface SharedTenant extends BaseEntity {
  name: string;
  plan: TenantPlan;
  quota: TenantQuota;
  usage: TenantUsage;
  status: TenantStatus;
}

export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'trial';

export interface TenantQuota {
  api_calls: number;
  storage: number;
  users: number;
}

export interface TenantUsage {
  api_calls: number;
  storage: number;
  users: number;
}

export interface SharedApiKey extends BaseEntity {
  tenant_id: string;
  key: string;
  name: string;
  permissions: string[];
  expires_at?: string;
  last_used?: string;
  status: 'active' | 'revoked';
}

export interface SharedWebhookConfig extends BaseEntity {
  tenant_id: string;
  url: string;
  events: string[];
  secret: string;
  retries: number;
  status: 'active' | 'inactive';
}
