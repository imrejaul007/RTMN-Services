#!/usr/bin/env node
/**
 * HOJAI docs site generator.
 *
 * Scans all @hojai/* SDK directories for CLAUDE.md + README.md and emits
 * a static site at ./public. Uses zero npm dependencies — vanilla
 * Node + stdlib (fs/path/markdown-rendered).
 *
 *   node src/build.mjs           # build the site to ./public
 *   node src/build.mjs --serve   # build + serve at http://localhost:4400
 *
 * Output structure:
 *   public/
 *     index.html              (homepage)
 *     quickstart.html         (5-min quickstart)
 *     sdks/<name>.html        (one per SDK, with methods + types)
 *     cli.html                (CLI reference)
 *     assets/
 *       style.css            (shared styles)
 *       sidebar.html         (navigation snippet)
 *       manifest.json        (machine-readable SDK list)
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(__dirname, '..');
// docs/site -> docs -> companies/HOJAI-AI
const ROOT = path.resolve(SITE_DIR, '..', '..');
const SDK_DIR = path.join(ROOT, 'sdk');
const PUBLIC_DIR = path.join(SITE_DIR, 'public');
const TEMPLATES_DIR = path.join(SITE_DIR, 'src', 'templates');

const CLI_DIR = path.join(ROOT, 'sdk', 'hojai-cli');
const AI_SPEC_DIR = path.join(ROOT, 'sdk', 'hojai-ai-spec');

// ─── Helpers ──────────────────────────────────────────────────

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Minimal markdown → HTML. Supports: h1-h4, code blocks, inline code, paragraphs, lists, tables, links. */
function mdToHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  const out = [];
  let inCode = false;
  let codeBuf = [];
  let codeLang = '';
  let inList = null; // 'ul' | 'ol' | null
  let inTable = false;
  let tableBuf = [];

  function flushList() {
    if (inList) { out.push(`</${inList}>`); inList = null; }
  }
  function flushTable() {
    if (inTable) {
      // tableBuf is array of rows (arrays of cells)
      const header = tableBuf[0] || [];
      const body = tableBuf.slice(2); // skip header + separator
      out.push('<table class="md-table"><thead><tr>');
      for (const c of header) out.push(`<th>${inlineMd(c)}</th>`);
      out.push('</tr></thead><tbody>');
      for (const row of body) {
        out.push('<tr>');
        for (const c of row) out.push(`<td>${inlineMd(c)}</td>`);
        out.push('</tr>');
      }
      out.push('</tbody></table>');
      inTable = false;
      tableBuf = [];
    }
  }

  function inlineMd(s) {
    // Escape, then re-inject basic formatting
    s = escapeHtml(s);
    // inline code
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // bold
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic (avoiding bold collision)
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    // links
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return s;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code fences
    if (line.match(/^```/)) {
      if (inCode) {
        out.push(`<pre class="md-code"><code class="lang-${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        codeBuf = []; codeLang = ''; inCode = false;
      } else {
        flushList(); flushTable();
        inCode = true;
        codeLang = line.replace(/^```/, '').trim();
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    // Headings
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flushList(); flushTable();
      const level = h[1].length;
      out.push(`<h${level}>${inlineMd(h[2])}</h${level}>`);
      continue;
    }

    // Tables
    if (line.match(/^\|.+\|$/)) {
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      if (!inTable) { inTable = true; tableBuf = []; }
      tableBuf.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Unordered list
    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      if (inList !== 'ul') { flushList(); inList = 'ul'; out.push('<ul>'); }
      out.push(`<li>${inlineMd(ul[1])}</li>`);
      continue;
    }
    // Ordered list
    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (inList !== 'ol') { flushList(); inList = 'ol'; out.push('<ol>'); }
      out.push(`<li>${inlineMd(ol[1])}</li>`);
      continue;
    }

    if (inList && line.trim() === '') { flushList(); continue; }

    // Blank line → paragraph break
    if (line.trim() === '') { flushList(); continue; }

    // Default: paragraph
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  flushList(); flushTable();
  if (inCode) {
    out.push(`<pre class="md-code"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
  }
  return out.join('\n');
}

// ─── SDK discovery ──────────────────────────────────────────

async function discoverSdks() {
  const entries = await fs.readdir(SDK_DIR, { withFileTypes: true });
  const sdks = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!e.name.startsWith('hojai-')) continue;
    const sdkPath = path.join(SDK_DIR, e.name);
    const claudePath = path.join(sdkPath, 'CLAUDE.md');
    const pkgPath = path.join(sdkPath, 'package.json');
    const readmePath = path.join(sdkPath, 'README.md');
    let claudeMd = null, readmeMd = null, pkg = null;
    try { claudeMd = await fs.readFile(claudePath, 'utf-8'); } catch {}
    try { readmeMd = await fs.readFile(readmePath, 'utf-8'); } catch {}
    try { pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')); } catch {}
    if (!claudeMd && !readmeMd) continue;

    // Pull a 1-line description: prefer the H1 of README, fall back to package.json
    let description = pkg?.description || '';
    if (!description && readmeMd) {
      const m = readmeMd.match(/^#\s+.+\n+(.+)$/m);
      if (m) description = m[1].trim();
    }

    sdks.push({
      name: e.name,
      shortName: e.name.replace(/^hojai-/, ''),
      dir: sdkPath,
      packageJson: pkg,
      description: description.slice(0, 240),
      claudeMd, readmeMd,
      // Best-effort: extract method count from CLAUDE.md (looks for "N methods")
      methodCount: extractMethodCount(claudeMd)
    });
  }
  // Sort: foundation first, cli second, then alphabetical
  sdks.sort((a, b) => {
    const order = (n) => n === 'hojai-foundation' ? 0 : n === 'hojai-cli' ? 1 : n === 'hojai-ai-spec' ? 2 : 3;
    const oa = order(a.name), ob = order(b.name);
    if (oa !== ob) return oa - ob;
    return a.shortName.localeCompare(b.shortName);
  });
  return sdks;
}

function extractMethodCount(md) {
  if (!md) return null;
  const m = md.match(/(\d+)\+?\s*methods?\b/i);
  return m ? Number(m[1]) : null;
}

// ─── Page templates ──────────────────────────────────────────

function pageShell({ title, content, sdks, currentPath, bodyClass = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — HOJAI docs</title>
<link rel="stylesheet" href="/assets/style.css">
</head>
<body class="${bodyClass}">
<aside class="sidebar">
  <div class="brand">
    <a href="/">HOJAI</a>
    <small>docs.hojai.ai</small>
  </div>
  <nav>
    <a href="/" class="${currentPath === '/' ? 'active' : ''}">Home</a>
    <a href="/quickstart.html" class="${currentPath === '/quickstart.html' ? 'active' : ''}">Quickstart</a>
    <a href="/cli.html" class="${currentPath === '/cli.html' ? 'active' : ''}">CLI reference</a>
    <a href="/ai-native.html" class="${currentPath === '/ai-native.html' ? 'active' : ''}">AI-native spec</a>
    <h3>SDKs (${sdks.length})</h3>
${sdks.map(s => `    <a href="/sdks/${s.shortName}.html" class="${currentPath === `/sdks/${s.shortName}.html` ? 'active' : ''}" title="${escapeHtml(s.description)}">${s.shortName}</a>`).join('\n')}
  </nav>
  <footer>Built ${new Date().toISOString().slice(0, 10)} · <a href="https://github.com/hojai-ai/hojai">github</a></footer>
</aside>
<main>
${content}
</main>
</body>
</html>`;
}

function homepageHtml(sdks) {
  const featured = ['foundation', 'cli', 'ai-spec', 'sutar', 'nexha', 'industry', 'razor', 'whatsapp', 'bizora'];
  const cards = featured.map(name => sdks.find(s => s.shortName === name)).filter(Boolean);

  const content = `
<section class="hero">
  <h1>HOJAI developer platform</h1>
  <p class="lead">Build AI-native businesses with the operating system for the autonomous economy.</p>
  <p class="cta">
    <a class="btn primary" href="/quickstart.html">Get started in 5 minutes →</a>
    <a class="btn" href="#sdks">Browse ${sdks.length} SDKs</a>
  </p>
</section>

<section>
  <h2>What is HOJAI?</h2>
  <p>HOJAI is the platform for building AI-native companies. The stack pairs a unified SUTAR agent runtime with 24 vertical Industry OSes, 9 horizontal Department OSes, and a global Nexha federation network — so any developer (or any AI coding assistant) can scaffold a working AI-native business in 30 minutes.</p>
  <ul>
    <li><strong>One foundation SDK</strong> for identity, memory, twin, trust, flow, and policy.</li>
    <li><strong>Eight + one horizontal layer</strong> for sales, marketing, HR, finance, operations, CXO, customer success, procurement — plus revenue intelligence.</li>
    <li><strong>Twenty-six vertical OSes</strong> for restaurant, hotel, healthcare, retail, manufacturing, and more.</li>
    <li><strong>A federated network</strong> so your business can discover and transact with peers across the world.</li>
    <li><strong>An AI-native spec</strong> so Claude Code, Cursor, and Codex understand your project from <code>hojai.ai.md</code> alone.</li>
  </ul>
</section>

<section id="sdks">
  <h2>Featured SDKs</h2>
  <p>Every SDK is a self-contained npm package (<code>@hojai/*</code>) with full TypeScript types and a CLI-friendly API. The full list is in the sidebar.</p>
  <div class="grid">
${cards.map(s => `    <a class="card" href="/sdks/${s.shortName}.html">
      <h3>@hojai/${s.shortName}</h3>
      <p>${escapeHtml(s.description || '')}</p>
    </a>`).join('\n')}
  </div>
  <p><a href="#all-sdks">Jump to the full list of ${sdks.length} SDKs ↓</a></p>
</section>

<section id="all-sdks">
  <h2>All ${sdks.length} SDKs</h2>
  <div class="grid">
${sdks.map(s => `    <a class="card" href="/sdks/${s.shortName}.html">
      <h3>@hojai/${s.shortName}</h3>
      <p>${escapeHtml(s.description || '(no description)')}</p>
      ${s.methodCount ? `<small>${s.methodCount} methods</small>` : ''}
    </a>`).join('\n')}
  </div>
</section>

<section>
  <h2>Quick start</h2>
  <pre class="md-code"><code># Install the CLI
npm install -g @hojai/cli

# Configure your HOJAI API key
hojai config set --api-key hojai_live_xxxx

# Verify
hojai whoami

# Scaffold a project
npx hojai create
cd my-project &amp;&amp; npm install
hojai ai-spec generate     # writes hojai.ai.md for AI tools
hojai doctor               # verifies your environment
hojai deploy               # ships the project</code></pre>
  <p><a href="/quickstart.html">Full quickstart →</a></p>
</section>
`;
  return pageShell({ title: 'HOJAI developer platform', content, sdks, currentPath: '/' });
}

function quickstartHtml(sdks) {
  const content = `
<h1>Quickstart</h1>
<p>Get a HOJAI project running in under 5 minutes.</p>

<h2>1. Install the CLI</h2>
<pre class="md-code"><code>npm install -g @hojai/cli
# or use npx without installing
npx hojai --help</code></pre>

<h2>2. Configure your API key</h2>
<pre class="md-code"><code>hojai config set --api-key hojai_live_xxxx
hojai whoami  # verify the connection</code></pre>
<p>Or set environment variables instead:</p>
<pre class="md-code"><code>export HOJAI_API_KEY=hojai_live_xxxx
export HOJAI_BASE_URL=https://api.hojai.ai</code></pre>

<h2>3. Scaffold a project</h2>
<pre class="md-code"><code>npx hojai create
# Or non-interactive:
npx hojai create --template marketplace --region us-east --name my-app</code></pre>
<p>The scaffolder prompts you for a template (marketplace, b2b, company, hotel, …), agents, region, and languages. Output is a working Node + Express project.</p>

<h2>4. Install + run</h2>
<pre class="md-code"><code>cd my-app
npm install
npm run dev
# → backend on http://localhost:4001
# → frontend on http://localhost:3000</code></pre>

<h2>5. Generate the AI-native spec</h2>
<pre class="md-code"><code>hojai ai-spec generate</code></pre>
<p>Creates <code>hojai.ai.md</code> + <code>.hojai/manifest.json</code> + <code>.hojai/capability.json</code>. Now Claude Code / Cursor / Codex can read your project.</p>

<h2>6. Verify with <code>hojai doctor</code></h2>
<pre class="md-code"><code>hojai doctor</code></pre>
<p>Runs 5 health checks: config, gateway, auth, project files, deps. Exits non-zero on failure — CI-friendly.</p>

<h2>7. Deploy</h2>
<pre class="md-code"><code>hojai deploy                # local: spawns the project on a free port
hojai deploy --mode=preview  # generates dist/preview.html
hojai deploy --mode=remote  # POSTs to HOJAI Cloud</code></pre>

<h2>8. Extend with the SDKs</h2>
<p>Every HOJAI service has a matching SDK. Some you might use right away:</p>
<pre class="md-code"><code>npm install @hojai/foundation @hojai/sutar @hojai/memory</code></pre>
<pre class="md-code"><code>import { Hojai } from '@hojai/foundation';
import { Memory } from '@hojai/memory';

const hojai = new Hojai({ apiKey, baseUrl: 'https://api.hojai.ai' });
await hojai.corpId.create({ type: 'company', metadata: { name: 'My Co' } });
const mem = new Memory({ apiKey, baseUrl: 'https://api.hojai.ai' });
await mem.write('my-key', { value: 'hello' });</code></pre>
<p>Browse the <a href="#all-sdks">${sdks.length} SDKs in the sidebar</a> for the full list.</p>

<h2>Next steps</h2>
<ul>
  <li>Read the <a href="/ai-native.html">AI-native spec</a> to understand how AI tools read your project.</li>
  <li>Browse the <a href="/cli.html">CLI reference</a> for the full command surface.</li>
  <li>Use <code>hojai add agent "Sales Coach"</code> to scaffold a new SUTAR agent.</li>
  <li>Use <code>hojai add industry restaurant</code> to wire a vertical into an existing project.</li>
</ul>
`;
  return pageShell({ title: 'Quickstart', content, sdks, currentPath: '/quickstart.html' });
}

function aiNativeHtml(sdks, aiSpecContent) {
  const content = `
<h1>The AI-native spec</h1>
<p>Every HOJAI project carries three files at the project root:</p>
<pre class="md-code"><code>my-project/
├── hojai.ai.md             # Markdown — AI tools (Claude Code, Cursor,
│                          #   Codex, GitHub Copilot) read this FIRST
└── .hojai/
    ├── manifest.json       # Machine-readable project schema
    └── capability.json     # Nexha federation profile</code></pre>

<h2>Why this matters</h2>
<p>Without <code>hojai.ai.md</code>, AI tools are blind to the HOJAI architecture of your project. With it, they understand the project structure, SDKs, agents, conventions, and how to extend it — and can scaffold new code that fits the patterns.</p>
<p>It's the bridge between "code that exists" and "code that AI can build on."</p>

<h2>hojai.ai.md</h2>
<p>Auto-generated markdown. Covers:</p>
<ul>
  <li>Project name + description + region + languages + template + HOJAI version</li>
  <li>Architecture (backend / frontend / mobile / database / AI stack)</li>
  <li>SUTAR agents (table of role + purpose + file path)</li>
  <li>HOJAI SDKs used (with one-line descriptions)</li>
  <li>Nexha federation capabilities</li>
  <li>Entry points, scripts, conventions</li>
  <li>"How to extend" (add agent, add endpoint, connect to Nexha)</li>
</ul>

<h2>.hojai/manifest.json</h2>
<p>Machine-readable project schema. Versioned (1.0.0). Zod-validated. Includes:</p>
<pre class="md-code"><code>{
  "schemaVersion": "1.0.0",
  "projectId": "...",
  "name": "my-project",
  "type": "marketplace",
  "region": "us-east",
  "languages": ["en"],
  "stack": { "backend": "node-express-typescript", ... },
  "agents": [{ "role": "CEO", "purpose": "Orchestrator" }],
  "integrations": ["foundation", "sutar", "nexha", ...]
}</code></pre>

<h2>.hojai/capability.json</h2>
<p>Nexha federation profile. Includes the layer (1-9), capabilities, regions, languages, SLA targets.</p>

<h2>Generating the spec</h2>
<p>Use <code>hojai ai-spec generate</code> in a HOJAI project root:</p>
<pre class="md-code"><code>cd my-project
hojai ai-spec generate     # writes 3 files
hojai ai-spec read         # shows the current spec
hojai ai-spec validate     # validates all 3 files</code></pre>

<h2>Schema reference</h2>
<p>The Zod schemas for both files are defined in <a href="/sdks/ai-spec.html">@hojai/ai-spec</a>:</p>
<ul>
  <li><a href="/sdks/ai-spec.html#schemas"><code>ManifestSchema</code></a> — project schema</li>
  <li><a href="/sdks/ai-spec.html#schemas"><code>CapabilitySchema</code></a> — federation profile</li>
  <li><a href="/sdks/ai-spec.html#rendering">renderFor()</a> — pick the right template per project type</li>
</ul>

<h2>Why this matters for the platform</h2>
<p>The AI-native spec is the "fingerprint" of a HOJAI project. Every starter template generates one automatically. Every new project should run <code>hojai ai-spec generate</code> in CI to keep the spec in sync with the code.</p>

<p>It's also the <strong>single most important artifact</strong> in the developer platform, per the official plan:</p>
<blockquote>"This is the most important part. The spec that tells AI coding tools how to build on HOJAI."
<br><small>— <code>hojai-developer-platform-spec.md</code>, § 3</small></blockquote>
${aiSpecContent ? `<h2>Example (from @hojai/ai-spec)</h2>
${aiSpecContent}` : ''}
`;
  return pageShell({ title: 'AI-native spec', content, sdks, currentPath: '/ai-native.html' });
}

function cliReferenceHtml(sdks, helpContent) {
  const content = `
<h1>CLI reference — <code>hojai</code></h1>
<p>The <code>@hojai/cli</code> package ships a <code>hojai</code> binary. Install globally with <code>npm install -g @hojai/cli</code> or use via <code>npx hojai</code>.</p>

<h2>Global flags</h2>
<ul>
  <li><code>--json</code> — machine-readable JSON output</li>
  <li><code>--api-key &lt;key&gt;</code> — override API key for one invocation</li>
  <li><code>--base-url &lt;url&gt;</code> — override HOJAI base URL</li>
</ul>

<h2>Environment</h2>
<ul>
  <li><code>HOJAI_API_KEY</code> — API key (overrides config file)</li>
  <li><code>HOJAI_BASE_URL</code> — base URL</li>
  <li><code>NO_COLOR</code> — disable colored output</li>
</ul>

${helpContent}

<h2>Quick examples</h2>
<pre class="md-code"><code># Authentication
hojai config set --api-key hojai_live_xxxx
hojai whoami

# Scaffold
npx hojai create --template marketplace

# Day-to-day
hojai ai-spec generate
hojai info
hojai doctor
hojai deploy

# Extend
hojai add agent "Sales Coach"
hojai add integration payment
hojai add industry restaurant</code></pre>
`;
  return pageShell({ title: 'CLI reference', content, sdks, currentPath: '/cli.html' });
}

function sdkPageHtml(sdk, sdks) {
  const content = `
<h1>@hojai/${escapeHtml(sdk.shortName)}</h1>
<p class="lead">${escapeHtml(sdk.description || 'HOJAI SDK')}</p>
${sdk.packageJson?.version ? `<p><strong>Version:</strong> ${escapeHtml(sdk.packageJson.version)} · <a href="https://www.npmjs.com/package/@hojai/${sdk.shortName}">npm</a></p>` : ''}
${sdk.packageJson?.main ? `<p><strong>Entry:</strong> <code>${escapeHtml(sdk.packageJson.main)}</code></p>` : ''}

${sdk.methodCount ? `<p><strong>Methods:</strong> ~${sdk.methodCount}</p>` : ''}

${sdk.claudeMd ? `<h2>Overview</h2>
${extractOverview(sdk.claudeMd)}` : ''}

${sdk.claudeMd ? `<h2 id="full-claude">Full CLAUDE.md</h2>
<div class="md">${mdToHtml(sdk.claudeMd)}</div>` : ''}

${sdk.readmeMd ? `<h2 id="readme">README</h2>
<div class="md">${mdToHtml(sdk.readmeMd)}</div>` : ''}
`;
  return pageShell({
    title: `@hojai/${sdk.shortName}`,
    content,
    sdks,
    currentPath: `/sdks/${sdk.shortName}.html`
  });
}

function extractOverview(md) {
  // Get the first non-heading paragraph as a short overview
  const lines = md.split('\n');
  let foundHeading = false;
  const para = [];
  for (const line of lines) {
    if (line.startsWith('#')) { if (foundHeading) break; foundHeading = true; continue; }
    if (foundHeading && line.trim() !== '' && !line.startsWith('#')) {
      para.push(line);
      if (para.join(' ').length > 280) break;
    }
  }
  return `<p>${escapeHtml(para.join(' ').slice(0, 280))}${para.join(' ').length > 280 ? '…' : ''}</p>`;
}

// ─── Styles ────────────────────────────────────────────────────

const STYLES = `
:root {
  --bg: #0a0a0a; --bg-elev: #111418; --bg-elev-2: #1a1f26;
  --fg: #e6edf3; --fg-dim: #8b949e; --fg-mid: #b1bac4;
  --accent: #5eead4; --accent-dim: #2dd4bf; --accent-bg: #0a3d3a;
  --border: #21262d; --code-bg: #0d1117;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --mono: "JetBrains Mono", "SF Mono", "Fira Code", Consolas, Monaco, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); font-family: var(--font); line-height: 1.6; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code { font-family: var(--mono); background: var(--code-bg); padding: 0.15em 0.35em; border-radius: 3px; font-size: 0.88em; color: var(--accent-dim); }
pre.md-code { background: var(--code-bg); border: 1px solid var(--border); border-radius: 6px; padding: 1rem 1.25rem; overflow-x: auto; margin: 1.25rem 0; }
pre.md-code code { background: none; padding: 0; color: var(--fg); font-size: 0.88rem; }
body { display: flex; min-height: 100vh; }
.sidebar { width: 280px; flex: 0 0 280px; background: var(--bg-elev); border-right: 1px solid var(--border); padding: 1.75rem 1.25rem; overflow-y: auto; height: 100vh; position: sticky; top: 0; }
.sidebar .brand { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.25rem; }
.sidebar .brand a { color: var(--fg); }
.sidebar .brand small { display: block; color: var(--fg-dim); font-size: 0.75rem; margin-bottom: 1.5rem; }
.sidebar nav { display: flex; flex-direction: column; }
.sidebar nav a { color: var(--fg-mid); padding: 0.35rem 0.5rem; border-radius: 4px; font-size: 0.9rem; }
.sidebar nav a:hover { background: var(--bg-elev-2); color: var(--fg); text-decoration: none; }
.sidebar nav a.active { background: var(--accent-bg); color: var(--accent); }
.sidebar nav h3 { margin: 1.5rem 0 0.5rem; font-size: 0.7rem; text-transform: uppercase; color: var(--fg-dim); font-weight: 600; letter-spacing: 0.05em; }
.sidebar footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--fg-dim); font-size: 0.75rem; }
.sidebar footer a { color: var(--fg-mid); }
main { flex: 1; padding: 3rem 4rem; max-width: 960px; }
h1 { font-size: 2.2rem; margin: 0 0 1rem; line-height: 1.2; }
h2 { font-size: 1.5rem; margin: 2.5rem 0 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); }
h3 { font-size: 1.15rem; margin: 1.5rem 0 0.5rem; }
p { margin: 0.75rem 0; }
p.lead { font-size: 1.15rem; color: var(--fg-mid); }
.lead { font-size: 1.15rem; color: var(--fg-mid); }
.hero { padding: 2rem 0 3rem; border-bottom: 1px solid var(--border); margin-bottom: 2rem; }
.hero h1 { font-size: 2.6rem; margin-bottom: 0.5rem; }
.hero .cta { margin-top: 1.5rem; }
.btn { display: inline-block; padding: 0.6rem 1.1rem; border: 1px solid var(--border); border-radius: 6px; color: var(--fg); margin-right: 0.5rem; font-size: 0.9rem; }
.btn:hover { background: var(--bg-elev); text-decoration: none; }
.btn.primary { background: var(--accent); color: #0a0a0a; border-color: var(--accent); font-weight: 600; }
.btn.primary:hover { background: var(--accent-dim); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; margin: 1rem 0 2rem; }
.card { display: block; padding: 1.1rem 1.25rem; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 8px; color: var(--fg); }
.card:hover { border-color: var(--accent-dim); text-decoration: none; background: var(--bg-elev-2); }
.card h3 { margin: 0 0 0.4rem; font-size: 1rem; color: var(--accent); }
.card p { margin: 0.25rem 0 0.4rem; font-size: 0.85rem; color: var(--fg-mid); }
.card small { color: var(--fg-dim); font-size: 0.75rem; }
.md h1, .md h2, .md h3 { margin-top: 1.5rem; }
.md p, .md li { color: var(--fg-mid); }
.md ul, .md ol { padding-left: 1.5rem; }
.md li { margin: 0.25rem 0; }
.md blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; color: var(--fg-mid); margin: 1rem 0; }
.md-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
.md-table th, .md-table td { padding: 0.5rem 0.75rem; border: 1px solid var(--border); text-align: left; }
.md-table th { background: var(--bg-elev); color: var(--fg); }
.md-table code { background: var(--code-bg); }
@media (max-width: 900px) {
  body { flex-direction: column; }
  .sidebar { width: 100%; height: auto; position: static; }
  main { padding: 1.5rem 1.25rem; }
}
`;

// ─── Build pipeline ──────────────────────────────────────────

async function cleanPublicDir() {
  await fs.rm(PUBLIC_DIR, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(path.join(PUBLIC_DIR, 'assets'), { recursive: true });
  await fs.mkdir(path.join(PUBLIC_DIR, 'sdks'), { recursive: true });
}

async function writeAssets() {
  await fs.writeFile(path.join(PUBLIC_DIR, 'assets', 'style.css'), STYLES);
}

async function writeJsonManifest(sdks) {
  const out = {
    generatedAt: new Date().toISOString(),
    sdkCount: sdks.length,
    sdks: sdks.map(s => ({
      name: `@hojai/${s.shortName}`,
      description: s.description,
      version: s.packageJson?.version,
      methods: s.methodCount,
      docsUrl: `/sdks/${s.shortName}.html`
    }))
  };
  await fs.writeFile(path.join(PUBLIC_DIR, 'manifest.json'), JSON.stringify(out, null, 2));
}

async function readHelpOutput() {
  // Run @hojai/cli help programmatically if installed, else use a snapshot
  try {
    const { execSync } = await import('node:child_process');
    const out = execSync('node ../../../sdk/hojai-cli/bin/hojai.js help', { cwd: __dirname, encoding: 'utf-8' });
    return `<pre class="md-code"><code>${escapeHtml(out)}</code></pre>`;
  } catch (e) {
    return '<p>(CLI help output not available — run <code>hojai help</code> locally)</p>';
  }
}

async function readAiSpecExample() {
  // Read the rendered example from @hojai/ai-spec if available
  try {
    const path = require('node:path');
    const fsSync = require('node:fs');
    const modulePath = path.resolve(__dirname, '../../../sdk/hojai-ai-spec/dist/index.js');
    if (!fsSync.existsSync(modulePath)) return '';
    const aiSpec = await import(modulePath);
    const example = aiSpec.renderFor({
      manifest: {
        schemaVersion: '1.0.0', projectId: 'p-1', name: 'example', type: 'marketplace',
        description: 'A B2C marketplace with checkout and payments',
        region: 'us-east', languages: ['en'], hojaiVersion: '1.0.0',
        createdAt: 't', agents: [
          { role: 'CEO', purpose: 'Orchestrator' },
          { role: 'Sales', purpose: 'CRM' }
        ],
        integrations: ['foundation', 'sutar', 'nexha', 'marketplace']
      },
      capability: {
        schemaVersion: '1.0.0', projectId: 'p-1', name: 'example',
        capabilities: [
          { id: 'hojai.orchestration', name: 'Orchestration', tier: 'core', type: 'offer' },
          { id: 'hojai.sales', name: 'Sales', tier: 'business', type: 'offer' }
        ],
        slaTargets: { uptimePercent: 99.5, responseMs: 500 }
      }
    });
    return `<pre class="md-code"><code>${escapeHtml(example.slice(0, 1800))}${example.length > 1800 ? '\n…(truncated)' : ''}</code></pre>`;
  } catch (e) {
    return '';
  }
}

async function build() {
  console.log('[docs] discovering SDKs…');
  const sdks = await discoverSdks();
  console.log(`[docs] found ${sdks.length} SDKs`);

  await cleanPublicDir();
  await writeAssets();

  console.log('[docs] reading CLI help output…');
  const helpContent = await readHelpOutput();
  const aiSpecExample = await readAiSpecExample();

  console.log('[docs] writing pages…');
  await fs.writeFile(path.join(PUBLIC_DIR, 'index.html'), homepageHtml(sdks));
  await fs.writeFile(path.join(PUBLIC_DIR, 'quickstart.html'), quickstartHtml(sdks));
  await fs.writeFile(path.join(PUBLIC_DIR, 'cli.html'), cliReferenceHtml(sdks, helpContent));
  await fs.writeFile(path.join(PUBLIC_DIR, 'ai-native.html'), aiNativeHtml(sdks, aiSpecExample));

  for (const sdk of sdks) {
    await fs.writeFile(path.join(PUBLIC_DIR, 'sdks', `${sdk.shortName}.html`), sdkPageHtml(sdk, sdks));
  }

  await writeJsonManifest(sdks);

  // Count output
  const files = await fs.readdir(PUBLIC_DIR, { recursive: true });
  console.log(`[docs] wrote ${files.length} files to ./public`);
  console.log(`[docs] done. Run \`node src/build.mjs --serve\` to preview.`);
}

async function serve() {
  await build();
  const server = http.createServer(async (req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(PUBLIC_DIR, urlPath);
    try {
      const content = await fs.readFile(filePath);
      const ext = path.extname(filePath);
      const mime = ext === '.html' ? 'text/html; charset=utf-8'
        : ext === '.css' ? 'text/css; charset=utf-8'
        : ext === '.js' ? 'text/javascript; charset=utf-8'
        : ext === '.json' ? 'application/json; charset=utf-8'
        : 'text/plain; charset=utf-8';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  const port = Number(process.env.PORT || 4400);
  server.listen(port, () => console.log(`[docs] serving at http://localhost:${port}`));
}

const args = process.argv.slice(2);
if (args.includes('--serve')) {
  await serve();
} else {
  await build();
}
