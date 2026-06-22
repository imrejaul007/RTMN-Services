#!/usr/bin/env node
/**
 * add-division-prod-section.mjs
 *
 * Appends a "Production Readiness" section to each division's CLAUDE.md
 * that references the Phase 1-5 work.
 *
 * Strategy: insert before the final "*See also:" or "*Last updated:" line.
 */

import fs from 'node:fs';
import path from 'node:path';

const SECTIONS = {
  '01-foundation': {
    title: 'AI Foundation',
    metrics: 'CorpID (4702), API Gateway (4000), Event Bus (4751), Billing, Onboarding (4399), Secrets Manager (4744), Feature Flags (4745), Context Engine (4746), Tenant Manager (4747)',
  },
  '02-infrastructure-cloud': {
    title: 'Infrastructure Cloud',
    metrics: 'Secrets Manager, Feature Flags, Tenant Manager, Onboarding Portal, Billing, Sandbox, Usage Tracker, SLA Manager, AI Safety',
  },
  '03-intelligence-cloud': {
    title: 'Intelligence Cloud',
    metrics: 'AI Intelligence (4881), Reasoning Runtime, RAG Platform, Vector DB, Graph Database, Knowledge Extraction, Inference Gateway, GraphQL Federation, Semantic Cache, Micro Intelligence, Knowledge Marketplace',
  },
  '04-agent-cloud': {
    title: 'Agent Cloud',
    metrics: 'Agent Orchestration, Agent Analytics, Agent Marketplace, Agent Learning, Multi-Agent Runtime, Reasoning Runtime',
  },
  '05-communication-cloud': {
    title: 'Communication Cloud',
    metrics: 'RAZO Keyboard (4725), Notification Service, Webhook Bus, Intent Bus',
  },
  '06-data-knowledge-cloud': {
    title: 'Data & Knowledge Cloud',
    metrics: 'Feature Store, Data Catalog, Knowledge Network, Memory Confidence, Memory Context Engine, RAG, Knowledge Distillation',
  },
  '07-training-model-platform': {
    title: 'Training & Model Platform',
    metrics: 'RLHF Pipeline, Knowledge Distillation, Inference Gateway, Vector DB, Reasoning Runtime',
  },
  '08-products': {
    title: 'Products',
    metrics: 'Genie OS, Meeting OS, Board Intelligence, Genie Companions, Investor Copilot, Startup Studio, Company Builder',
  },
  '09-industry-solutions': {
    title: 'Industry Solutions',
    metrics: 'Industry Twin, Industry Packs, Connector Hub, Connector Marketplace',
  },
  '10-developer-platform': {
    title: 'Developer Platform',
    metrics: 'SDK TypeScript, SDK Python, HOJAI CLI, API Docs Generator',
  },
  '11-marketplace-network': {
    title: 'Marketplace & Network',
    metrics: 'BLR AI Marketplace, Twin Marketplace, Prompt Marketplace, Skill Marketplace, Knowledge Marketplace',
  },
  '12-sutar-os': {
    title: 'SUTAR OS',
    metrics: 'Gateway (4140), Twin OS (4142), Memory Bridge (4143), Identity (4144), Agent ID (4145), Agent Network (4155), Contracts (4185), Negotiation (4191), Trust Network, Decision Engine (4240), Goal OS (4242), Flow OS (4260), Policy OS, Discovery Engine, Multi-Agent Evaluator, Reputation Aggregator, ROI Calculator, Founder OS (4260)',
  },
};

const SECTION_TEMPLATE = (title, metrics) => `## Production Readiness

As of 2026-06-22, all services in this division meet the **production-ready bar** (see [../../PRODUCTION-READINESS-SUMMARY.md](../../PRODUCTION-READINESS-SUMMARY.md) for details):

- ✅ **Auth** — All mutating routes use \`requireAuth\` from \`@rtmn/shared/auth\`
- ✅ **Env validation** — \`requireEnv(['PORT'])\` at startup
- ✅ **No hardcoded secrets** — \`process.env.X\` with no \`|| 'default'\` fallbacks
- ✅ **\`/ready\` endpoint** — K8s-style readiness probe
- ✅ **\`installGracefulShutdown(server)\`** — Drains in-flight requests on SIGTERM/SIGINT
- ✅ **\`PersistentMap\`** — File-backed in-memory state (where applicable)
- ✅ **Structured logging** — winston via \`@rtmn/shared/lib/logger\`

**Services in this division:** ${metrics}

**Verify with:**
\`\`\`bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
node scripts/audit-auth.mjs                  # 0 unprotected routes
node scripts/audit-secrets.mjs               # 0 hardcoded fallbacks
node scripts/audit-ready-endpoints.mjs       # 100% have /ready
\`\`\`

---

`;

const DRY_RUN = process.argv.includes('--dry-run');
let modified = 0, skipped = 0, errors = 0;

for (const [div, info] of Object.entries(SECTIONS)) {
  const filepath = path.join('divisions', div, 'CLAUDE.md');
  if (!fs.existsSync(filepath)) {
    console.error(`✗ ${filepath} not found`);
    errors++;
    continue;
  }
  let src = fs.readFileSync(filepath, 'utf8');

  if (src.includes('## Production Readiness')) {
    console.log(`already has section: ${filepath}`);
    skipped++;
    continue;
  }

  const section = SECTION_TEMPLATE(info.title, info.metrics);

  // Try to insert before "*See also*" or "*Last updated*"
  let insertAt = -1;
  const seeAlsoMatch = src.match(/^\*See also:/m);
  if (seeAlsoMatch) {
    insertAt = seeAlsoMatch.index;
  } else {
    const lastUpdatedMatch = src.match(/^\*Last Updated:/m);
    if (lastUpdatedMatch) insertAt = lastUpdatedMatch.index;
  }

  if (insertAt === -1) {
    // Fall back: append to end
    if (DRY_RUN) {
      console.log(`[dry-run] would append to: ${filepath}`);
    } else {
      fs.writeFileSync(filepath, src + '\n' + section, 'utf8');
    }
  } else {
    const patched = src.slice(0, insertAt) + section + src.slice(insertAt);
    if (DRY_RUN) {
      console.log(`[dry-run] would insert at line ${src.slice(0, insertAt).split('\n').length}: ${filepath}`);
    } else {
      fs.writeFileSync(filepath, patched, 'utf8');
    }
  }
  modified++;
}

console.log(`\n=== Division Doc Update Summary ===`);
console.log(`Modified: ${modified}`);
console.log(`Skipped:  ${skipped}`);
console.log(`Errors:   ${errors}`);
console.log(DRY_RUN ? '(dry run)' : '(files written)');
