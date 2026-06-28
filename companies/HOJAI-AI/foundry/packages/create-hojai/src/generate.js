#!/usr/bin/env node
/**
 * Blueprint Engine - LLM-powered Starter Generation
 *
 * Generates new starter templates from hojai.ai.md specifications.
 * Used by: npx hojai generate starter --spec=<file.md>
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';
import { parseArgs } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// System prompt for starter generation
const SYSTEM_PROMPT = `You are HOJAI Blueprint Engine — an AI that generates complete starter templates for AI-native businesses.

Given a hojai.ai.md specification, generate a complete starter template that can be scaffolded by HOJAI Foundry.

The output should be a JSON object with:
{
  "name": "starter-name",
  "description": "What this starter does",
  "emoji": "🏢",
  "agents": ["agent1", "agent2", ...],
  "routes": ["route1", "route2", ...],
  "features": ["feature1", "feature2", ...],
  "files": {
    "path/to/file.js": "file content as string"
  },
  "dependencies": {
    "package-name": "^1.0.0"
  }
}

Rules:
- name: lowercase, hyphenated
- description: 1-2 sentences
- agents: 3-6 agents specific to this starter type
- routes: REST API endpoints
- features: Key features of the starter
- files: All necessary files (at minimum: package.json, src/index.js, src/routes/*.js, src/agents/*.js, public/index.html)
- dependencies: NPM packages needed

The generated files should follow HOJAI Foundry conventions:
- ES modules (import/export)
- Express.js backend
- Static HTML frontend
- SUTAR BaseAgent for agents`;

/**
 * Parse hojai.ai.md spec into a structured prompt
 */
function parseSpecToPrompt(specContent) {
  // Extract key information from the spec
  const lines = specContent.split('\n');
  let prompt = '';

  // Extract project description
  const descMatch = specContent.match(/#{1,2}\s*(.+)/);
  if (descMatch) {
    prompt += `Create a starter for: ${descMatch[1]}\n\n`;
  }

  // Extract key sections
  const sections = ['architecture', 'agents', 'api', 'features', 'endpoints'];
  for (const section of sections) {
    const regex = new RegExp(`##\\s*${section}[\\s\\S]*?(?=##|$)`, 'i');
    const match = specContent.match(regex);
    if (match) {
      prompt += `\n${match[0]}\n`;
    }
  }

  // If no structured content, use the whole spec
  if (!prompt.trim()) {
    prompt = specContent;
  }

  return prompt;
}

/**
 * Call LLM to generate starter
 */
async function callLLM(prompt, options = {}) {
  const apiKey = process.env.HOJAI_LLM_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.HOJAI_LLM_MODEL || 'gpt-4';

  if (!apiKey) {
    console.log(kleur.yellow('⚠ No LLM API key found. Using template-based generation.'));
    return generateTemplateBasedStarter(prompt);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch (error) {
    console.log(kleur.yellow(`⚠ LLM call failed: ${error.message}`));
    console.log(kleur.gray('  Falling back to template-based generation.'));
    return generateTemplateBasedStarter(prompt);
  }
}

/**
 * Template-based starter generation (when no LLM available)
 */
function generateTemplateBasedStarter(prompt) {
  const lower = prompt.toLowerCase();

  // Detect starter type from prompt
  if (/marketplace|buy|sell|product|catalog/i.test(lower)) {
    return generateMarketplaceStarter(prompt);
  }
  if (/hotel|booking|property|room/i.test(lower)) {
    return generateHotelStarter(prompt);
  }
  if (/restaurant|food|order|menu/i.test(lower)) {
    return generateRestaurantStarter(prompt);
  }
  if (/logistics|delivery|ship|track/i.test(lower)) {
    return generateLogisticsStarter(prompt);
  }
  if (/crm|customer|lead|deal|pipeline/i.test(lower)) {
    return generateCRMStarter(prompt);
  }
  if (/saas|subscription|b2b|enterprise/i.test(lower)) {
    return generateSaaSStarter(prompt);
  }
  if (/healthcare|doctor|patient|medical/i.test(lower)) {
    return generateHealthcareStarter(prompt);
  }

  // Default: generic starter
  return generateGenericStarter(prompt);
}

function generateMarketplaceStarter(prompt) {
  return {
    name: 'custom-marketplace',
    description: 'AI-powered marketplace with buying, selling, and RFQ capabilities',
    emoji: '🛒',
    agents: ['ceo', 'sales', 'procurement', 'finance', 'support'],
    routes: ['buyer/products', 'buyer/rfqs', 'buyer/quotes', 'buyer/orders', 'seller/catalog', 'seller/quotes', 'admin/overview'],
    features: ['Product catalog', 'RFQ flow', 'Quote management', 'Order processing', 'Payment integration', 'AI agents'],
    files: {
      'package.json': JSON.stringify({
        name: '{{PROJECT_NAME}}',
        version: '1.0.0',
        type: 'module',
        scripts: { dev: 'node scripts/dev.js', start: 'node apps/backend/src/index.js' },
        dependencies: { express: '^4.18.2', cors: '^2.8.5' }
      }, null, 2),
      'src/index.js': `import express from 'express';
const app = express();
app.use(express.json());
app.use('/api/buyer', (await import('./routes/buyer.js')).default);
app.use('/api/seller', (await import('./routes/seller.js')).default);
app.listen(process.env.PORT || 4001, () => console.log('Marketplace running on port', process.env.PORT || 4001));
export default app;`,
      'src/routes/buyer.js': `import { Router } from 'express';
const r = Router();
r.get('/products', (_, res) => res.json({ products: [] }));
r.post('/rfqs', (req, res) => res.json({ id: Date.now(), ...req.body }));
export default r;`,
      'src/routes/seller.js': `import { Router } from 'express';
const r = Router();
r.get('/catalog', (_, res) => res.json({ items: [] }));
r.post('/quotes', (req, res) => res.json({ id: Date.now(), ...req.body }));
export default r;`,
      'public/index.html': '<!DOCTYPE html><html><head><title>Marketplace</title></head><body><h1>AI Marketplace</h1></body></html>'
    },
    dependencies: { express: '^4.18.2', cors: '^2.8.5' }
  };
}

function generateHotelStarter(prompt) {
  return {
    name: 'custom-hotel',
    description: 'Hotel management system with booking and room management',
    emoji: '🏨',
    agents: ['ceo', 'sales', 'support', 'finance', 'marketing'],
    routes: ['rooms', 'bookings', 'guests', 'billing'],
    features: ['Room management', 'Booking system', 'Guest profiles', 'Billing', 'AI concierge'],
    files: {
      'package.json': JSON.stringify({
        name: '{{PROJECT_NAME}}',
        version: '1.0.0',
        type: 'module',
        scripts: { dev: 'node scripts/dev.js' },
        dependencies: { express: '^4.18.2' }
      }, null, 2),
      'src/index.js': `import express from 'express';
const app = express();
app.use(express.json());
app.use('/api/rooms', (await import('./routes/rooms.js')).default);
app.use('/api/bookings', (await import('./routes/bookings.js')).default);
app.listen(4001, () => console.log('Hotel OS running'));
export default app;`,
      'public/index.html': '<!DOCTYPE html><html><head><title>Hotel</title></head><body><h1>Hotel Management</h1></body></html>'
    },
    dependencies: { express: '^4.18.2' }
  };
}

function generateRestaurantStarter(prompt) {
  return {
    name: 'custom-restaurant',
    description: 'Restaurant management with menu, orders, and kitchen display',
    emoji: '🍽️',
    agents: ['ceo', 'sales', 'kitchen', 'delivery', 'support'],
    routes: ['menu', 'orders', 'kitchen', 'delivery'],
    features: ['Digital menu', 'Order management', 'KOT system', 'Delivery tracking', 'AI assistant'],
    files: {
      'package.json': JSON.stringify({ name: '{{PROJECT_NAME}}', version: '1.0.0', type: 'module', dependencies: { express: '^4.18.2' } }, null, 2),
      'src/index.js': `import express from 'express';
const app = express();
app.use(express.json());
app.use('/api/menu', (await import('./routes/menu.js')).default);
app.use('/api/orders', (await import('./routes/orders.js')).default);
app.listen(4001, () => console.log('Restaurant running'));
export default app;`,
      'public/index.html': '<!DOCTYPE html><html><head><title>Restaurant</title></head><body><h1>Restaurant</h1></body></html>'
    },
    dependencies: { express: '^4.18.2' }
  };
}

function generateLogisticsStarter(prompt) {
  return {
    name: 'custom-logistics',
    description: 'Logistics platform with fleet management and tracking',
    emoji: '🚚',
    agents: ['ceo', 'dispatch', 'fleet', 'customer', 'finance'],
    routes: ['fleet', 'tracking', 'dispatch', 'shipments'],
    features: ['Fleet management', 'Real-time tracking', 'Dispatch optimization', 'Shipment management', 'AI coordinator'],
    files: {
      'package.json': JSON.stringify({ name: '{{PROJECT_NAME}}', version: '1.0.0', type: 'module', dependencies: { express: '^4.18.2' } }, null, 2),
      'src/index.js': `import express from 'express';
const app = express();
app.use(express.json());
app.use('/api/fleet', (await import('./routes/fleet.js')).default);
app.use('/api/tracking', (await import('./routes/tracking.js')).default);
app.listen(4001, () => console.log('Logistics running'));
export default app;`,
      'public/index.html': '<!DOCTYPE html><html><head><title>Logistics</title></head><body><h1>Logistics Platform</h1></body></html>'
    },
    dependencies: { express: '^4.18.2' }
  };
}

function generateCRMStarter(prompt) {
  return {
    name: 'custom-crm',
    description: 'CRM system with leads, deals, and pipeline management',
    emoji: '📊',
    agents: ['ceo', 'sales', 'marketing', 'support'],
    routes: ['contacts', 'leads', 'deals', 'pipeline'],
    features: ['Contact management', 'Lead tracking', 'Deal pipeline', 'AI sales assistant'],
    files: {
      'package.json': JSON.stringify({ name: '{{PROJECT_NAME}}', version: '1.0.0', type: 'module', dependencies: { express: '^4.18.2' } }, null, 2),
      'src/index.js': `import express from 'express';
const app = express();
app.use(express.json());
app.use('/api/contacts', (await import('./routes/contacts.js')).default);
app.use('/api/leads', (await import('./routes/leads.js')).default);
app.use('/api/deals', (await import('./routes/deals.js')).default);
app.listen(4001, () => console.log('CRM running'));
export default app;`,
      'public/index.html': '<!DOCTYPE html><html><head><title>CRM</title></head><body><h1>CRM System</h1></body></html>'
    },
    dependencies: { express: '^4.18.2' }
  };
}

function generateSaaSStarter(prompt) {
  return {
    name: 'custom-saas',
    description: 'SaaS platform with subscription billing and multi-tenancy',
    emoji: '☁️',
    agents: ['ceo', 'sales', 'finance', 'support'],
    routes: ['auth', 'subscriptions', 'billing', ' tenants'],
    features: ['Multi-tenancy', 'Subscription management', 'Billing', 'AI assistant', 'SSO'],
    files: {
      'package.json': JSON.stringify({ name: '{{PROJECT_NAME}}', version: '1.0.0', type: 'module', dependencies: { express: '^4.18.2', jsonwebtoken: '^9.0.0' } }, null, 2),
      'src/index.js': `import express from 'express';
const app = express();
app.use(express.json());
app.use('/api/auth', (await import('./routes/auth.js')).default);
app.use('/api/subscriptions', (await import('./routes/subscriptions.js')).default);
app.listen(4001, () => console.log('SaaS running'));
export default app;`,
      'public/index.html': '<!DOCTYPE html><html><head><title>SaaS</title></head><body><h1>SaaS Platform</h1></body></html>'
    },
    dependencies: { express: '^4.18.2', jsonwebtoken: '^9.0.0' }
  };
}

function generateHealthcareStarter(prompt) {
  return {
    name: 'custom-healthcare',
    description: 'Healthcare platform with appointments and patient management',
    emoji: '🏥',
    agents: ['ceo', 'support', 'finance'],
    routes: ['appointments', 'patients', 'prescriptions', 'billing'],
    features: ['Appointment scheduling', 'Patient records', 'Prescriptions', 'AI health assistant', 'HIPAA compliance'],
    files: {
      'package.json': JSON.stringify({ name: '{{PROJECT_NAME}}', version: '1.0.0', type: 'module', dependencies: { express: '^4.18.2' } }, null, 2),
      'src/index.js': `import express from 'express';
const app = express();
app.use(express.json());
app.use('/api/appointments', (await import('./routes/appointments.js')).default);
app.use('/api/patients', (await import('./routes/patients.js')).default);
app.listen(4001, () => console.log('Healthcare running'));
export default app;`,
      'public/index.html': '<!DOCTYPE html><html><head><title>Healthcare</title></head><body><h1>Healthcare Platform</h1></body></html>'
    },
    dependencies: { express: '^4.18.2' }
  };
}

function generateGenericStarter(prompt) {
  return {
    name: 'custom-app',
    description: 'Custom AI-powered application',
    emoji: '🚀',
    agents: ['ceo', 'support'],
    routes: ['health', 'api'],
    features: ['REST API', 'AI agents', 'Scalable architecture'],
    files: {
      'package.json': JSON.stringify({ name: '{{PROJECT_NAME}}', version: '1.0.0', type: 'module', dependencies: { express: '^4.18.2' } }, null, 2),
      'src/index.js': `import express from 'express';
const app = express();
app.use(express.json());
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.listen(4001, () => console.log('App running'));
export default app;`,
      'public/index.html': '<!DOCTYPE html><html><head><title>App</title></head><body><h1>AI App</h1></body></html>'
    },
    dependencies: { express: '^4.18.2' }
  };
}

/**
 * Write generated starter to disk
 */
async function writeStarter(starter, targetDir) {
  console.log(kleur.cyan('▸ Writing starter files…'));

  for (const [filePath, content] of Object.entries(starter.files)) {
    const fullPath = path.join(targetDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Replace template variables
    const finalContent = content
      .replace(/\{\{PROJECT_NAME\}\}/g, starter.name)
      .replace(/\{\{DESCRIPTION\}\}/g, starter.description);

    await fs.writeFile(fullPath, finalContent, 'utf8');
    console.log(kleur.gray(`  ${filePath}`));
  }

  // Write manifest
  const manifest = {
    name: starter.name,
    description: starter.description,
    emoji: starter.emoji,
    agents: starter.agents,
    routes: starter.routes,
    features: starter.features,
    generated: true,
    generatedAt: new Date().toISOString()
  };
  await fs.writeFile(
    path.join(targetDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  return manifest;
}

/**
 * Main function: Generate starter from spec
 */
export async function runGenerate({ args = [], flags = {} } = {}) {
  const subcommand = args[0];

  if (subcommand === 'help' || !subcommand || flags.help) {
    console.log(kleur.bold('Usage:'));
    console.log('  ' + kleur.cyan('npx hojai generate starter') + ' [--spec=<file.md>] [--name=<name>]');
    console.log('');
    console.log(kleur.bold('Options:'));
    console.log('  --spec=<file>    Path to hojai.ai.md specification file');
    console.log('  --name=<name>    Name for the generated starter');
    console.log('  --output=<dir>   Output directory (default: ./generated)');
    return;
  }

  if (subcommand === 'starter') {
    return generateStarter({ flags });
  }

  console.log(kleur.red(`✖ unknown subcommand: ${subcommand}`));
  console.log(kleur.gray('  available: starter'));
}

async function generateStarter({ flags = {} } = {}) {
  let specContent = '';
  let specPath = flags.spec || flags.s;

  // Read spec file
  if (specPath) {
    try {
      specContent = await fs.readFile(path.resolve(specPath), 'utf8');
      console.log(kleur.cyan('▸ Reading spec from: ') + specPath);
    } catch (error) {
      console.log(kleur.red('✖ Could not read spec file: ') + error.message);
      process.exit(1);
    }
  } else {
    // Prompt user for spec
    console.log(kleur.yellow('⚠ No spec file provided.'));
    console.log(kleur.gray('  Please provide a hojai.ai.md specification.'));
    console.log(kleur.gray('  Or provide a description of what you want to build.'));

    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = () => new Promise(resolve => rl.question('Describe your app (or press Ctrl+C to exit): ', resolve));
    specContent = await question();
    rl.close();
  }

  const prompt = parseSpecToPrompt(specContent);
  const outputDir = flags.output || flags.o || './generated';
  const starterName = flags.name || flags.n || 'custom-' + Date.now();

  console.log(kleur.cyan('▸ Generating starter with LLM…'));
  const starter = await callLLM(prompt, { name: starterName });

  console.log(kleur.green('▸ Generated starter:'));
  console.log(kleur.gray(`  Name: ${starter.name}`));
  console.log(kleur.gray(`  Description: ${starter.description}`));
  console.log(kleur.gray(`  Agents: ${starter.agents?.join(', ') || 'none'}`));
  console.log(kleur.gray(`  Files: ${Object.keys(starter.files || {}).length}`));

  const targetDir = path.resolve(outputDir, starter.name);
  await writeStarter(starter, targetDir);

  console.log('');
  console.log(kleur.green('✔ Starter generated!'));
  console.log(kleur.gray(`  Location: ${targetDir}`));
  console.log('');
  console.log(kleur.bold('Next steps:'));
  console.log(kleur.gray(`  cd ${targetDir}`));
  console.log(kleur.gray('  npm install'));
  console.log(kleur.gray('  npm run dev'));

  return starter;
}
