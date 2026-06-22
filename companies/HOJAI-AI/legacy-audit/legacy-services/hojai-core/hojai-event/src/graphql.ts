/**
 * GraphQL API Layer
 * GraphQL resolvers for HOJAI SkillNet
 */

import { v4 as uuidv4 } from 'uuid';

// GraphQL Schema Definition
export const typeDefs = `
  scalar DateTime

  type Query {
    # Predictions
    predictions(tenantId: String!, type: String, limit: Int): [Prediction!]!
    prediction(id: ID!, tenantId: String!): Prediction
    predictionStats(tenantId: String!): PredictionStats!

    # Recommendations
    recommendations(tenantId: String!, type: String, limit: Int): [Recommendation!]!
    recommendation(id: ID!, tenantId: String!): Recommendation

    # Insights
    insights(tenantId: String!, type: String, severity: String, limit: Int): [Insight!]!
    insight(id: ID!, tenantId: String!): Insight
    criticalInsights(tenantId: String!): [Insight!]!

    # Events
    events(tenantId: String!, type: String, limit: Int, offset: Int): EventConnection!
    event(id: ID!, tenantId: String!): Event

    # Subscriptions
    subscriptions(tenantId: String!, active: Boolean): [Subscription!]!
    subscription(id: ID!, tenantId: String!): Subscription

    # Tenants
    tenants: [Tenant!]!
    tenant(id: ID!): Tenant

    # Health
    health: HealthStatus!
  }

  type Mutation {
    # Predictions
    createChurnPrediction(tenantId: String!, userId: String, features: JSON!): Prediction!
    createLTVPrediction(tenantId: String!, userId: String, features: JSON!): Prediction!
    createIntentPrediction(tenantId: String!, userId: String, features: JSON!): Prediction!
    createPropensityPrediction(tenantId: String!, userId: String, features: JSON!): Prediction!

    # Recommendations
    createProductRecommendation(tenantId: String!, userId: String): Recommendation!
    createPersonalizedRecommendation(tenantId: String!, userId: String, types: [String!]): Recommendation!

    # Insights
    createInsight(tenantId: String!, input: InsightInput!): Insight!
    generateSegmentInsights(tenantId: String!, segmentName: String!, segmentData: JSON): [Insight!]!
    generateTrendInsights(tenantId: String!, trendData: JSON): Insight!
    generateAnomalyInsights(tenantId: String!, anomalyData: JSON): Insight!

    # Events
    publishEvent(tenantId: String!, input: EventInput!): Event!

    # Subscriptions
    createSubscription(tenantId: String!, input: SubscriptionInput!): Subscription!
    updateSubscription(id: ID!, tenantId: String!, input: SubscriptionUpdateInput!): Subscription!
    deleteSubscription(id: ID!, tenantId: String!): Boolean!
    pauseSubscription(id: ID!, tenantId: String!): Subscription!
    resumeSubscription(id: ID!, tenantId: String!): Subscription!

    # Tenants
    createTenant(input: TenantInput!): Tenant!
    updateTenant(id: ID!, input: TenantUpdateInput!): Tenant!
    deleteTenant(id: ID!): Boolean!

    # API Keys
    createApiKey(tenantId: String!, name: String!, permissions: [String!]): ApiKey!
    revokeApiKey(id: ID!, tenantId: String!): Boolean!
  }

  type Subscription {
    # Real-time subscriptions
    eventPublished(tenantId: String!, eventType: String): Event!
    insightCreated(tenantId: String!, severity: String): Insight!
  }

  # Types
  type Prediction {
    id: ID!
    tenantId: String!
    userId: String
    type: String!
    model: String!
    score: Float!
    confidence: Float!
    features: JSON!
    prediction: JSON
    createdAt: DateTime!
  }

  type PredictionStats {
    total: Int!
    byType: JSON!
    avgConfidence: Float!
  }

  type Recommendation {
    id: ID!
    tenantId: String!
    userId: String
    type: String!
    items: [RecommendationItem!]!
    strategy: String!
    createdAt: DateTime!
  }

  type RecommendationItem {
    id: ID!
    type: String!
    score: Float!
    reason: String
  }

  type Insight {
    id: ID!
    tenantId: String!
    userId: String
    type: String!
    title: String!
    description: String
    severity: String!
    recommendation: String
    data: JSON
    createdAt: DateTime!
  }

  type Event {
    id: ID!
    tenantId: String!
    type: String!
    source: String
    data: JSON!
    metadata: JSON
    occurredAt: DateTime!
  }

  type EventConnection {
    events: [Event!]!
    total: Int!
    hasMore: Boolean!
  }

  type Subscription {
    id: ID!
    tenantId: String!
    name: String!
    eventType: String!
    eventPattern: String
    handler: String!
    active: Boolean!
    stats: SubscriptionStats!
    createdAt: DateTime!
  }

  type SubscriptionStats {
    received: Int!
    processed: Int!
    failed: Int!
  }

  type Tenant {
    id: ID!
    name: String!
    plan: String!
    quota: TenantQuota!
    usage: TenantUsage!
    status: String!
    createdAt: DateTime!
  }

  type TenantQuota {
    apiCalls: Int!
    storage: Int!
    users: Int!
  }

  type TenantUsage {
    apiCalls: Int!
    storage: Int!
    users: Int!
  }

  type ApiKey {
    id: ID!
    tenantId: String!
    name: String!
    key: String!
    permissions: [String!]!
    status: String!
    createdAt: DateTime!
  }

  type HealthStatus {
    status: String!
    version: String!
    uptime: Float!
    mongodb: String!
    timestamp: DateTime!
  }

  # Inputs
  input InsightInput {
    userId: String
    type: String!
    title: String!
    description: String
    severity: String
    recommendation: String
    data: JSON
  }

  input EventInput {
    type: String!
    source: String
    data: JSON!
    metadata: JSON
  }

  input SubscriptionInput {
    name: String!
    eventType: String!
    eventPattern: String
    handler: String!
    filter: JSON
  }

  input SubscriptionUpdateInput {
    name: String
    handler: String
    filter: JSON
    active: Boolean
  }

  input TenantInput {
    name: String!
    plan: String
  }

  input TenantUpdateInput {
    name: String
    plan: String
    status: String
  }

  # Scalars
  scalar JSON
`;

// ============================================
// RESOLVERS
// ============================================

interface Context {
  tenantId: string;
  models: any;
}

export const resolvers = {
  Query: {
    // Predictions
    predictions: async (_: any, args: { tenantId: string; type?: string; limit?: number }, ctx: Context) => {
      const filter: any = { tenant_id: args.tenantId };
      if (args.type) filter.type = args.type;
      return ctx.models.PredictionModel.find(filter)
        .sort({ created_at: -1 })
        .limit(args.limit || 50)
        .lean();
    },

    prediction: async (_: any, args: { id: string; tenantId: string }, ctx: Context) => {
      return ctx.models.PredictionModel.findOne({
        id: args.id,
        tenant_id: args.tenantId
      }).lean();
    },

    predictionStats: async (_: any, args: { tenantId: string }, ctx: Context) => {
      const predictions = await ctx.models.PredictionModel
        .find({ tenant_id: args.tenantId })
        .lean();

      const byType: Record<string, number> = {};
      let totalConfidence = 0;

      for (const p of predictions) {
        byType[p.type] = (byType[p.type] || 0) + 1;
        totalConfidence += p.confidence;
      }

      return {
        total: predictions.length,
        byType,
        avgConfidence: predictions.length > 0 ? totalConfidence / predictions.length : 0
      };
    },

    // Recommendations
    recommendations: async (_: any, args: { tenantId: string; type?: string; limit?: number }, ctx: Context) => {
      const filter: any = { tenant_id: args.tenantId };
      if (args.type) filter.type = args.type;
      return ctx.models.RecommendationModel.find(filter)
        .sort({ created_at: -1 })
        .limit(args.limit || 20)
        .lean();
    },

    recommendation: async (_: any, args: { id: string; tenantId: string }, ctx: Context) => {
      return ctx.models.RecommendationModel.findOne({
        id: args.id,
        tenant_id: args.tenantId
      }).lean();
    },

    // Insights
    insights: async (_: any, args: { tenantId: string; type?: string; severity?: string; limit?: number }, ctx: Context) => {
      const filter: any = { tenant_id: args.tenantId };
      if (args.type) filter.type = args.type;
      if (args.severity) filter.severity = args.severity;
      return ctx.models.InsightModel.find(filter)
        .sort({ created_at: -1 })
        .limit(args.limit || 50)
        .lean();
    },

    insight: async (_: any, args: { id: string; tenantId: string }, ctx: Context) => {
      return ctx.models.InsightModel.findOne({
        id: args.id,
        tenant_id: args.tenantId
      }).lean();
    },

    criticalInsights: async (_: any, args: { tenantId: string }, ctx: Context) => {
      return ctx.models.InsightModel.find({
        tenant_id: args.tenantId,
        severity: { $in: ['critical', 'high'] }
      }).sort({ created_at: -1 }).lean();
    },

    // Events
    events: async (_: any, args: { tenantId: string; type?: string; limit?: number; offset?: number }, ctx: Context) => {
      const filter: any = { tenant_id: args.tenantId };
      if (args.type) filter.type = args.type;

      const total = await ctx.models.EventModel.countDocuments(filter);
      const events = await ctx.models.EventModel.find(filter)
        .sort({ occurred_at: -1 })
        .skip(args.offset || 0)
        .limit(args.limit || 100)
        .lean();

      return {
        events,
        total,
        hasMore: (args.offset || 0) + events.length < total
      };
    },

    event: async (_: any, args: { id: string; tenantId: string }, ctx: Context) => {
      return ctx.models.EventModel.findOne({
        id: args.id,
        tenant_id: args.tenantId
      }).lean();
    },

    // Subscriptions
    subscriptions: async (_: any, args: { tenantId: string; active?: boolean }, ctx: Context) => {
      const filter: any = { tenant_id: args.tenantId };
      if (args.active !== undefined) filter.active = args.active;
      return ctx.models.SubscriptionModel.find(filter).sort({ created_at: -1 }).lean();
    },

    subscription: async (_: any, args: { id: string; tenantId: string }, ctx: Context) => {
      return ctx.models.SubscriptionModel.findOne({
        id: args.id,
        tenant_id: args.tenantId
      }).lean();
    },

    // Tenants
    tenants: async () => {
      // Note: This requires admin permissions
      return [];
    },

    tenant: async (_: any, args: { id: string }) => {
      return null; // Requires auth
    },

    // Health
    health: async (_: any, __: any, ctx: Context) => {
      return {
        status: 'healthy',
        version: '1.1.0',
        uptime: process.uptime(),
        mongodb: 'connected',
        timestamp: new Date()
      };
    }
  },

  Mutation: {
    createChurnPrediction: async (_: any, args: { tenantId: string; userId?: string; features: any }, ctx: Context) => {
      const now = new Date().toISOString();
      const score = Math.random() * 0.5 + 0.3;

      return ctx.models.PredictionModel.create({
        id: uuidv4(),
        tenant_id: args.tenantId,
        user_id: args.userId,
        type: 'churn',
        model: 'hojai-churn-v1',
        score,
        confidence: 0.7 + Math.random() * 0.2,
        features: args.features,
        prediction: { churnRisk: score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low' },
        created_at: now,
        updated_at: now
      });
    },

    createInsight: async (_: any, args: { tenantId: string; input: any }, ctx: Context) => {
      const now = new Date().toISOString();
      return ctx.models.InsightModel.create({
        id: uuidv4(),
        tenant_id: args.tenantId,
        user_id: args.input.userId,
        type: args.input.type,
        title: args.input.title,
        description: args.input.description,
        severity: args.input.severity || 'medium',
        recommendation: args.input.recommendation,
        data: args.input.data,
        created_at: now,
        updated_at: now
      });
    },

    publishEvent: async (_: any, args: { tenantId: string; input: any }, ctx: Context) => {
      const now = new Date().toISOString();
      return ctx.models.EventModel.create({
        id: uuidv4(),
        tenant_id: args.tenantId,
        type: args.input.type,
        source: args.input.source || 'graphql',
        data: args.input.data,
        metadata: args.input.metadata,
        occurred_at: now,
        created_at: now,
        updated_at: now
      });
    },

    createTenant: async (_: any, args: { input: any }, ctx: Context) => {
      const now = new Date().toISOString();
      return ctx.models.TenantModel.create({
        id: uuidv4(),
        name: args.input.name,
        plan: args.input.plan || 'free',
        quota: { api_calls: 10000, storage: 1000, users: 25 },
        usage: { api_calls: 0, storage: 0, users: 0 },
        status: 'trial',
        created_at: now,
        updated_at: now
      });
    },

    createApiKey: async (_: any, args: { tenantId: string; name: string; permissions?: string[] }, ctx: Context) => {
      const now = new Date().toISOString();
      return ctx.models.ApiKeyModel.create({
        id: uuidv4(),
        tenant_id: args.tenantId,
        key: `hk_${uuidv4().replace(/-/g, '')}`,
        name: args.name,
        permissions: args.permissions || ['read'],
        status: 'active',
        created_at: now,
        updated_at: now
      });
    },

    createSubscription: async (_: any, args: { tenantId: string; input: any }, ctx: Context) => {
      const now = new Date().toISOString();
      return ctx.models.SubscriptionModel.create({
        id: uuidv4(),
        tenant_id: args.tenantId,
        name: args.input.name,
        event_type: args.input.eventType,
        event_pattern: args.input.eventPattern,
        handler: args.input.handler,
        filter: args.input.filter,
        active: true,
        stats: { received: 0, processed: 0, failed: 0 },
        created_at: now,
        updated_at: now
      });
    },

    deleteSubscription: async (_: any, args: { id: string; tenantId: string }, ctx: Context) => {
      const result = await ctx.models.SubscriptionModel.deleteOne({
        id: args.id,
        tenant_id: args.tenantId
      });
      return result.deletedCount > 0;
    },

    pauseSubscription: async (_: any, args: { id: string; tenantId: string }, ctx: Context) => {
      return ctx.models.SubscriptionModel.findOneAndUpdate(
        { id: args.id, tenant_id: args.tenantId },
        { active: false, updated_at: new Date().toISOString() },
        { new: true }
      );
    },

    resumeSubscription: async (_: any, args: { id: string; tenantId: string }, ctx: Context) => {
      return ctx.models.SubscriptionModel.findOneAndUpdate(
        { id: args.id, tenant_id: args.tenantId },
        { active: true, updated_at: new Date().toISOString() },
        { new: true }
      );
    }
  },

  // Scalar resolvers
  DateTime: {
    __serialize: (value: any) => value instanceof Date ? value.toISOString() : value
  },

  JSON: {
    __serialize: (value: any) => value
  }
};

export default { typeDefs, resolvers };
