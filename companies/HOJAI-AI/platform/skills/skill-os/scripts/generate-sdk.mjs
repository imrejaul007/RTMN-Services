#!/usr/bin/env node
/**
 * Generate the TypeScript SDK from /openapi.json.
 *
 * Usage:
 *   node scripts/generate-sdk.mjs                              # reads from HOJAI_SKILLOS_URL/openapi.json
 *   node scripts/generate-sdk.mjs --from-file=path/to/oa.json  # reads from local file
 *   node scripts/generate-sdk.mjs --out=../sdk                  # writes to ../sdk
 *
 * Output:
 *   <out>/types.ts       — type definitions
 *   <out>/client.ts      — typed HTTP client (one method per route)
 *   <out>/index.ts       — barrel
 *   <out>/package.json   — standalone package
 *   <out>/README.md      — usage docs
 *
 * The generated client is a thin wrapper over fetch. All responses are typed
 * as Promise<{ success: boolean, ...rest }>. We don't try to fully type
 * the response body per route — callers cast what they need.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { argv } from 'node:process';

const args = argv.slice(2);
function getFlag(name, def) {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : def;
}

const OUT = resolve(getFlag('out', './sdk'));
const FROM = getFlag('from-file', null);
const URL = getFlag('url', process.env.HOJAI_SKILLOS_URL || 'http://localhost:4743');

async function loadOpenAPI() {
  if (FROM) {
    const text = await readFile(resolve(FROM), 'utf8');
    return JSON.parse(text);
  }
  const res = await fetch(`${URL}/openapi.json`);
  if (!res.ok) throw new Error(`failed to fetch OpenAPI: HTTP ${res.status}`);
  return await res.json();
}

// Method name conversion: 'GET /api/skills/{id}/execute' → 'getApiSkillsIdExecute'
function routeToMethodName(method, path) {
  // Split path into segments, then camelCase
  const parts = path
    .replace(/^\/+/, '')
    .split('/')
    .map((p) => p.replace(/[{}]/g, '')); // strip braces from path params
  // Convert to camelCase: lowercase first segment, capitalize rest, keep digits
  const segments = parts.map((p, i) => {
    if (i === 0) return p.toLowerCase();
    if (/^\d+$/.test(p)) return p; // keep digits as-is
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  });
  const name = segments.join('');
  if (!name) return method.toLowerCase() + 'Root';
  return method.toLowerCase() + name.charAt(0).toUpperCase() + name.slice(1);
}

function generateTypes(openapi) {
  const lines = [];
  lines.push(`/**`);
  lines.push(` * SkillOS SDK — Type definitions`);
  lines.push(` *`);
  lines.push(` * Auto-generated from /openapi.json — DO NOT EDIT BY HAND.`);
  lines.push(` * Regenerate with: node scripts/generate-sdk.mjs`);
  lines.push(` *`);
  lines.push(` * Source version: ${openapi.info.version}`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`export interface ApiResponse<T = any> {`);
  lines.push(`  success: boolean;`);
  lines.push(`  data?: T;`);
  lines.push(`  error?: string;`);
  lines.push(`  message?: string;`);
  lines.push(`  count?: number;`);
  lines.push(`  [k: string]: any;`);
  lines.push(`}`);
  lines.push(``);
  // Build a minimal Skill/Asset/Install/Transaction type from the spec
  const schemas = openapi.components?.schemas || {};
  for (const [name, schema] of Object.entries(schemas)) {
    lines.push(`export interface ${name} {`);
    for (const [k, v] of Object.entries(schema.properties || {})) {
      const t = mapType(v);
      lines.push(`  ${k}?: ${t};`);
    }
    lines.push(`}`);
    lines.push(``);
  }
  return lines.join('\n');
}

function mapType(prop) {
  if (prop.enum) return prop.enum.map((e) => `'${e}'`).join(' | ');
  switch (prop.type) {
    case 'string': return 'string';
    case 'integer':
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'array': return mapType(prop.items || {}) + '[]';
    default: return 'any';
  }
}

function generateClient(openapi) {
  const lines = [];
  lines.push(`/**`);
  lines.push(` * SkillOS SDK — Typed HTTP client`);
  lines.push(` *`);
  lines.push(` * Auto-generated from /openapi.json — DO NOT EDIT BY HAND.`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`import type { ApiResponse, Skill, Asset, Install, Transaction } from './types.js';`);
  lines.push(``);
  lines.push(`export interface ClientConfig {`);
  lines.push(`  baseUrl?: string;`);
  lines.push(`  token?: string;`);
  lines.push(`  fetch?: typeof fetch;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export class SkillsClient {`);
  lines.push(`  private baseUrl: string;`);
  lines.push(`  private token?: string;`);
  lines.push(`  private fetcher: typeof fetch;`);
  lines.push(``);
  lines.push(`  constructor(config: ClientConfig = {}) {`);
  lines.push(`    this.baseUrl = (config.baseUrl || '${URL}').replace(/\\/$/, '');`);
  lines.push(`    this.token = config.token;`);
  lines.push(`    this.fetcher = config.fetch || fetch;`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  private async request(method: string, path: string, body?: any, query?: Record<string, any>): Promise<ApiResponse> {`);
  lines.push(`    let url = this.baseUrl + path;`);
  lines.push(`    if (query) {`);
  lines.push(`      const qs = Object.entries(query)`);
  lines.push(`        .filter(([, v]) => v !== undefined && v !== null)`);
  lines.push(`        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))`);
  lines.push(`        .join('&');`);
  lines.push(`      if (qs) url += '?' + qs;`);
  lines.push(`    }`);
  lines.push(`    const headers: Record<string, string> = { 'Content-Type': 'application/json' };`);
  lines.push(`    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;`);
  lines.push(`    const res = await this.fetcher(url, {`);
  lines.push(`      method,`);
  lines.push(`      headers,`);
  lines.push(`      body: body !== undefined ? JSON.stringify(body) : undefined,`);
  lines.push(`    });`);
  lines.push(`    const text = await res.text();`);
  lines.push(`    let data: any;`);
  lines.push(`    try { data = text ? JSON.parse(text) : null; } catch { data = text; }`);
  lines.push(`    if (!res.ok) {`);
  lines.push(`      const err = new Error(data?.message || data?.error || 'HTTP ' + res.status);`);
  lines.push(`      (err as any).status = res.status;`);
  lines.push(`      (err as any).body = data;`);
  lines.push(`      throw err;`);
  lines.push(`    }`);
  lines.push(`    return data;`);
  lines.push(`  }`);
  lines.push(``);

  // One method per (method, path) combination
  const seen = new Set();
  for (const [path, item] of Object.entries(openapi.paths || {})) {
    for (const [method, op] of Object.entries(item)) {
      // Skip non-operation keys (parameters, summary, description) and require it to be an object
      if (typeof op !== 'object' || !op.summary && !op.tags) continue;
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const key = `${method} ${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const name = routeToMethodName(method, path);
      const pathParams = (path.match(/\{[^}]+\}/g) || []).map((p) => p.slice(1, -1));
      const queryParams = (op.parameters || []).filter((p) => p.in === 'query').map((p) => p.name);
      let pathExpr = path;
      for (const p of pathParams) {
        pathExpr = pathExpr.replace(`{${p}}`, `\${encodeURIComponent(String(${p}))}`);
      }
      // Signature: path params as positional args, then an optional params object, then an optional body
      const args_ = [];
      for (const p of pathParams) args_.push(`${p}: string`);
      if (queryParams.length) args_.push(`params: { ${queryParams.map((p) => `${p}?: any`).join('; ')} } = {}`);
      if (method !== 'get' && method !== 'delete') args_.push('body?: any');
      else args_.push('_body?: any'); // ignored, but keeps positional consistency for GETs
      const sig = `  async ${name}(${args_.join(', ')}): Promise<ApiResponse> {`;
      lines.push(`  /**`);
      lines.push(`   * ${op.summary || key}`);
      lines.push(`   * Tags: ${(op.tags || []).join(', ')}`);
      lines.push(`   */`);
      lines.push(sig);
      lines.push(`    return this.request('${method.toUpperCase()}', \`${pathExpr}\`, ${method !== 'get' && method !== 'delete' ? 'body' : 'undefined'}, ${queryParams.length ? 'params' : 'undefined'});`);
      lines.push(`  }`);
      lines.push(``);
    }
  }

  lines.push(`}`);
  lines.push(``);
  return lines.join('\n');
}

function generateIndex() {
  return `/**
 * SkillOS SDK — barrel export
 */
export * from './types.js';
export { SkillsClient, type ClientConfig } from './client.js';
`;
}

function generatePackageJson() {
  return JSON.stringify({
    name: '@hojai/skills-sdk',
    version: '1.2.0',
    description: 'TypeScript SDK for the SkillOS AI Capability Marketplace',
    type: 'module',
    main: 'index.ts',
    types: 'index.ts',
    exports: {
      '.': {
        types: './index.ts',
        import: './index.ts',
      },
    },
    scripts: {
      'check': 'tsc --noEmit --strict index.ts',
    },
    keywords: ['hojai', 'skills', 'skillos', 'ai', 'marketplace', 'sdk'],
    license: 'MIT',
  }, null, 2);
}

function generateReadme() {
  return `# @hojai/skills-sdk

TypeScript SDK for the **SkillOS** AI Capability Marketplace.

## Install

\`\`\`bash
npm install @hojai/skills-sdk
\`\`\`

## Usage

\`\`\`typescript
import { SkillsClient } from '@hojai/skills-sdk';

const client = new SkillsClient({
  baseUrl: 'http://localhost:4743',
  token: process.env.HOJAI_AUTH_TOKEN,
});

// List all skill assets
const { data } = await client.getApiAssets({ type: 'skill' });
console.log(data.assets);

// Install an asset for a tenant
const install = await client.postApiAssetsIdInstall('ast-agent-salesbot', {}, { tenantId: 'acme-corp' });

// Search with semantic similarity
const results = await client.getApiDiscoverSemantic({ q: 'negotiate price', k: 5 });
console.log(results.data.results);
\`\`\`

## Regenerate

\`\`\`bash
node scripts/generate-sdk.mjs
\`\`\`

Reads \`/openapi.json\` from the running SkillOS service and writes a fresh
TypeScript client. The generated files have a \`DO NOT EDIT BY HAND\` header.

## License

MIT
`;
}

async function main() {
  const oa = await loadOpenAPI();
  await mkdir(OUT, { recursive: true });
  const files = {
    'types.ts': generateTypes(oa),
    'client.ts': generateClient(oa),
    'index.ts': generateIndex(),
    'package.json': generatePackageJson(),
    'README.md': generateReadme(),
  };
  for (const [name, content] of Object.entries(files)) {
    const path = resolve(OUT, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
    console.log(`✓ wrote ${path} (${content.length} bytes)`);
  }
  const routeCount = Object.values(oa.paths || {}).reduce((acc, p) => acc + Object.keys(p).filter((k) => ['get', 'post', 'put', 'patch', 'delete'].includes(k)).length, 0);
  console.log(`\nSDK generated: ${routeCount} routes, ${Object.keys(oa.components?.schemas || {}).length} schemas`);
}

main().catch((e) => { console.error(e); process.exit(1); });
