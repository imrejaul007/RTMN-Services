#!/usr/bin/env npx ts-node

/**
 * HOJAI Agent Generator CLI
 * Generate new AI agents from templates
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'cli', 'templates');
const EMPLOYEES_DIR = join(ROOT, 'employees');

// ============================================================================
// DIVISIONS & PORTS
// ============================================================================

const DIVISIONS: Record<string, { port: number; description: string }> = {
  'engineering': { port: 4900, description: 'Software engineering agents' },
  'marketing': { port: 4950, description: 'Marketing and growth agents' },
  'sales': { port: 5000, description: 'Sales and revenue agents' },
  'paid-media': { port: 5007, description: 'Paid advertising agents' },
  'design': { port: 5050, description: 'UI/UX design agents' },
  'product': { port: 5058, description: 'Product management agents' },
  'project-management': { port: 5063, description: 'Project management agents' },
  'testing': { port: 5100, description: 'QA and testing agents' },
  'support': { port: 5155, description: 'Customer support agents' },
  'finance': { port: 5150, description: 'Finance and accounting agents' },
  'game-development': { port: 5100, description: 'Game development agents' },
  'spatial-computing': { port: 5119, description: 'AR/VR/XR agents' },
  'specialized': { port: 5161, description: 'Specialized domain agents' },
  'academic': { port: 5200, description: 'Academic and research agents' },
};

// ============================================================================
// PORT TRACKER
// ============================================================================

const usedPorts = new Set<number>();

function getNextPort(division: string): number {
  const base = DIVISIONS[division]?.port || 4900;
  let port = base;
  while (usedPorts.has(port)) {
    port++;
  }
  usedPorts.add(port);
  return port;
}

// ============================================================================
// TEMPLATES
// ============================================================================

const AGENT_TEMPLATE = `---
name: {{name}}
description: {{description}}
color: {{color}}
emoji: {{emoji}}
vibe: {{vibe}}
---

# {{name}}

You are **{{name}}**, {{role}}.

## Identity & Memory
{{identity}}

## Core Mission
{{mission}}

## Critical Rules
{{rules}}

## Technical Deliverables
{{deliverables}}

## Workflow Process
{{workflows}}

## Communication Style
{{communication}}

## Success Metrics
{{metrics}}
`;

const PACKAGE_JSON = `{
  "name": "@hojai/{{slug}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@hojai/agent-sdk": "workspace:*",
    "express": "^4.18.2",
    "zod": "^3.22.4",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0"
  }
}`;

const INDEX_TS = `/**
 * {{name}} Agent
 * {{description}}
 * Port: {{port}}
 * Division: {{division}}
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuid } from 'uuid';
import { BaseHOJAIAgent } from '@hojai/agent-sdk';
import { persona } from './persona.js';
import { chatRoutes } from './routes/chat.js';

const app = express();
const PORT = parseInt(process.env.PORT || '{{port}}', 10);

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuid();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// ============================================================================
// AGENT SETUP
// ============================================================================

const agent = new BaseHOJAIAgent(
  {
    name: '{{slug}}',
    description: '{{description}}',
    division: '{{division}}',
    port: PORT,
  },
  persona
);

// ============================================================================
// ROUTES
// ============================================================================

// Chat endpoint
app.use('/api', chatRoutes(agent));

// Health check
app.get('/health', (_: Request, res: Response) => {
  res.json({
    ...agent.getHealthStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Service info
app.get('/', (_: Request, res: Response) => {
  res.json({
    service: '{{name}}',
    description: '{{description}}',
    division: '{{division}}',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      health: '/health',
      chat: 'POST /api/chat',
    },
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found', path: req.path });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', req.path, err);
  res.status(500).json({ success: false, error: err.message, requestId: (req as any).requestId });
});

// ============================================================================
// STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('{{name}} AGENT');
  console.log('='.repeat(60));
  console.log(\`Port: \${PORT}\`);
  console.log(\`Division: {{division}}\`);
  console.log(\`Health: http://localhost:\${PORT}/health\`);
  console.log('='.repeat(60));
});

export default app;
`;

const PERSONA_TS = `/**
 * {{name}} Agent Persona
 * Generated from Agency Agents template
 */

import type { AgentPersona } from '@hojai/agent-sdk';

export const persona: AgentPersona = {
  identity: {
    name: '{{name}}',
    role: '{{role}}',
    personality: '{{personality}}',
    memory: '{{memory}}',
    experience: '{{experience}}',
  },
  coreMission: {
    primary: [
{{primary}}
    ],
  },
  criticalRules: {
{{rules}}
  },
  communicationStyle: [
{{communication}}
  ],
  successMetrics: {
{{metrics}}
  },
  emoji: '{{emoji}}',
  color: '{{color}}',
  vibe: '{{vibe}}',
};
`;

const CHAT_ROUTES_TS = `/**
 * Chat routes for {{name}} agent
 */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import type { BaseHOJAIAgent, ChatRequest, ChatResponse } from '@hojai/agent-sdk';
import { ChatRequestSchema } from '@hojai/agent-sdk';

export function chatRoutes(agent: BaseHOJAIAgent): Router {
  const router = Router();

  /**
   * POST /api/chat
   * Main chat endpoint
   */
  router.post('/chat', async (req: Request, res: Response) => {
    const requestId = uuid();
    const startTime = Date.now();

    try {
      const validation = ChatRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: validation.error.message },
          meta: { requestId, timestamp: new Date().toISOString(), agent: agent.config.name },
        } as ChatResponse);
      }

      const { message, context, userId = 'anonymous', sessionId }: ChatRequest = validation.data;

      // Build response with persona
      const systemPrompt = agent.getSystemPrompt();
      const responseContent = \`[\${systemPrompt}]\n\nUser: \${message}\n\nAssistant: (Respond as {{name}}) \`;

      const responseTime = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        data: {
          content: responseContent,
          usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          agent: agent.config.name,
          responseTimeMs: responseTime,
        },
      } as ChatResponse);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: { code: 'AGENT_ERROR', message: error instanceof Error ? error.message : 'Failed' },
        meta: { requestId, timestamp: new Date().toISOString(), agent: agent.config.name },
      } as ChatResponse);
    }
  });

  /**
   * GET /api/info
   * Agent info and capabilities
   */
  router.get('/info', (_: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        name: agent.config.name,
        description: agent.config.description,
        division: agent.config.division,
        persona: {
          name: agent.persona.identity.name,
          role: agent.persona.identity.role,
        },
        tools: agent.getToolNames(),
      },
      meta: { requestId: uuid(), timestamp: new Date().toISOString(), agent: agent.config.name },
    });
  });

  return router;
}
`;

const TYPES_TS = `/**
 * {{name}} Agent Types
 */

// Add agent-specific types here
export interface {{name}}Input {
  // Define input types
}

export interface {{name}}Output {
  // Define output types
}
`;

const TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`;

const README_MD = `# {{name}} Agent

**Division**: {{division}}
**Port**: {{port}}

## Description

{{description}}

## Vibe

{{vibe}}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Start production server
npm start
\`\`\`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/info | Agent info |
| POST | /api/chat | Chat with agent |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | {{port}} | Server port |
| CORS_ORIGIN | * | CORS origin |
`;

// ============================================================================
// CLI HANDLERS
// ============================================================================

function createDirectory(structure: Record<string, string>): void {
  for (const [path, _] of Object.entries(structure)) {
    const fullPath = join(EMPLOYEES_DIR, path);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      console.log(`✓ Created: ${path}`);
    } else {
      console.log(`✓ Exists: ${path}`);
    }
  }
}

function createFiles(files: Record<string, string>): void {
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(EMPLOYEES_DIR, filePath);
    writeFileSync(fullPath, content);
    console.log(`✓ Created: ${filePath}`);
  }
}

function parseArgs(): { division: string; name: string; options: Record<string, string> } {
  const args = process.argv.slice(2);
  const result: { division: string; name: string; options: Record<string, string> } = {
    division: '',
    name: '',
    options: {},
  };

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result.options[key] = value || '';
    } else if (!result.division) {
      result.division = arg;
    } else if (!result.name) {
      result.name = arg;
    }
  }

  return result;
}

function generateAgent(options: {
  name: string;
  division: string;
  description?: string;
  role?: string;
  personality?: string;
  memory?: string;
  experience?: string;
  mission?: string;
  rules?: string[];
  communication?: string[];
  metrics?: Record<string, string>;
  emoji?: string;
  color?: string;
  vibe?: string;
}): void {
  const slug = options.name.toLowerCase().replace(/\s+/g, '-');
  const port = getNextPort(options.division);

  const dir = `${options.division}/${slug}`;
  const srcDir = `${dir}/src`;
  const routesDir = `${srcDir}/routes`;

  // Create directory structure
  createDirectory({
    [dir]: '',
    [srcDir]: '',
    [routesDir]: '',
    [`${dir}/tests`]: '',
  });

  // Generate file contents
  const files: Record<string, string> = {};

  // package.json
  files[`${dir}/package.json`] = PACKAGE_JSON
    .replace(/\{\{slug\}\}/g, slug)
    .replace(/\{\{description\}\}/g, options.description || options.name);

  // tsconfig.json
  files[`${dir}/tsconfig.json`] = TSCONFIG_JSON;

  // src/index.ts
  files[`${srcDir}/index.ts`] = INDEX_TS
    .replace(/\{\{name\}\}/g, options.name)
    .replace(/\{\{description\}\}/g, options.description || options.name)
    .replace(/\{\{port\}\}/g, String(port))
    .replace(/\{\{division\}\}/g, options.division)
    .replace(/\{\{slug\}\}/g, slug);

  // src/persona.ts
  const primary = (options.mission || 'Expert in domain').split('\n').map(m => `      '${m.trim()}'`).join(',\n');
  const rules = (options.rules || ['Follow best practices']).map(r => `    ${r.split(':')[0].toLowerCase().replace(/\s+/g, '')}: ['${r}']`).join(',\n');
  const comms = (options.communication || ['Be professional']).map(c => `    '${c}'`).join(',\n');
  const metrics = Object.entries(options.metrics || { expertise: '10/10' }).map(([k, v]) => `    ${k}: '${v}'`).join(',\n');

  files[`${srcDir}/persona.ts`] = PERSONA_TS
    .replace(/\{\{name\}\}/g, options.name)
    .replace(/\{\{role\}\}/g, options.role || 'AI Agent')
    .replace(/\{\{personality\}\}/g, options.personality || 'Professional')
    .replace(/\{\{memory\}\}/g, options.memory || 'Remembers context')
    .replace(/\{\{experience\}\}/g, options.experience || 'Expert')
    .replace(/\{\{primary\}\}/g, primary)
    .replace(/\{\{rules\}\}/g, rules)
    .replace(/\{\{communication\}\}/g, comms)
    .replace(/\{\{metrics\}\}/g, metrics)
    .replace(/\{\{emoji\}\}/g, options.emoji || '🤖')
    .replace(/\{\{color\}\}/g, options.color || '#6366f1')
    .replace(/\{\{vibe\}\}/g, options.vibe || 'Professional AI agent');

  // src/routes/chat.ts
  files[`${routesDir}/chat.ts`] = CHAT_ROUTES_TS
    .replace(/\{\{name\}\}/g, options.name)
    .replace(/\{\{slug\}\}/g, slug);

  // src/types.ts
  files[`${srcDir}/types.ts`] = TYPES_TS.replace(/\{\{name\}\}/g, options.name);

  // README.md
  files[`${dir}/README.md`] = README_MD
    .replace(/\{\{name\}\}/g, options.name)
    .replace(/\{\{description\}\}/g, options.description || options.name)
    .replace(/\{\{division\}\}/g, options.division)
    .replace(/\{\{port\}\}/g, String(port))
    .replace(/\{\{vibe\}\}/g, options.vibe || '');

  // Create files
  createFiles(files);

  console.log('\n✅ Agent created successfully!');
  console.log(`📁 Location: ${dir}`);
  console.log(`🚀 Port: ${port}`);
  console.log('\nTo get started:');
  console.log(`  cd ${dir}`);
  console.log('  npm install');
  console.log('  npm run dev');
}

// ============================================================================
// MAIN
// ============================================================================

function main(): void {
  const { division, name, options } = parseArgs();

  if (!division || !name) {
    console.log(`
HOJAI Agent Generator

Usage:
  npx ts-node create-agent.ts <division> <name> [options]

Divisions:
${Object.entries(DIVISIONS).map(([d, info]) => `  ${d.padEnd(20)} - ${info.description}`).join('\n')}

Options:
  --description=<text>  Agent description
  --role=<text>        Agent role
  --emoji=<emoji>      Agent emoji
  --color=<hex>         Agent color
  --vibe=<text>        Agent vibe

Example:
  npx ts-node create-agent.ts engineering "Frontend Developer" --description="React expert" --emoji="🖥️"
`);
    process.exit(1);
  }

  if (!DIVISIONS[division]) {
    console.error(`Unknown division: ${division}`);
    console.log(`Available divisions: ${Object.keys(DIVISIONS).join(', ')}`);
    process.exit(1);
  }

  generateAgent({
    name,
    division,
    description: options.description,
    role: options.role,
    personality: options.personality,
    memory: options.memory,
    experience: options.experience,
    mission: options.mission,
    rules: options.rules ? options.rules.split('|') : undefined,
    communication: options.communication ? options.communication.split('|') : undefined,
    emoji: options.emoji,
    color: options.color,
    vibe: options.vibe,
  });
}

main();
