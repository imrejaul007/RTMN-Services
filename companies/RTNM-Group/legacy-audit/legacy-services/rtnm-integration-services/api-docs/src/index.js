/**
 * RTMN API Documentation Portal
 * Swagger/OpenAPI based developer documentation
 *
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

const app = express();

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/api-docs.log' })
    ]
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Documentation Data
const apiDocs = {
    info: {
        title: 'RTMN API',
        version: '1.0.0',
        description: 'RTMN Unified API - Connect all RTMN products through a single API',
        contact: {
            email: 'api@rtmn.com',
            support: 'support@rtmn.com'
        }
    },
    servers: [
        { url: 'https://api.rtmn.com', description: 'Production' },
        { url: 'https://api-staging.rtmn.com', description: 'Staging' },
        { url: 'http://localhost:3000', description: 'Local Development' }
    ],
    products: [
        {
            id: 'hojai',
            name: 'HOJAI AI',
            description: 'AI platform with 600+ specialized agents',
            color: '#6C63FF',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/hojai/chat',
                    summary: 'AI Chat',
                    description: 'Send a message to the AI chatbot',
                    parameters: [
                        { name: 'message', type: 'string', required: true, description: 'User message' },
                        { name: 'context', type: 'object', required: false, description: 'Conversation context' }
                    ],
                    example: {
                        request: { message: 'What is my Q3 revenue?' },
                        response: { reply: 'Your Q3 revenue is ₹12.5 lakhs...', intent: 'revenue_query' }
                    }
                },
                {
                    method: 'POST',
                    path: '/api/v1/hojai/agent/:agentId',
                    summary: 'Execute AI Agent',
                    description: 'Execute a specific AI agent task',
                    parameters: [
                        { name: 'agentId', type: 'string', required: true, in: 'path', description: 'Agent ID' },
                        { name: 'task', type: 'string', required: true, description: 'Task to execute' }
                    ]
                },
                {
                    method: 'GET',
                    path: '/api/v1/hojai/agents',
                    summary: 'List AI Agents',
                    description: 'Get list of available AI agents',
                    parameters: [
                        { name: 'industry', type: 'string', required: false, description: 'Filter by industry' }
                    ]
                }
            ]
        },
        {
            id: 'rabtul',
            name: 'RABTUL Payments',
            description: 'Payment infrastructure - UPI, cards, wallet, BNPL',
            color: '#00D9A5',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/rabtul/payments',
                    summary: 'Create Payment',
                    description: 'Initiate a new payment',
                    parameters: [
                        { name: 'amount', type: 'number', required: true, description: 'Payment amount in paisa' },
                        { name: 'orderId', type: 'string', required: true, description: 'Unique order ID' },
                        { name: 'currency', type: 'string', required: false, default: 'INR', description: 'Currency code' }
                    ],
                    example: {
                        request: { amount: 50000, orderId: 'ORD-12345' },
                        response: { paymentId: 'pay_xxx', status: 'created', amount: 50000 }
                    }
                },
                {
                    method: 'POST',
                    path: '/api/v1/rabtul/wallet',
                    summary: 'Create Wallet',
                    description: 'Create a new wallet for user',
                    parameters: [
                        { name: 'userId', type: 'string', required: true },
                        { name: 'name', type: 'string', required: true },
                        { name: 'email', type: 'string', required: true }
                    ]
                },
                {
                    method: 'GET',
                    path: '/api/v1/rabtul/wallet/:walletId',
                    summary: 'Get Wallet Balance',
                    description: 'Get wallet balance and details'
                },
                {
                    method: 'POST',
                    path: '/api/v1/rabtul/wallet/:walletId/topup',
                    summary: 'Top Up Wallet',
                    description: 'Add funds to wallet'
                },
                {
                    method: 'POST',
                    path: '/api/v1/rabtul/bnpl/order',
                    summary: 'Create BNPL Order',
                    description: 'Create buy-now-pay-later order',
                    parameters: [
                        { name: 'amount', type: 'number', required: true },
                        { name: 'tenure', type: 'number', required: false, default: 3, description: 'EMI tenure in months' }
                    ]
                }
            ]
        },
        {
            id: 'corpperks',
            name: 'CorpPerks HRMS',
            description: 'Complete HR management - payroll, attendance, onboarding',
            color: '#FF6B6B',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/corpperks/employees',
                    summary: 'Create Employee',
                    description: 'Add new employee to the system',
                    note: 'This automatically triggers integrations: wallet creation, SafeQR badge, Nexha identity',
                    parameters: [
                        { name: 'name', type: 'string', required: true },
                        { name: 'email', type: 'string', required: true },
                        { name: 'phone', type: 'string', required: false },
                        { name: 'department', type: 'string', required: false },
                        { name: 'role', type: 'string', required: false }
                    ],
                    example: {
                        request: { name: 'Priya Sharma', email: 'priya@acme.com', department: 'Engineering' },
                        response: {
                            id: 'emp_123',
                            name: 'Priya Sharma',
                            integrations: [
                                { service: 'rabtul', walletId: 'wal_456' },
                                { service: 'safeqr', badgeId: 'badge_789' },
                                { service: 'nexha', entityId: 'ent_101' }
                            ]
                        }
                    }
                },
                {
                    method: 'GET',
                    path: '/api/v1/corpperks/employees',
                    summary: 'List Employees',
                    description: 'Get paginated list of employees',
                    parameters: [
                        { name: 'department', type: 'string', required: false },
                        { name: 'status', type: 'string', required: false },
                        { name: 'page', type: 'number', required: false, default: 1 },
                        { name: 'limit', type: 'number', required: false, default: 50 }
                    ]
                },
                {
                    method: 'POST',
                    path: '/api/v1/corpperks/payroll/run',
                    summary: 'Run Payroll',
                    description: 'Execute payroll for selected period'
                },
                {
                    method: 'POST',
                    path: '/api/v1/corpperks/attendance',
                    summary: 'Record Attendance',
                    description: 'Mark attendance for employee'
                }
            ]
        },
        {
            id: 'adbazaar',
            name: 'AdBazaar Marketing',
            description: 'Marketing automation - campaigns, influencers, DOOH',
            color: '#FFB800',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/adbazaar/campaigns',
                    summary: 'Create Campaign',
                    description: 'Create new marketing campaign',
                    parameters: [
                        { name: 'name', type: 'string', required: true },
                        { name: 'type', type: 'string', required: true, enum: ['social', 'dooh', 'influencer', 'email'] },
                        { name: 'budget', type: 'number', required: true }
                    ]
                },
                {
                    method: 'GET',
                    path: '/api/v1/adbazaar/campaigns',
                    summary: 'List Campaigns',
                    description: 'Get all campaigns'
                },
                {
                    method: 'GET',
                    path: '/api/v1/adbazaar/campaigns/:id/analytics',
                    summary: 'Campaign Analytics',
                    description: 'Get campaign performance metrics'
                },
                {
                    method: 'GET',
                    path: '/api/v1/adbazaar/influencers',
                    summary: 'Find Influencers',
                    description: 'Search influencers by category, followers, location'
                }
            ]
        },
        {
            id: 'safeqr',
            name: 'SafeQR',
            description: 'Safety, verification, and loyalty QR codes',
            color: '#4ECDC4',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/safeqr/qr/generate',
                    summary: 'Generate QR Code',
                    description: 'Create new QR code',
                    parameters: [
                        { name: 'type', type: 'string', required: true, enum: ['product', 'employee', 'location', 'payment'] },
                        { name: 'entityId', type: 'string', required: true }
                    ]
                },
                {
                    method: 'POST',
                    path: '/api/v1/safeqr/qr/verify',
                    summary: 'Verify QR Code',
                    description: 'Verify QR code authenticity',
                    note: 'On scan, loyalty points are automatically awarded via RABTUL integration',
                    parameters: [
                        { name: 'qrCode', type: 'string', required: true }
                    ]
                },
                {
                    method: 'POST',
                    path: '/api/v1/safeqr/warranty/register',
                    summary: 'Register Warranty',
                    description: 'Register product warranty via QR scan'
                },
                {
                    method: 'POST',
                    path: '/api/v1/safeqr/safety/alert',
                    summary: 'Safety Alert',
                    description: 'Trigger safety alert (SOS)',
                    parameters: [
                        { name: 'type', type: 'string', required: true, enum: ['emergency', 'medical', 'safety', 'sos'] }
                    ]
                }
            ]
        },
        {
            id: 'nexha',
            name: 'Nexha Identity',
            description: 'Universal identity graph and trust scoring',
            color: '#A855F7',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/nexha/entities',
                    summary: 'Create Entity',
                    description: 'Create new identity entity',
                    parameters: [
                        { name: 'type', type: 'string', required: true, enum: ['person', 'company', 'product'] },
                        { name: 'name', type: 'string', required: true }
                    ]
                },
                {
                    method: 'POST',
                    path: '/api/v1/nexha/entities/:id/link',
                    summary: 'Link Entities',
                    description: 'Create relationship between entities',
                    parameters: [
                        { name: 'targetId', type: 'string', required: true },
                        { name: 'relationship', type: 'string', required: true }
                    ]
                },
                {
                    method: 'GET',
                    path: '/api/v1/nexha/trust/:entityId',
                    summary: 'Get Trust Score',
                    description: 'Get entity trust score'
                }
            ]
        },
        {
            id: 'risacare',
            name: 'RisaCare Healthcare',
            description: 'Healthcare OS - patients, appointments, records',
            color: '#EC4899',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/risacare/patients',
                    summary: 'Create Patient',
                    description: 'Register new patient'
                },
                {
                    method: 'POST',
                    path: '/api/v1/risacare/appointments',
                    summary: 'Book Appointment',
                    description: 'Schedule patient appointment'
                },
                {
                    method: 'POST',
                    path: '/api/v1/risacare/records',
                    summary: 'Create Medical Record',
                    description: 'Add medical record for patient'
                }
            ]
        },
        {
            id: 'risnaestate',
            name: 'RisnaEstate',
            description: 'Real estate CRM - leads, properties, site visits',
            color: '#F59E0B',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/risnaestate/leads',
                    summary: 'Create Lead',
                    description: 'Add new property lead'
                },
                {
                    method: 'POST',
                    path: '/api/v1/risnaestate/properties',
                    summary: 'Add Property',
                    description: 'List new property'
                },
                {
                    method: 'POST',
                    path: '/api/v1/risnaestate/visits',
                    summary: 'Book Site Visit',
                    description: 'Schedule property site visit'
                },
                {
                    method: 'POST',
                    path: '/api/v1/risnaestate/agreements',
                    summary: 'Generate Agreement',
                    description: 'Create property agreement document'
                }
            ]
        }
    ],
    guides: [
        {
            id: 'getting-started',
            title: 'Getting Started',
            category: 'Basics',
            content: `
# Getting Started with RTMN API

## Quick Start

1. **Get API Key**: Sign up at https://rtmn.com/developers
2. **Authenticate**: Get your access token
3. **Make Request**: Call any endpoint with your token

## Base URL
\`\`\`
https://api.rtmn.com
\`\`\`

## Authentication

Include your token in the Authorization header:
\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" \\
     https://api.rtmn.com/api/v1/hojai/chat
\`\`\`

## Your First Request

\`\`\`bash
curl -X POST https://api.rtmn.com/api/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@company.com", "password": "yourpassword"}'
\`\`\`
            `
        },
        {
            id: 'authentication',
            title: 'Authentication',
            category: 'Basics',
            content: `
# Authentication

## Methods Supported

### 1. Email/Password
\`\`\`javascript
POST /api/auth/token
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

### 2. API Key
\`\`\`bash
curl -H "X-API-Key: your-api-key" \\
     https://api.rtmn.com/...
\`\`\`

### 3. SSO (Enterprise)
- SAML 2.0
- OIDC (Azure AD, Okta, Google)
- Magic Links
            `
        },
        {
            id: 'integrations',
            title: 'Product Integrations',
            category: 'Advanced',
            content: `
# Product Integrations

## Auto-Integration Example

When you create an employee in CorpPerks, these are automatically created:

### 1. RABTUL Wallet
\`\`\`
Employee Created → Wallet Auto-Created
\`\`\`

### 2. SafeQR Badge
\`\`\`
Employee Created → Safety Badge Issued
\`\`\`

### 3. Nexha Identity
\`\`\`
Employee Created → Identity Graph Updated
\`\`\`

## Manual Integration

\`\`\`javascript
// Scan QR → Award Loyalty Points
POST /api/v1/safeqr/qr/verify
{
  "qrCode": "ACME-PROD-123"
}
// Automatically awards loyalty points via RABTUL
\`\`\`
            `
        },
        {
            id: 'webhooks',
            title: 'Webhooks',
            category: 'Advanced',
            content: `
# Webhooks

## Available Events

### Employee Events
- \`corpperks.employee.created\`
- \`corpperks.employee.updated\`
- \`corpperks.payroll.completed\`

### Payment Events
- \`rabtul.payment.created\`
- \`rabtul.payment.completed\`
- \`rabtul.wallet.topup\`

### Marketing Events
- \`adbazaar.campaign.started\`
- \`adbazaar.campaign.goal_met\`

## Setting Up Webhooks

\`\`\`bash
POST /api/webhooks
{
  "url": "https://your-server.com/webhook",
  "events": ["corpperks.employee.created"],
  "secret": "your-webhook-secret"
}
\`\`\`
            `
        }
    ],
    sdks: [
        {
            language: 'node',
            name: 'Node.js',
            install: 'npm install @rtmn/sdk',
            example: `
const RTMN = require('@rtmn/sdk');

const client = new RTMN({
  apiKey: 'your-api-key'
});

// Chat with AI
const response = await client.hojai.chat({
  message: 'What is Q3 revenue?'
});

// Create employee (auto-integrations)
const employee = await client.corpperks.employees.create({
  name: 'Priya Sharma',
  email: 'priya@acme.com'
});
// Wallet, SafeQR, Nexha created automatically!
            `
        },
        {
            language: 'python',
            name: 'Python',
            install: 'pip install rtmn-sdk',
            example: `
from rtmn import RTMNClient

client = RTMNClient(api_key='your-api-key')

# Chat with AI
response = client.hojai.chat(message='What is Q3 revenue?')

# Create employee
employee = client.corpperks.employees.create(
    name='Priya Sharma',
    email='priya@acme.com'
)
            `
        },
        {
            language: 'go',
            name: 'Go',
            install: 'go get github.com/rtmn/go-sdk',
            example: `
import "github.com/rtmn/go-sdk"

client := rtmn.NewClient("your-api-key")

// Chat with AI
response, _ := client.Hojai.Chat("What is Q3 revenue?")

// Create employee
employee, _ := client.Corpperks.Employees.Create(
    rtmn.Employee{Name: "Priya Sharma", Email: "priya@acme.com"}
)
            `
        }
    ]
};

// ========================
// ROUTES
// ========================

// Get API documentation
app.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        data: apiDocs
    });
});

// Get specific product docs
app.get('/api/docs/:productId', (req, res) => {
    const product = apiDocs.products.find(p => p.id === req.params.productId);

    if (!product) {
        return res.status(404).json({
            success: false,
            error: 'Product not found'
        });
    }

    res.json({
        success: true,
        data: product
    });
});

// Get guides
app.get('/api/guides', (req, res) => {
    const { category } = req.query;

    let guides = apiDocs.guides;
    if (category) {
        guides = guides.filter(g => g.category === category);
    }

    res.json({
        success: true,
        data: guides.map(g => ({
            id: g.id,
            title: g.title,
            category: g.category
        }))
    });
});

// Get specific guide
app.get('/api/guides/:guideId', (req, res) => {
    const guide = apiDocs.guides.find(g => g.id === req.params.guideId);

    if (!guide) {
        return res.status(404).json({
            success: false,
            error: 'Guide not found'
        });
    }

    res.json({
        success: true,
        data: guide
    });
});

// Get SDKs
app.get('/api/sdks', (req, res) => {
    res.json({
        success: true,
        data: apiDocs.sdks.map(s => ({
            language: s.language,
            name: s.name,
            install: s.install
        }))
    });
});

// Get specific SDK
app.get('/api/sdks/:language', (req, res) => {
    const sdk = apiDocs.sdks.find(s => s.language === req.params.language);

    if (!sdk) {
        return res.status(404).json({
            success: false,
            error: 'SDK not found'
        });
    }

    res.json({
        success: true,
        data: sdk
    });
});

// OpenAPI/Swagger spec
app.get('/api/openapi.json', (req, res) => {
    const openApiSpec = {
        openapi: '3.0.0',
        info: apiDocs.info,
        servers: apiDocs.servers,
        paths: {}
    };

    // Convert our docs to OpenAPI format
    apiDocs.products.forEach(product => {
        product.endpoints.forEach(endpoint => {
            const pathKey = endpoint.path.replace(/:(\w+)/g, '{$1}');
            if (!openApiSpec.paths[pathKey]) {
                openApiSpec.paths[pathKey] = {};
            }

            openApiSpec.paths[pathKey][endpoint.method.toLowerCase()] = {
                summary: endpoint.summary,
                description: endpoint.description,
                parameters: endpoint.parameters?.map(p => ({
                    name: p.name,
                    in: p.in || 'body',
                    required: p.required,
                    schema: { type: p.type }
                })),
                responses: {
                    '200': {
                        description: 'Success',
                        content: {
                            'application/json': {
                                example: endpoint.example?.response
                            }
                        }
                    }
                }
            };
        });
    });

    res.json(openApiSpec);
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'RTMN API Docs',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Serve HTML documentation
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>RTMN API Documentation</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        h1 { font-size: 2.5rem; margin-bottom: 10px; color: #fff; }
        h2 { font-size: 1.5rem; margin: 30px 0 15px; color: #fff; }
        h3 { font-size: 1.2rem; margin: 20px 0 10px; }
        .subtitle { color: #94a3b8; margin-bottom: 40px; }
        .products { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .product { background: #1e293b; border-radius: 12px; padding: 24px; transition: transform 0.2s; }
        .product:hover { transform: translateY(-4px); }
        .product h3 { color: #fff; }
        .product p { color: #94a3b8; font-size: 0.9rem; margin-top: 8px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-top: 12px; }
        .guides { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
        .guide { background: #1e293b; border-radius: 8px; padding: 16px; cursor: pointer; transition: background 0.2s; }
        .guide:hover { background: #334155; }
        .guide-category { color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .guide-title { color: #fff; margin-top: 4px; }
        .sdks { display: flex; gap: 16px; flex-wrap: wrap; }
        .sdk { background: #1e293b; border-radius: 8px; padding: 16px 24px; cursor: pointer; }
        .sdk:hover { background: #334155; }
        .api-info { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
        .api-info p { color: #94a3b8; }
        code { background: #334155; padding: 2px 8px; border-radius: 4px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9em; }
        pre { background: #1e293b; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
        .try-it { background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 16px; }
        .try-it:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 RTMN API Documentation</h1>
        <p class="subtitle">Connect all RTMN products through a single unified API</p>

        <div class="api-info">
            <h2>API Information</h2>
            <p><strong>Base URL:</strong> <code>https://api.rtmn.com</code></p>
            <p><strong>Version:</strong> <code>1.0.0</code></p>
            <p><strong>Authentication:</strong> Bearer Token in Authorization header</p>
            <p>📖 <a href="/api/docs" style="color: #6366f1;">View Full API Spec (JSON)</a></p>
            <p>📄 <a href="/api/openapi.json" style="color: #6366f1;">OpenAPI 3.0 Spec</a></p>
        </div>

        <h2>📦 Products</h2>
        <div class="products">
            ${apiDocs.products.map(p => `
                <div class="product">
                    <h3>${p.name}</h3>
                    <p>${p.description}</p>
                    <span class="badge" style="background: ${p.color}20; color: ${p.color};">
                        ${p.endpoints.length} endpoints
                    </span>
                </div>
            `).join('')}
        </div>

        <h2>📚 Guides</h2>
        <div class="guides">
            ${apiDocs.guides.map(g => `
                <div class="guide">
                    <div class="guide-category">${g.category}</div>
                    <div class="guide-title">${g.title}</div>
                </div>
            `).join('')}
        </div>

        <h2>🛠️ SDKs</h2>
        <div class="sdks">
            ${apiDocs.sdks.map(s => `
                <div class="sdk">${s.name}</div>
            `).join('')}
        </div>

        <h2>🚀 Quick Start</h2>
        <pre><code>// Install SDK
npm install @rtmn/sdk

// Initialize client
const RTMN = require('@rtmn/sdk');
const client = new RTMN({ apiKey: 'YOUR_API_KEY' });

// Create employee (auto-creates wallet, SafeQR, Nexha)
const employee = await client.corpperks.employees.create({
  name: 'Priya Sharma',
  email: 'priya@acme.com'
});
// All integrations happen automatically! ✓</code></pre>
    </div>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3017;

app.listen(PORT, () => {
    logger.info(`📖 RTMN API Docs Portal running on port ${PORT}`);
    logger.info(`🌐 Open: http://localhost:${PORT}`);
});

module.exports = app;