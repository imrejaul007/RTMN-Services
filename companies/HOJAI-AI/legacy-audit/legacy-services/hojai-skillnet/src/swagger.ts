/**
 * OpenAPI/Swagger Documentation
 * HOJAI SkillNet REST API Specification
 */

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'HOJAI SkillNet API',
    description: 'AI Skill Marketplace & Lifecycle Management API',
    version: '1.1.0',
    contact: {
      name: 'HOJAI AI',
      url: 'https://hojai.ai'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:4530',
      description: 'Development server'
    },
    {
      url: 'https://api.hojai.ai/v1',
      description: 'Production server'
    }
  ],
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Predictions', description: 'ML prediction endpoints' },
    { name: 'Recommendations', description: 'Recommendation endpoints' },
    { name: 'Insights', description: 'Insight generation endpoints' },
    { name: 'Events', description: 'Event bus endpoints' },
    { name: 'Subscriptions', description: 'Subscription endpoints' },
    { name: 'Tenants', description: 'Tenant management endpoints' },
    { name: 'API Keys', description: 'API key management endpoints' }
  ],
  paths: {
    // Health
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Full health check',
        description: 'Returns comprehensive health status including MongoDB connection',
        responses: {
          '200': {
            description: 'Healthy response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    service: { type: 'string' },
                    version: { type: 'string' },
                    mongodb: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Kubernetes liveness check',
        responses: {
          '200': {
            description: 'Service is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Kubernetes readiness check (MongoDB connected)',
        responses: {
          '200': {
            description: 'Service is ready'
          },
          '503': {
            description: 'Service not ready (MongoDB disconnected)'
          }
        }
      }
    },

    // Stats
    '/stats': {
      get: {
        tags: ['Health'],
        summary: 'Service statistics',
        security: [{ TenantAuth: [] }],
        responses: {
          '200': {
            description: 'Statistics response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        predictions: { type: 'number' },
                        recommendations: { type: 'number' },
                        insights: { type: 'number' },
                        events: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    // Predictions
    '/predictions': {
      get: {
        tags: ['Predictions'],
        summary: 'List predictions',
        security: [{ TenantAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          '200': {
            description: 'Predictions list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        predictions: { type: 'array', items: { $ref: '#/components/schemas/Prediction' } },
                        count: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/predictions/churn': {
      post: {
        tags: ['Predictions'],
        summary: 'Create churn prediction',
        security: [{ TenantAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['features'],
                properties: {
                  userId: { type: 'string' },
                  features: {
                    type: 'object',
                    description: 'Prediction features (daysSinceActivity, engagementScore, totalOrders)',
                    example: {
                      daysSinceActivity: 30,
                      engagementScore: 0.5,
                      totalOrders: 5
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Prediction created' },
          '400': { description: 'Invalid request' }
        }
      }
    },
    '/predictions/ltv': {
      post: {
        tags: ['Predictions'],
        summary: 'Create LTV prediction',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  features: {
                    type: 'object',
                    properties: {
                      avgOrderValue: { type: 'number' },
                      orderFrequency: { type: 'number' },
                      customerAge: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Prediction created' }
        }
      }
    },
    '/predictions/intent': {
      post: {
        tags: ['Predictions'],
        summary: 'Create intent prediction',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  features: {
                    type: 'object',
                    properties: {
                      cartValue: { type: 'number' },
                      pageViews: { type: 'number' },
                      recentSearches: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Prediction created' }
        }
      }
    },

    // Recommendations
    '/recommendations': {
      get: {
        tags: ['Recommendations'],
        summary: 'List recommendations',
        security: [{ TenantAuth: [] }],
        responses: {
          '200': {
            description: 'Recommendations list'
          }
        }
      }
    },
    '/recommendations/product': {
      post: {
        tags: ['Recommendations'],
        summary: 'Create product recommendations',
        security: [{ TenantAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Recommendation created' }
        }
      }
    },

    // Insights
    '/insights': {
      get: {
        tags: ['Insights'],
        summary: 'List insights',
        security: [{ TenantAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          '200': {
            description: 'Insights list'
          }
        }
      },
      post: {
        tags: ['Insights'],
        summary: 'Create insight',
        security: [{ TenantAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'title'],
                properties: {
                  userId: { type: 'string' },
                  type: { type: 'string', enum: ['segment', 'trend', 'anomaly', 'opportunity', 'risk'] },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
                  recommendation: { type: 'string' },
                  data: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Insight created' }
        }
      }
    },

    // Events
    '/events': {
      get: {
        tags: ['Events'],
        summary: 'List events',
        security: [{ TenantAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            description: 'Events list'
          }
        }
      },
      post: {
        tags: ['Events'],
        summary: 'Publish event',
        security: [{ TenantAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'data'],
                properties: {
                  type: { type: 'string', description: 'Event type (e.g., order.created)' },
                  source: { type: 'string' },
                  data: { type: 'object', description: 'Event payload' },
                  metadata: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Event published' }
        }
      }
    },

    // Subscriptions
    '/subscriptions': {
      get: {
        tags: ['Subscriptions'],
        summary: 'List subscriptions',
        security: [{ TenantAuth: [] }],
        responses: {
          '200': {
            description: 'Subscriptions list'
          }
        }
      },
      post: {
        tags: ['Subscriptions'],
        summary: 'Create subscription',
        security: [{ TenantAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'eventType', 'handler'],
                properties: {
                  name: { type: 'string' },
                  eventType: { type: 'string' },
                  eventPattern: { type: 'string' },
                  handler: { type: 'string', format: 'uri' },
                  filter: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Subscription created' }
        }
      }
    },

    // Tenants
    '/tenants': {
      get: {
        tags: ['Tenants'],
        summary: 'List tenants',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          '200': {
            description: 'Tenants list'
          }
        }
      },
      post: {
        tags: ['Tenants'],
        summary: 'Create tenant',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  plan: { type: 'string', enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Tenant created' }
        }
      }
    },

    // API Keys
    '/apikeys': {
      post: {
        tags: ['API Keys'],
        summary: 'Create API key',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tenantId', 'name'],
                properties: {
                  tenantId: { type: 'string' },
                  name: { type: 'string' },
                  permissions: { type: 'array', items: { type: 'string' }, default: ['read'] }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'API key created' }
        }
      }
    }
  },

  components: {
    securitySchemes: {
      TenantAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Tenant-Id',
        description: 'Tenant identifier'
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Bearer JWT or API key'
      }
    },

    schemas: {
      Prediction: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenant_id: { type: 'string' },
          user_id: { type: 'string' },
          type: { type: 'string', enum: ['churn', 'ltv', 'intent', 'propensity', 'revisit', 'conversion'] },
          model: { type: 'string' },
          score: { type: 'number' },
          confidence: { type: 'number' },
          features: { type: 'object' },
          prediction: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },

      Recommendation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenant_id: { type: 'string' },
          type: { type: 'string', enum: ['product', 'content', 'action', 'personalized'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                score: { type: 'number' },
                reason: { type: 'string' }
              }
            }
          },
          strategy: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },

      Insight: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenant_id: { type: 'string' },
          type: { type: 'string', enum: ['segment', 'trend', 'anomaly', 'opportunity', 'risk'] },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          recommendation: { type: 'string' },
          data: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },

      Event: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenant_id: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string' },
          data: { type: 'object' },
          metadata: { type: 'object' },
          occurred_at: { type: 'string', format: 'date-time' }
        }
      },

      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenant_id: { type: 'string' },
          name: { type: 'string' },
          event_type: { type: 'string' },
          event_pattern: { type: 'string' },
          handler: { type: 'string', format: 'uri' },
          active: { type: 'boolean' },
          stats: {
            type: 'object',
            properties: {
              received: { type: 'integer' },
              processed: { type: 'integer' },
              failed: { type: 'integer' }
            }
          },
          created_at: { type: 'string', format: 'date-time' }
        }
      },

      Tenant: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          plan: { type: 'string', enum: ['free', 'starter', 'pro', 'enterprise'] },
          quota: {
            type: 'object',
            properties: {
              api_calls: { type: 'integer' },
              storage: { type: 'integer' },
              users: { type: 'integer' }
            }
          },
          usage: {
            type: 'object',
            properties: {
              api_calls: { type: 'integer' },
              storage: { type: 'integer' },
              users: { type: 'integer' }
            }
          },
          status: { type: 'string', enum: ['active', 'suspended', 'trial'] },
          created_at: { type: 'string', format: 'date-time' }
        }
      },

      ApiKey: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenant_id: { type: 'string' },
          name: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'revoked'] },
          created_at: { type: 'string', format: 'date-time' }
        }
      },

      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

export default openapiSpec;
