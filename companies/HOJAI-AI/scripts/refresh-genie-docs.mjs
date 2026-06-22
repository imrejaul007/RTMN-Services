#!/usr/bin/env node
/**
 * refresh-genie-docs.mjs
 *
 * Bulk-update all 23 Genie specialist CLAUDE.md files for Phase 7:
 *   1. Date bump to 2026-06-22
 *   2. Fix wrong service path (services/genie-X → products/genie/genie-X)
 *   3. Add "Auth (Phase 7)" section
 *   4. Add auth header to curl examples
 *
 * Idempotent: re-running on already-updated files is a no-op.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'products/genie';
const TODAY = 'June 22, 2026';
const SERVICES = [
  'genie-briefing-service',
  'genie-calendar-service',
  'genie-companion-service',
  'genie-consultant-agent',
  'genie-creation-os',
  'genie-device-integration',
  'genie-execution-engine',
  'genie-gateway',
  'genie-learning-os',
  'genie-life-gps',
  'genie-life-university',
  'genie-listening-modes',
  'genie-memory-graph',
  'genie-memory-inbox',
  'genie-money-os',
  'genie-relationship-os',
  'genie-serendipity-service',
  'genie-shopping-agent',
  'genie-smart-forgetting-service',
  'genie-thinking-engine',
  'genie-universal-search',
  'genie-wake-word-service',
  'genie-wellness-os',
];

const AUTH_SECTION = `
---

## 🔐 Auth (Phase 7)

This service now requires a **Bearer JWT** (CorpID-issued) on every request except \`/health\`, \`/\`, and \`/ready\`. Auth is enforced via \`app.use(requireAuth)\` from \`@rtmn/shared/auth\`.

**Get a token:**

\`\`\`bash
# Dev shortcut (base64 JSON token — matches what requireAuth verifies):
TOKEN=$(curl -s -X POST http://localhost:4702/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"dev"}' | jq -r .token)
\`\`\`

**Call this service:**

\`\`\`bash
curl http://localhost:PORT/health                      # public, no token
curl http://localhost:PORT/your-endpoint \\
  -H "Authorization: Bearer $TOKEN"                   # protected
\`\`\`

**Disable in dev/test:** Set \`SERVICE_REQUIRE_AUTH=false\` env var.

See [shared/MIGRATION-GUIDE.md](../../shared/MIGRATION-GUIDE.md) for the full \`@rtmn/shared/auth\` pattern and the canonical thin-shim approach.
`;

let updated = 0;
let skipped = 0;
let failed = 0;

for (const svc of SERVICES) {
  const file = path.join(ROOT, svc, 'CLAUDE.md');
  if (!fs.existsSync(file)) {
    console.error(`MISSING: ${file}`);
    failed++;
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let changes = [];

  // 1. Date bump — multiple patterns
  // Pattern A: "Last Updated: June 18, 2026" (blockquote)
  if (content.includes('Last Updated:** June 18, 2026')) {
    content = content.replace(/Last Updated:\*\* June 18, 2026/g, `Last Updated:** ${TODAY}`);
    changes.push('date (blockquote)');
  } else if (content.includes('Last Updated: June 18, 2026')) {
    content = content.replace(/Last Updated: June 18, 2026/g, `Last Updated: ${TODAY}`);
    changes.push('date (plain)');
  }

  // Pattern A2: "**June 18, 2026**" inline in status line (genie-gateway)
  if (content.includes('**June 18, 2026**')) {
    content = content.replace(/\*\*June 18, 2026\*\*/g, `**${TODAY}**`);
    if (!changes.includes('date (blockquote)') && !changes.includes('date (plain)')) {
      changes.push('date (inline)');
    }
  }

  // 2. Fix wrong service path
  if (content.includes('companies/HOJAI-AI/services/genie-')) {
    content = content.replace(/cd companies\/HOJAI-AI\/services\/genie-/g, 'cd products/genie/genie-');
    content = content.replace(/companies\/HOJAI-AI\/services\/genie-/g, 'products/genie/genie-');
    changes.push('path');
  }

  // 3. Add Auth section if not present
  if (!content.includes('## 🔐 Auth (Phase 7)') && !content.includes('## Auth (Phase 7)')) {
    // Insert after the first '---' that follows the front matter
    // Find the first '---' line that's followed by a blank line and then content
    const lines = content.split('\n');
    let insertIdx = -1;
    let inFrontMatter = false;
    let seenFirstH1 = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('# ') && !seenFirstH1) {
        seenFirstH1 = true;
        continue;
      }
      if (seenFirstH1 && lines[i] === '---' && i > 0 && lines[i-1].trim() === '') {
        // Found the first separator after the header
        insertIdx = i + 1;
        break;
      }
    }

    if (insertIdx > 0) {
      const before = lines.slice(0, insertIdx).join('\n');
      const after = lines.slice(insertIdx).join('\n');
      content = before + AUTH_SECTION + after;
      changes.push('auth section');
    } else {
      // Fallback: append at end
      content = content + '\n' + AUTH_SECTION;
      changes.push('auth section (appended)');
    }
  } else {
    changes.push('auth section (skipped, exists)');
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`✓ ${svc} — ${changes.join(', ')}`);
    updated++;
  } else {
    console.log(`· ${svc} — no changes needed`);
    skipped++;
  }
}

console.log(`\n${updated} updated, ${skipped} unchanged, ${failed} failed`);
