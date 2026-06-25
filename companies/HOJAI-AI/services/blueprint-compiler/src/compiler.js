/**
 * Blueprint Compiler — Converts CompanyBlueprint into generated project files
 */

import { v4 as uuidv4 } from 'uuid';
import { renderTemplate, buildRenderVars } from './render.js';
import { buildManifest, buildCapability } from './manifest.js';

/**
 * Compiler states
 */
export const CompileState = {
  PENDING: 'pending',
  COMPILING: 'compiling',
  COMPILING_DONE: 'compiling_done',
  DEPLOYING: 'deploying',
  DONE: 'done',
  FAILED: 'failed'
};

/**
 * In-memory compile jobs store
 */
const jobs = new Map();

/**
 * Get foundry root (where templates live)
 */
function getFoundryRoot() {
  // Try multiple possible locations
  const possibleRoots = [
    '/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/foundry',
    process.env.FOUNDRY_ROOT,
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'foundry'),
    join(process.cwd(), '..', 'foundry')
  ];

  for (const root of possibleRoots) {
    if (root && existsSync(root)) {
      return root;
    }
  }

  // Default to RTMN foundry
  return '/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/foundry';
}

/**
 * Validate blueprint structure
 */
function validateBlueprint(blueprint) {
  const errors = [];

  if (!blueprint) {
    errors.push('Blueprint is required');
    return errors;
  }

  if (!blueprint.config) {
    errors.push('Blueprint config is required');
  } else {
    if (!blueprint.config.name) errors.push('Blueprint config.name is required');
    if (!blueprint.config.type) errors.push('Blueprint config.type is required');
  }

  return errors;
}

/**
 * Create a new compile job
 */
export function createCompileJob(blueprint, userId = null) {
  const errors = validateBlueprint(blueprint);
  if (errors.length > 0) {
    throw new Error(`Invalid blueprint: ${errors.join(', ')}`);
  }

  const jobId = uuidv4().replace(/-/g, '').substring(0, 16);
  const projectId = blueprint.id || uuidv4();

  const job = {
    id: jobId,
    projectId,
    blueprint,
    userId,
    state: CompileState.PENDING,
    progress: 0,
    progressMessage: 'Job queued...',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    files: null,
    manifest: null,
    capability: null,
    deployResult: null,
    error: null
  };

  jobs.set(jobId, job);

  // Start compilation asynchronously
  compileJob(jobId).catch(err => {
    console.error('Compile job failed:', err);
    const job = jobs.get(jobId);
    if (job) {
      job.state = CompileState.FAILED;
      job.error = err.message;
      job.completedAt = new Date().toISOString();
    }
  });

  return {
    jobId,
    projectId,
    state: CompileState.PENDING,
    message: 'Compilation started'
  };
}

/**
 * Compile a job
 */
async function compileJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);

  try {
    // Update state
    job.state = CompileState.COMPILING;
    job.startedAt = new Date().toISOString();

    // Step 1: Update progress (10%)
    job.progress = 10;
    job.progressMessage = 'Loading template...';
    updateJob(jobId, job);

    // Step 2: Find and load template
    const templateDir = getTemplateDir(job.blueprint.config.type);
    if (!existsSync(templateDir)) {
      throw new Error(`Template not found: ${job.blueprint.config.type}`);
    }

    // Step 3: Build render vars (20%)
    job.progress = 20;
    job.progressMessage = 'Preparing configuration...';
    updateJob(jobId, job);

    const vars = buildRenderVars(job.blueprint);

    // Step 4: Render template files (40%)
    job.progress = 40;
    job.progressMessage = 'Rendering template files...';
    updateJob(jobId, job);

    const templateFiles = await renderTemplate(templateDir, vars);

    // Step 5: Build manifest and capability (60%)
    job.progress = 60;
    job.progressMessage = 'Generating manifests...';
    updateJob(jobId, job);

    job.manifest = buildManifest(job.blueprint, job.projectId);
    job.capability = buildCapability(job.blueprint);

    // Step 6: Write additional files (80%)
    job.progress = 80;
    job.progressMessage = 'Writing company files...';
    updateJob(jobId, job);

    const companyFiles = generateCompanyFiles(job.blueprint, job.manifest, job.capability, vars);

    // Step 7: Combine all files (90%)
    job.progress = 90;
    job.progressMessage = 'Finalizing project...';
    updateJob(jobId, job);

    job.files = {
      ...templateFiles,
      ...companyFiles
    };

    // Step 8: Done
    job.state = CompileState.COMPILING_DONE;
    job.progress = 100;
    job.progressMessage = 'Compilation complete!';
    job.completedAt = new Date().toISOString();
    updateJob(jobId, job);

    return job;

  } catch (error) {
    job.state = CompileState.FAILED;
    job.error = error.message;
    job.completedAt = new Date().toISOString();
    updateJob(jobId, job);
    throw error;
  }
}

/**
 * Update job in store
 */
function updateJob(jobId, job) {
  jobs.set(jobId, job);
}

/**
 * Get a compile job
 */
export function getCompileJob(jobId) {
  return jobs.get(jobId) || null;
}

/**
 * Get all jobs
 */
export function getAllJobs() {
  return Array.from(jobs.values());
}

/**
 * Get template directory for a type
 */
function getTemplateDir(type) {
  const foundryRoot = getFoundryRoot();
  const templateDir = join(foundryRoot, 'starters', type, 'template');

  if (existsSync(templateDir)) {
    return templateDir;
  }

  // Fallback: try without /template suffix
  const altDir = join(foundryRoot, 'starters', type);
  if (existsSync(altDir)) {
    // Check if there's a template subdirectory
    const templateSubDir = join(altDir, 'template');
    if (existsSync(templateSubDir)) {
      return templateSubDir;
    }
    return altDir;
  }

  return templateDir; // Will fail at usage
}

/**
 * Generate additional company files (hojai.ai.md, company.blueprint.yaml, etc.)
 */
function generateCompanyFiles(blueprint, manifest, capability, vars) {
  const files = {};

  // company.blueprint.yaml
  files['company.blueprint.yaml'] = generateBlueprintYaml(blueprint);

  // hojai.ai.md
  files['hojai.ai.md'] = generateHojaiAiMd(blueprint, vars);

  // .hojai/manifest.json
  files['.hojai/manifest.json'] = JSON.stringify(manifest, null, 2);

  // .hojai/capability.json
  files['.hojai/capability.json'] = JSON.stringify(capability, null, 2);

  // README.md
  files['README.md'] = generateReadme(blueprint, vars);

  return files;
}

/**
 * Generate company.blueprint.yaml content
 */
function generateBlueprintYaml(blueprint) {
  const lines = [
    '# HOJAI Company Blueprint',
    `# Generated by: AI Architect + Blueprint Compiler`,
    `# Created: ${new Date().toISOString()}`,
    '',
    `id: ${blueprint.id}`,
    `version: ${blueprint.version || '1.0'}`,
    `status: ${blueprint.status || 'approved'}`,
    '',
    `idea: "${blueprint.idea || ''}"`,
    '',
    'config:',
    `  name: "${blueprint.config.name}"`,
    `  slug: "${blueprint.config.slug || slugify(blueprint.config.name)}"`,
    `  type: "${blueprint.config.type}"`,
    `  regions: [${(blueprint.config.regions || []).map(r => `"${r}"`).join(', ')}]`,
    `  languages: [${(blueprint.config.languages || []).map(l => `"${l}"`).join(', ')}]`,
    `  currency: "${blueprint.config.currency}"`,
    `  marketSize: "${blueprint.config.marketSize}"`,
    `  commerce: ${blueprint.config.commerce}`,
    `  federation: ${blueprint.config.federation}`,
    '',
    'apps:',
    `  buyerPortal: ${blueprint.apps?.buyerPortal || false}`,
    `  sellerPortal: ${blueprint.apps?.sellerPortal || false}`,
    `  adminDashboard: ${blueprint.apps?.adminDashboard || true}`,
    `  mobileApp: ${blueprint.apps?.mobileApp || false}`,
    '',
    'agents:',
    ...(blueprint.agents || []).map(a => `  - name: "${a.name || a.key}"`),
    '',
    'integrations:',
    ...(blueprint.integrations || []).map(i => `  - "${i}"`),
    ''
  ];

  return lines.join('\n');
}

/**
 * Generate hojai.ai.md content
 */
function generateHojaiAiMd(blueprint, vars) {
  const agentsList = (blueprint.agents || [])
    .map(a => `- **${a.name || a.key}** (${a.type || 'agent'}): ${a.description || a.name}`)
    .join('\n');

  const integrationsList = (blueprint.integrations || [])
    .map(i => `- ${i}`)
    .join('\n');

  const regionsList = (blueprint.config.regions || ['us-east']).join(', ');

  return `# ${blueprint.config.name}

> Generated by HOJAI Studio — AI-native company platform

## Overview

${blueprint.idea || `AI-native ${blueprint.config.type} company for ${regionsList}`}

## Company Details

- **Type**: ${blueprint.config.type}
- **Regions**: ${regionsList}
- **Languages**: ${(blueprint.config.languages || ['en']).join(', ')}
- **Currency**: ${blueprint.config.currency}
- **Platform**: ${(blueprint.config.platforms || ['web']).join(', ')}

## AI Workforce

${agentsList || '- CEO Agent (orchestrator)'}

## Pre-built Integrations

${integrationsList || '- CorpID (identity)\n- MemoryOS (memory)\n- TwinOS (digital twins)'}

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Static HTML/JS (mobile-ready)
- **AI**: SUTAR BaseAgent runtime
- **Database**: JSON file store (production: add MongoDB/PostgreSQL)

## Getting Started

\`\`\`bash
npm install
npm run dev
# → Frontend: http://localhost:3000
# → Backend: http://localhost:4001
\`\`\`

## API Endpoints

See \`docs/architecture.md\` for full API documentation.

## Customization

This project was generated by HOJAI Studio. You can customize it by:
1. Editing the source files in \`apps/\`
2. Modifying agent strategies in \`apps/backend/src/agents/\`
3. Adding new routes in \`apps/backend/src/routes/\`

Claude Code and Cursor can read this \`hojai.ai.md\` file to understand your project structure.

---
*Generated by HOJAI AI Architect on ${new Date().toISOString()}*
`;
}

/**
 * Generate README.md
 */
function generateReadme(blueprint, vars) {
  return `# ${blueprint.config.name}

> AI-native ${blueprint.config.type} company — generated by HOJAI Studio

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4001

## What's Included

### AI Workforce
${(blueprint.agents || []).map(a => `- ${a.name || a.key}`).join('\n')}

### Platforms
${(blueprint.config.platforms || ['web']).join(', ')}

### Regions
${(blueprint.config.regions || ['us-east']).join(', ')}

### Languages
${(blueprint.config.languages || ['en']).join(', ')}

## Project Structure

\`\`\`
.
├── apps/
│   ├── backend/           # Express API
│   └── frontend/          # Web UI
├── .hojai/
│   ├── manifest.json      # Project manifest
│   └── capability.json    # CapabilityOS declaration
├── company.blueprint.yaml # Company blueprint
└── hojai.ai.md          # AI context file
\`\`\`

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [AI Agents](docs/agents.md)

---
*Generated by HOJAI Studio on ${new Date().toISOString()}*
`;
}

/**
 * Slugify a string
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}

// Import needed utilities
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
