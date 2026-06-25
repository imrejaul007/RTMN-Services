/**
 * OpenAPI Spec Generator for HOJAI Cloud
 * Generates OpenAPI 3.0 specs for all services
 */

export function generateOpenAPISpec(service) {
  const specs = {
    'hojai-cloud': {
      openapi: '3.0.0',
      info: {
        title: 'HOJAI Cloud API',
        version: '1.2.0',
        description: 'Deploy target for npx hojai deploy'
      },
      servers: [{ url: 'http://localhost:4380' }],
      paths: {
        '/api/v1/deploy': {
          post: {
            tags: ['Deployments'],
            summary: 'Deploy a project',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name', 'manifest'],
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      manifest: { type: 'object' },
                      files: { type: 'object' }
                    }
                  }
                }
              }
            },
            responses: {
              '201': { description: 'Deployment created' },
              '400': { description: 'Invalid request' }
            }
          }
        },
        '/api/v1/deployments': {
          get: {
            tags: ['Deployments'],
            summary: 'List all deployments',
            responses: { '200': { description: 'Success' } }
          }
        },
        '/api/v1/deployments/{id}': {
          get: {
            tags: ['Deployments'],
            summary: 'Get deployment',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          },
          delete: {
            tags: ['Deployments'],
            summary: 'Delete deployment',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Deleted' } }
          }
        },
        '/api/v1/deployments/{id}/rollback': {
          post: {
            tags: ['Deployments'],
            summary: 'Rollback deployment',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '201': { description: 'Rollback created' } }
          }
        },
        '/api/v1/previews': {
          get: { tags: ['Previews'], summary: 'List previews', responses: { '200': { description: 'Success' } } },
          post: { tags: ['Previews'], summary: 'Create preview', responses: { '201': { description: 'Created' } } }
        },
        '/api/v1/domains': {
          get: { tags: ['Domains'], summary: 'List domains', responses: { '200': { description: 'Success' } } },
          post: { tags: ['Domains'], summary: 'Add domain', responses: { '201': { description: 'Added' } } }
        },
        '/api/v1/certificates': {
          get: { tags: ['Certificates'], summary: 'List certificates', responses: { '200': { description: 'Success' } } },
          post: { tags: ['Certificates'], summary: 'Provision certificate', responses: { '201': { description: 'Created' } } }
        }
      }
    },
    'app-store-api': {
      openapi: '3.0.0',
      info: {
        title: 'HOJAI App Store API',
        version: '1.0.0',
        description: 'Catalog for skills, agents, workflows, templates'
      },
      servers: [{ url: 'http://localhost:4400' }],
      paths: {
        '/api/v1/apps': {
          get: {
            tags: ['Apps'],
            summary: 'List apps',
            parameters: [
              { name: 'type', in: 'query', schema: { type: 'string' } },
              { name: 'category', in: 'query', schema: { type: 'string' } },
              { name: 'search', in: 'query', schema: { type: 'string' } }
            ],
            responses: { '200': { description: 'Success' } }
          },
          post: {
            tags: ['Apps'],
            summary: 'Create app',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      type: { type: 'string', enum: ['skill', 'agent', 'workflow', 'template', 'industry-os'] },
                      category: { type: 'string' },
                      price: { type: 'number' }
                    }
                  }
                }
              }
            },
            responses: { '201': { description: 'Created' } }
          }
        },
        '/api/v1/apps/{id}': {
          get: { tags: ['Apps'], summary: 'Get app', responses: { '200': { description: 'Success' } } },
          patch: { tags: ['Apps'], summary: 'Update app', responses: { '200': { description: 'Updated' } } },
          delete: { tags: ['Apps'], summary: 'Delete app', responses: { '200': { description: 'Deleted' } } }
        },
        '/api/v1/apps/{id}/install': {
          post: { tags: ['Apps'], summary: 'Install app', responses: { '201': { description: 'Installed' } } },
          delete: { tags: ['Apps'], summary: 'Uninstall app', responses: { '200': { description: 'Uninstalled' } } }
        },
        '/api/v1/apps/{id}/reviews': {
          get: { tags: ['Reviews'], summary: 'Get reviews', responses: { '200': { description: 'Success' } } },
          post: { tags: ['Reviews'], summary: 'Create review', responses: { '201': { description: 'Created' } } }
        },
        '/api/v1/categories': {
          get: { tags: ['Categories'], summary: 'List categories', responses: { '200': { description: 'Success' } } }
        },
        '/api/v1/search': {
          get: {
            tags: ['Search'],
            summary: 'Search apps',
            parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          }
        }
      }
    },
    'cost-tracker': {
      openapi: '3.0.0',
      info: {
        title: 'HOJAI Cost Tracker API',
        version: '1.0.0',
        description: 'AI usage metering and billing'
      },
      servers: [{ url: 'http://localhost:4410' }],
      paths: {
        '/api/v1/usage': {
          post: {
            tags: ['Usage'],
            summary: 'Track usage',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string' },
                      projectId: { type: 'string' },
                      model: { type: 'string' },
                      inputTokens: { type: 'number' },
                      outputTokens: { type: 'number' }
                    }
                  }
                }
              }
            },
            responses: { '201': { description: 'Tracked' } }
          },
          get: { tags: ['Usage'], summary: 'Get usage records', responses: { '200': { description: 'Success' } } }
        },
        '/api/v1/usage/summary': {
          get: {
            tags: ['Usage'],
            summary: 'Get usage summary',
            parameters: [
              { name: 'userId', in: 'query', schema: { type: 'string' } },
              { name: 'projectId', in: 'query', schema: { type: 'string' } }
            ],
            responses: { '200': { description: 'Success' } }
          }
        },
        '/api/v1/budgets': {
          post: { tags: ['Budgets'], summary: 'Set budget', responses: { '201': { description: 'Created' } } }
        },
        '/api/v1/budgets/{userId}': {
          get: { tags: ['Budgets'], summary: 'Get budget', responses: { '200': { description: 'Success' } } }
        },
        '/api/v1/pricing': {
          get: { tags: ['Pricing'], summary: 'Get pricing', responses: { '200': { description: 'Success' } } }
        }
      }
    },
    'secrets-manager': {
      openapi: '3.0.0',
      info: {
        title: 'HOJAI Secrets Manager API',
        version: '1.0.0',
        description: 'Encrypted credential storage'
      },
      servers: [{ url: 'http://localhost:4420' }],
      paths: {
        '/api/v1/secrets': {
          get: {
            tags: ['Secrets'],
            summary: 'List secrets',
            parameters: [{ name: 'userId', in: 'query', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          },
          post: {
            tags: ['Secrets'],
            summary: 'Create secret',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name', 'value', 'userId'],
                    properties: {
                      name: { type: 'string' },
                      value: { type: 'string' },
                      userId: { type: 'string' },
                      type: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: { '201': { description: 'Created' } }
          }
        },
        '/api/v1/secrets/{id}': {
          get: { tags: ['Secrets'], summary: 'Get secret (decrypted)', responses: { '200': { description: 'Success' } } },
          patch: { tags: ['Secrets'], summary: 'Update secret', responses: { '200': { description: 'Updated' } } },
          delete: { tags: ['Secrets'], summary: 'Delete secret', responses: { '200': { description: 'Deleted' } } }
        },
        '/api/v1/secrets/{id}/rotate': {
          post: { tags: ['Secrets'], summary: 'Rotate secret', responses: { '200': { description: 'Rotated' } } }
        },
        '/api/v1/secrets/{id}/logs': {
          get: { tags: ['Secrets'], summary: 'Get access logs', responses: { '200': { description: 'Success' } } }
        }
      }
    },
    'voice-studio-api': {
      openapi: '3.0.0',
      info: {
        title: 'HOJAI Voice Studio API',
        version: '1.0.0',
        description: 'Voice agent management'
      },
      servers: [{ url: 'http://localhost:4430' }],
      paths: {
        '/api/v1/agents': {
          get: {
            tags: ['Agents'],
            summary: 'List voice agents',
            parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          },
          post: {
            tags: ['Agents'],
            summary: 'Create voice agent',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      language: { type: 'string' },
                      voice: { type: 'object' },
                      transcription: { type: 'object' }
                    }
                  }
                }
              }
            },
            responses: { '201': { description: 'Created' } }
          }
        },
        '/api/v1/agents/{id}': {
          get: { tags: ['Agents'], summary: 'Get agent', responses: { '200': { description: 'Success' } } },
          patch: { tags: ['Agents'], summary: 'Update agent', responses: { '200': { description: 'Updated' } } },
          delete: { tags: ['Agents'], summary: 'Delete agent', responses: { '200': { description: 'Deleted' } } }
        },
        '/api/v1/agents/{id}/activate': {
          post: { tags: ['Agents'], summary: 'Activate agent', responses: { '200': { description: 'Activated' } } }
        },
        '/api/v1/agents/{id}/pause': {
          post: { tags: ['Agents'], summary: 'Pause agent', responses: { '200': { description: 'Paused' } } }
        },
        '/api/v1/conversations': {
          get: { tags: ['Conversations'], summary: 'List conversations', responses: { '200': { description: 'Success' } } },
          post: { tags: ['Conversations'], summary: 'Start conversation', responses: { '201': { description: 'Started' } } }
        }
      }
    },
    'workflow-builder-api': {
      openapi: '3.0.0',
      info: {
        title: 'HOJAI Workflow Builder API',
        version: '1.0.0',
        description: 'DAG workflow management'
      },
      servers: [{ url: 'http://localhost:4440' }],
      paths: {
        '/api/v1/workflows': {
          get: {
            tags: ['Workflows'],
            summary: 'List workflows',
            parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          },
          post: {
            tags: ['Workflows'],
            summary: 'Create workflow',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      nodes: { type: 'array' },
                      edges: { type: 'array' }
                    }
                  }
                }
              }
            },
            responses: { '201': { description: 'Created' } }
          }
        },
        '/api/v1/workflows/{id}': {
          get: { tags: ['Workflows'], summary: 'Get workflow', responses: { '200': { description: 'Success' } } },
          patch: { tags: ['Workflows'], summary: 'Update workflow', responses: { '200': { description: 'Updated' } } },
          delete: { tags: ['Workflows'], summary: 'Delete workflow', responses: { '200': { description: 'Deleted' } } }
        },
        '/api/v1/workflows/{id}/validate': {
          post: { tags: ['Workflows'], summary: 'Validate workflow', responses: { '200': { description: 'Valid' } } }
        },
        '/api/v1/workflows/{id}/execute': {
          post: { tags: ['Workflows'], summary: 'Execute workflow', responses: { '201': { description: 'Started' } } }
        },
        '/api/v1/workflows/{id}/nodes': {
          post: { tags: ['Nodes'], summary: 'Add node', responses: { '201': { description: 'Added' } } }
        },
        '/api/v1/workflows/{id}/edges': {
          post: { tags: ['Edges'], summary: 'Add edge', responses: { '201': { description: 'Added' } } }
        },
        '/api/v1/executions': {
          get: { tags: ['Executions'], summary: 'List executions', responses: { '200': { description: 'Success' } } }
        }
      }
    }
  };

  return specs[service] || null;
}

export function getAllEndpoints() {
  return [
    {
      service: 'HOJAI Cloud',
      port: 4380,
      version: '1.2.0',
      description: 'Deploy target with auto-respawn, SSL, custom domains, previews, rollbacks',
      endpoints: 15
    },
    {
      service: 'App Store API',
      port: 4400,
      version: '1.0.0',
      description: 'Catalog for skills, agents, workflows, templates',
      endpoints: 18
    },
    {
      service: 'Cost Tracker',
      port: 4410,
      version: '1.0.0',
      description: 'AI usage metering and billing',
      endpoints: 12
    },
    {
      service: 'Secrets Manager',
      port: 4420,
      version: '1.0.0',
      description: 'Encrypted credential storage',
      endpoints: 10
    },
    {
      service: 'Voice Studio API',
      port: 4430,
      version: '1.0.0',
      description: 'Voice agent management',
      endpoints: 14
    },
    {
      service: 'Workflow Builder API',
      port: 4440,
      version: '1.0.0',
      description: 'DAG workflow management',
      endpoints: 16
    }
  ];
}

export const QUICKSTARTS = [
  {
    title: 'Deploy Your First App',
    description: 'Use the CLI to deploy a Node.js app in 30 seconds',
    steps: [
      'npm install -g @hojai/cli',
      'npx hojai create my-app --template=company',
      'cd my-app && npx hojai deploy --mode=remote'
    ],
    language: 'bash'
  },
  {
    title: 'Create a Voice Agent',
    description: 'Build an AI receptionist in 5 minutes',
    steps: [
      'POST /api/v1/agents { name: "Receptionist", language: "en-IN" }',
      'Configure voice (provider, voice ID)',
      'Set greeting message',
      'POST /api/v1/agents/{id}/activate'
    ],
    language: 'bash'
  },
  {
    title: 'Track AI Usage',
    description: 'Monitor your OpenAI and Claude spending',
    steps: [
      'POST /api/v1/usage { userId, model, inputTokens, outputTokens }',
      'GET /api/v1/usage/summary?userId=...',
      'POST /api/v1/budgets { monthlyLimit: 1000 }'
    ],
    language: 'bash'
  },
  {
    title: 'Build a Workflow',
    description: 'Create a lead capture automation',
    steps: [
      'POST /api/v1/workflows { name: "Lead Capture" }',
      'POST /api/v1/workflows/{id}/nodes { type: "trigger", config: { source: "form" } }',
      'POST /api/v1/workflows/{id}/nodes { type: "llm", config: { prompt: "Qualify lead?" } }',
      'POST /api/v1/workflows/{id}/execute'
    ],
    language: 'bash'
  }
];

export const SDK_EXAMPLES = {
  node: `
// Install SDK
npm install @hojai/cloud

// Initialize client
import { HOJAI } from '@hojai/cloud';

const client = new HOJAI({
  apiKey: process.env.HOJAI_API_KEY
});

// Deploy app
const deployment = await client.deploy({
  name: 'my-app',
  manifest: { name: 'My App' },
  files: { 'apps/backend/src/index.js': '...' }
});

console.log(deployment.url); // https://my-app.hojai.app
`,
  python: `
# Install SDK
pip install hojai-cloud

# Initialize client
from hojai import Cloud

client = Cloud(api_key=os.getenv("HOJAI_API_KEY"))

# Deploy app
deployment = client.deploy(
    name="my-app",
    manifest={"name": "My App"},
    files={"apps/backend/src/index.js": "..."}
)

print(deployment.url)  # https://my-app.hojai.app
`
};
