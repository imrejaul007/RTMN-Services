import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import {
  Tenant,
  TenantType,
  TenantStatus,
  TenantTier,
  TenantFeatures,
  TenantQuotas,
  TenantIsolation
} from '../../types/index.js';

const DEFAULT_FEATURES: TenantFeatures = {
  eventIngestion: true,
  memoryStorage: true,
  vectorSearch: true,
  workflowRuntime: true,
  agentRuntime: false,
  whatsappAI: false,
  hyperlocal: false,
  privilegedGraph: false
};

const DEFAULT_QUOTAS: Record<TenantTier, TenantQuotas> = {
  [TenantTier.FREE]: {
    eventsPerMonth: 10000,
    memoryStorageMB: 100,
    apiCallsPerDay: 1000,
    workflows: 5,
    agents: 0,
    users: 3
  },
  [TenantTier.STARTER]: {
    eventsPerMonth: 100000,
    memoryStorageMB: 1024,
    apiCallsPerDay: 10000,
    workflows: 25,
    agents: 2,
    users: 10
  },
  [TenantTier.PROFESSIONAL]: {
    eventsPerMonth: 1000000,
    memoryStorageMB: 10240,
    apiCallsPerDay: 100000,
    workflows: 100,
    agents: 10,
    users: 50
  },
  [TenantTier.ENTERPRISE]: {
    eventsPerMonth: 10000000,
    memoryStorageMB: 102400,
    apiCallsPerDay: 1000000,
    workflows: -1, // unlimited
    agents: -1,
    users: -1
  },
  [TenantTier.PRIVILEGED]: {
    eventsPerMonth: -1,
    memoryStorageMB: -1,
    apiCallsPerDay: -1,
    workflows: -1,
    agents: -1,
    users: -1
  }
};

interface TenantDocument extends Tenant {}

const TenantSchema = new Schema<TenantDocument>(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 100 },
    type: {
      type: String,
      enum: Object.values(TenantType),
      required: true
    },
    tier: {
      type: String,
      enum: Object.values(TenantTier),
      default: TenantTier.FREE
    },
    status: {
      type: String,
      enum: Object.values(TenantStatus),
      default: TenantStatus.PENDING
    },
    namespace: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-z0-9-]+$/
    },
    features: {
      eventIngestion: { type: Boolean, default: true },
      memoryStorage: { type: Boolean, default: true },
      vectorSearch: { type: Boolean, default: true },
      workflowRuntime: { type: Boolean, default: true },
      agentRuntime: { type: Boolean, default: false },
      whatsappAI: { type: Boolean, default: false },
      hyperlocal: { type: Boolean, default: false },
      privilegedGraph: { type: Boolean, default: false }
    },
    quotas: {
      eventsPerMonth: { type: Number, default: 10000 },
      memoryStorageMB: { type: Number, default: 100 },
      apiCallsPerDay: { type: Number, default: 1000 },
      workflows: { type: Number, default: 5 },
      agents: { type: Number, default: 0 },
      users: { type: Number, default: 3 }
    },
    isolation: {
      databaseNamespace: { type: String, required: true },
      redisNamespace: { type: String, required: true },
      vectorNamespace: { type: String, required: true },
      eventNamespace: { type: String, required: true },
      encryptAtRest: { type: Boolean, default: true },
      encryptInTransit: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true,
    collection: 'tenants'
  }
);

// Indexes
TenantSchema.index({ type: 1, status: 1 });
TenantSchema.index({ namespace: 1 }, { unique: true });

// Virtual for checking if tenant is active
TenantSchema.virtual('isActive').get(function () {
  return this.status === TenantStatus.ACTIVE;
});

// Method to check if a feature is enabled
TenantSchema.methods.hasFeature = function (feature: keyof TenantFeatures): boolean {
  if (this.type === TenantType.REZ_ECOSYSTEM) return true; // REZ has all features
  return this.features[feature] ?? false;
};

// Method to check quota
TenantSchema.methods.checkQuota = function (
  metric: keyof TenantQuotas,
  value: number
): { allowed: boolean; current: number; limit: number } {
  const limit = this.quotas[metric];
  if (limit === -1) return { allowed: true, current: value, limit: -1 };

  return {
    allowed: value <= limit,
    current: value,
    limit
  };
};

// Method to apply tier quotas
TenantSchema.methods.applyTierQuotas = function (): void {
  const quotas = DEFAULT_QUOTAS[this.tier];
  if (quotas) {
    this.quotas = quotas;
  }
};

// Static method to create a new tenant
TenantSchema.statics.createTenant = async function (
  data: Partial<Tenant> & {
    name: string;
    type: TenantType;
    tier?: TenantTier;
  }
): Promise<TenantDocument> {
  const id = uuid();
  const namespace = data.namespace ?? `${data.type.toLowerCase()}-${id.slice(0, 8)}`;

  const isolation = {
    databaseNamespace: `tenant_${namespace}`,
    redisNamespace: `tenant:${namespace}`,
    vectorNamespace: `tenant_${namespace}`,
    eventNamespace: `tenant:${namespace}`,
    encryptAtRest: true,
    encryptInTransit: true
  };

  const tenant = new this({
    ...data,
    id,
    namespace,
    isolation,
    features:
      data.type === TenantType.REZ_ECOSYSTEM
        ? { ...DEFAULT_FEATURES, privilegedGraph: true }
        : DEFAULT_FEATURES
  });

  tenant.applyTierQuotas();

  await tenant.save();
  return tenant;
};

// Static method to find by namespace
TenantSchema.statics.findByNamespace = function (
  namespace: string
): Promise<TenantDocument | null> {
  return this.findOne({ namespace });
};

// Static method to find privileged tenant (REZ)
TenantSchema.statics.findPrivilegedTenant = function (): Promise<TenantDocument | null> {
  return this.findOne({ type: TenantType.REZ_ECOSYSTEM });
};

export const TenantModel: Model<TenantDocument> = mongoose.model<TenantDocument>(
  'Tenant',
  TenantSchema
);

// ============================================================================
// TENANT MANAGER SERVICE
// ============================================================================

export class TenantManager {
  /**
   * Create a new tenant with proper isolation setup
   */
  async createTenant(params: {
    name: string;
    type: TenantType;
    tier?: TenantTier;
    namespace?: string;
    features?: Partial<TenantFeatures>;
  }): Promise<Tenant> {
    // Check namespace uniqueness
    if (params.namespace) {
      const existing = await TenantModel.findByNamespace(params.namespace);
      if (existing) {
        throw new Error(`Namespace ${params.namespace} already exists`);
      }
    }

    const tenant = await TenantModel.createTenant(params);

    // Set up isolated resources for the tenant
    await this.setupTenantResources(tenant);

    return tenant.toObject();
  }

  /**
   * Set up isolated resources for a tenant
   */
  private async setupTenantResources(tenant: TenantDocument): Promise<void> {
    // Database collections are namespace through collection prefix
    // Redis uses namespace prefix
    // Vector DB uses namespace prefix
    // This is handled by the respective platform services using tenant isolation middleware

    console.log(`[TenantManager] Resources set up for tenant: ${tenant.namespace}`);
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    const tenant = await TenantModel.findById(tenantId);
    return tenant ? tenant.toObject() : null;
  }

  /**
   * Get tenant by namespace
   */
  async getTenantByNamespace(namespace: string): Promise<Tenant | null> {
    const tenant = await TenantModel.findByNamespace(namespace);
    return tenant ? tenant.toObject() : null;
  }

  /**
   * Update tenant
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<Tenant>
  ): Promise<Tenant | null> {
    const tenant = await TenantModel.findByIdAndUpdate(
      tenantId,
      { $set: updates },
      { new: true }
    );
    return tenant ? tenant.toObject() : null;
  }

  /**
   * Suspend a tenant
   */
  async suspendTenant(tenantId: string, reason?: string): Promise<Tenant | null> {
    const tenant = await TenantModel.findByIdAndUpdate(
      tenantId,
      {
        $set: {
          status: TenantStatus.SUSPENDED,
          suspendedAt: new Date()
        }
      },
      { new: true }
    );

    if (tenant) {
      console.log(`[TenantManager] Tenant suspended: ${tenant.namespace}`, { reason });
    }

    return tenant ? tenant.toObject() : null;
  }

  /**
   * Activate a tenant
   */
  async activateTenant(tenantId: string): Promise<Tenant | null> {
    const tenant = await TenantModel.findByIdAndUpdate(
      tenantId,
      {
        $set: {
          status: TenantStatus.ACTIVE,
          activatedAt: new Date()
        }
      },
      { new: true }
    );

    return tenant ? tenant.toObject() : null;
  }

  /**
   * Update tenant tier and quotas
   */
  async updateTier(
    tenantId: string,
    tier: TenantTier
  ): Promise<Tenant | null> {
    const tenant = await TenantModel.findById(tenantId);
    if (!tenant) return null;

    tenant.tier = tier;
    tenant.applyTierQuotas();
    await tenant.save();

    return tenant.toObject();
  }

  /**
   * Check and update quotas
   */
  async checkQuota(
    tenantId: string,
    metric: keyof TenantQuotas,
    currentValue: number
  ): Promise<{ allowed: boolean; limit: number }> {
    const tenant = await TenantModel.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const result = tenant.checkQuota(metric, currentValue);
    return { allowed: result.allowed, limit: result.limit };
  }

  /**
   * List all tenants with filtering
   */
  async listTenants(params?: {
    type?: TenantType;
    status?: TenantStatus;
    tier?: TenantTier;
    limit?: number;
    offset?: number;
  }): Promise<{ tenants: Tenant[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (params?.type) filter.type = params.type;
    if (params?.status) filter.status = params.status;
    if (params?.tier) filter.tier = params.tier;

    const [tenants, total] = await Promise.all([
      TenantModel.find(filter)
        .skip(params?.offset ?? 0)
        .limit(params?.limit ?? 50),
      TenantModel.countDocuments(filter)
    ]);

    return { tenants: tenants.map(t => t.toObject()), total };
  }

  /**
   * Get tenant isolation configuration
   */
  getTenantIsolation(tenant: Tenant): TenantIsolation {
    return tenant.isolation;
  }

  /**
   * Build namespace prefixes for all resources
   */
  buildNamespaceMap(tenant: Tenant): Record<string, string> {
    const ns = tenant.isolation;
    return {
      database: ns.databaseNamespace,
      redis: ns.redisNamespace,
      vector: ns.vectorNamespace,
      events: ns.eventNamespace
    };
  }
}

export const tenantManager = new TenantManager();
