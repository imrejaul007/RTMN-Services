/**
 * Hojai Data Models - Main Export
 * Version: 1.0.0 | Date: May 30, 2026
 *
 * Canonical data models for Hojai AI Platform
 * All entities are tenant-scoped by default.
 */

// ============================================
// ENTITIES
// ============================================

// Tenant Entity (Priority #1)
export {
  // Types
  type Tenant,
  type TenantType,
  type TenantPlan,
  type TenantStatus,
  type Industry,
  type TenantLimits,
  type TenantContact,
  type TenantBranding,
  type TenantSettings,
  type TenantBilling,

  // Schemas
  TenantCreateSchema,
  TenantUpdateSchema,
  DEFAULT_TENANT_LIMITS,

  // Factories
  createTenant,
  upgradeTenantPlan,
  suspendTenant,
  reactivateTenant,
  churnTenant,
} from './entities/tenant';

// Consent Entity (Priority #2)
export {
  // Types
  type Consent,
  type ConsentPurpose,
  type ConsentSource,
  type ConsentStatus,
  type ConsentChannel,
  type ConsentCategory,
  type CustomerConsentPreference,
  type ConsentSummary,

  // Schemas
  ConsentCreateSchema,
  ConsentUpdateSchema,
  ConsentWithdrawalSchema,
  CONSENT_CATEGORIES,
  CONSENT_PURPOSE_LABELS,
  CONSENT_TEXT_TEMPLATES,

  // Factories
  grantConsent,
  denyConsent,
  withdrawConsent,
  isConsentValid,
  getCustomerConsentPreference,
} from './entities/consent';

// Customer Entity
export {
  // Types
  type Customer,
  type CustomerType,
  type CustomerStatus,
  type CustomerPreferences,
  type CustomerConsentStatus,
  type CustomerSummary,
  type Customer360,
  type GeoPoint,

  // Schemas
  CustomerCreateSchema,
  CustomerUpdateSchema,

  // Factories
  createCustomer,
  updateCustomerMetrics,
  updateCustomerRisk,
} from './entities/customer';

// Merchant Entity (NEW - REZ Merchant)
export {
  // Types
  type Merchant,
  type MerchantType,
  type MerchantStatus,
  type BusinessCategory,
  type OperatingHours,
  type MerchantAddress,
  type MerchantSummary,
  type MerchantMetrics,
  type MerchantHealthScore,

  // Schemas
  MerchantCreateSchema,
  MerchantUpdateSchema,
  MerchantAddressSchema,
  DEFAULT_OPERATING_HOURS,

  // Factories
  createMerchant,
  addMerchantAddress,
  updateMerchantMetrics,
  verifyMerchant,
  suspendMerchant,
  reactivateMerchant,
  getMerchantSummary,
  calculateMerchantHealth,
} from './entities/merchant';

// Knowledge Entity (Graph Model)
export {
  // Types
  type KnowledgeNode,
  type KnowledgeNodeType,
  type KnowledgeStatus,
  type KnowledgeEdge,
  type KnowledgeRelationship,
  type KnowledgeSource,
  type KnowledgeCollection,

  // Schemas
  KnowledgeNodeCreateSchema,
  KnowledgeNodeUpdateSchema,
  KnowledgeEdgeCreateSchema,
  KnowledgeCollectionCreateSchema,
  KNOWLEDGE_RELATIONSHIP_LABELS,

  // Factories
  createKnowledgeNode,
  createKnowledgeEdge,
  createKnowledgeCollection,
  markNodeHelpful,
  markNodeNotHelpful,
  updateNodeQualityScore,
  verifyNode,
  incrementNodeUsage,
  archiveNode,
  findConnectedNodes,
  buildAdjacencyList,
} from './entities/knowledge';

// Conversation Entity
export {
  type Conversation,
  type ConversationChannel,
  type ConversationStatus,
  type ConversationPriority,
  type Message,
  ConversationCreateSchema,
  ConversationUpdateSchema,
  createConversation,
  closeConversation,
} from './entities/conversation';

// Event, Workflow, Agent, Campaign Entities
export {
  // Event
  type Event,
  type EventCategory,
  type EventActorType,
  createEvent,

  // Workflow
  type Workflow,
  type WorkflowType,
  type WorkflowStatus,
  type WorkflowTrigger,
  type WorkflowStep,
  type WorkflowExecution,
  WorkflowCreateSchema,
  createWorkflow,

  // Agent
  type Agent,
  type AgentType,
  type AgentStatus,
  type AgentConfig,
  type AgentBehavior,
  type AgentStats,
  AgentCreateSchema,
  createAgent,

  // Campaign
  type Campaign,
  type CampaignType,
  type CampaignChannel,
  type CampaignStatus,
  type CampaignContent,
  type CampaignStats,
  CampaignCreateSchema,
  createCampaign,
} from './entities/event';

// ============================================
// COMMON INTERFACES
// ============================================

/**
 * Base entity with timestamps
 */
export interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta: ResponseMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  tenantId?: string;
  latencyMs?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================
// FACTORY HELPERS
// ============================================

/**
 * Create standard API response
 */
export function createResponse<T>(
  data: T,
  options?: { tenantId?: string; requestId?: string }
): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options?.requestId || `req_${Date.now()}`,
      tenantId: options?.tenantId,
    },
  };
}

/**
 * Create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIResponse<null> {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  };
}

/**
 * Generate ID with prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  BaseEntity,
  APIResponse,
  APIError,
  ResponseMeta,
  PaginatedResponse,
};


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-data-models',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
