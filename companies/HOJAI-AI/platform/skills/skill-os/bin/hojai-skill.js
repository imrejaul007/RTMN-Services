#!/usr/bin/env node
/**
 * hojai-skill — CLI for the SkillOS marketplace
 *
 * Usage:
 *   hojai skill search [query]              search the catalog
 *   hojai skill discover [--type=skill]    multi-asset discovery
 *   hojai skill info <assetId>              show asset details
 *   hojai skill publish <manifest.json>     publish a new asset
 *   hojai skill install <assetId> --tenant=X  install for a tenant
 *   hojai skill uninstall <installId>       uninstall
 *   hojai skill list-installed --tenant=X   list installs
 *   hojai skill test <assetId> [--input=...] run a test
 *   hojai skill certify <assetId> --level=X set certification
 *   hojai skill deprecate <assetId>         mark deprecated
 *   hojai skill payout --publisher=X        show earnings
 *   hojai skill audit [--resourceId=X]      show audit log
 *   hojai skill openapi                     dump OpenAPI spec to stdout
 *   hojai skill recommend --for=<id>        similar assets (semantic)
 *   hojai skill pin <installId>             pin installed version
 *   hojai skill rollback <installId>        rollback to previous version
 *   hojai skill history <installId>         version history
 *   hojai skill --version
 *   hojai skill --help
 *
 * Env:
 *   HOJAI_SKILLOS_URL   default http://localhost:4743
 *   HOJAI_AUTH_TOKEN    optional Bearer token
 *   HOJAI_HUMAN=1       pretty-print JSON output
 *
 * Exit codes: 0 success, 1 API error, 2 bad usage, 3 network error
 */

import { readFile } from 'node:fs/promises';
import { argv, env, exit, stdout, stderr } from 'node:process';

const VERSION = '1.3.0';
const BASE = env.HOJAI_SKILLOS_URL || 'http://localhost:4743';
const TOKEN = env.HOJAI_AUTH_TOKEN || '';
const HUMAN = env.HOJAI_HUMAN === '1' || env.HOJAI_HUMAN === 'true';

const args = argv.slice(2);

// Tiny arg parser: handles --flag=value, --flag, positional
function parseArgs(rest) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const next = rest[i + 1];
        if (next && !next.startsWith('--')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function getFlag(flags, name, def) {
  return flags[name] !== undefined ? flags[name] : def;
}

function usage() {
  stdout.write(`hojai-skill v${VERSION} — SkillOS CLI

Usage: hojai skill <command> [options]

Commands:
  search [query]                search skills
  discover [--type=...] [--q=...]  multi-asset discovery
  info <assetId>                show asset details
  publish <manifest.json>       publish a new asset from a manifest
  install <assetId> --tenant=X  install an asset for a tenant
  uninstall <installId>         uninstall
  list-installed --tenant=X     list installed assets
  test <assetId> [--input=...]  run a test
  certify <assetId> --level=X   set certification
  deprecate <assetId>           mark deprecated
  payout --publisher=X          show earnings
  audit [--resourceId=X]        show audit log
  openapi                       dump OpenAPI spec
  recommend --for=<id>          find similar assets (semantic)
  pin <installId>               pin installed version
  rollback <installId>          rollback to previous version
  history <installId>           version history

Flags:
  --tenant=X        tenant identifier
  --publisher=X     publisher identifier
  --type=X          asset type filter (skill, agent-template, ...)
  --level=X         certification level
  --input=X         JSON input string
  --human           pretty-print JSON output (or set HOJAI_HUMAN=1)
  --version         print version
  --help            print this help

Env:
  HOJAI_SKILLOS_URL   default ${BASE}
  HOJAI_AUTH_TOKEN    optional Bearer token
  HOJAI_HUMAN=1       pretty-print JSON

Examples:
  hojai skill search reasoning
  hojai skill discover --type=agent-template
  hojai skill info ast-agent-salesbot
  hojai skill install ast-agent-salesbot --tenant=acme-corp
  hojai skill publish ./my-skill.json
  hojai skill payout --publisher=hojai
`);
}

// ---- HTTP ----

async function api(method, path, body) {
  const url = `${BASE}${path}`;
  const init = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (TOKEN) init.headers['Authorization'] = `Bearer ${TOKEN}`;
  if (body !== undefined) init.body = JSON.stringify(body);
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    stderr.write(`network error: ${e.message}\n`);
    exit(3);
  }
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = data && (data.message || data.error) || `HTTP ${res.status}`;
    stderr.write(`error [${res.status}]: ${msg}\n`);
    exit(1);
  }
  return data;
}

function print(data) {
  if (HUMAN) {
    stdout.write(JSON.stringify(data, null, 2) + '\n');
  } else {
    stdout.write(JSON.stringify(data) + '\n');
  }
}

// ---- Commands ----

async function cmdSearch(rest) {
  const { flags, positional } = parseArgs(rest);
  const q = positional.join(' ') || '';
  const type = getFlag(flags, 'type');
  const semantic = getFlag(flags, 'semantic');
  const path = `/api/skills/discover?q=${encodeURIComponent(q)}${type ? `&category=${encodeURIComponent(type)}` : ''}${semantic ? '&semantic=true' : ''}`;
  const data = await api('GET', path);
  print({ count: data.count, mode: data.mode, results: data.discovered });
}

async function cmdDiscover(rest) {
  const { flags, positional } = parseArgs(rest);
  const q = positional.join(' ') || '';
  const type = getFlag(flags, 'type');
  const category = getFlag(flags, 'category');
  const path = `/api/assets?q=${encodeURIComponent(q)}${type ? `&type=${encodeURIComponent(type)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
  const data = await api('GET', path);
  print({ count: data.count, assets: data.assets });
}

async function cmdInfo(rest) {
  const { positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill info <assetId>\n');
    exit(2);
  }
  const data = await api('GET', `/api/assets/${encodeURIComponent(positional[0])}`);
  print(data.data);
}

async function cmdPublish(rest) {
  const { positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill publish <manifest.json>\n');
    exit(2);
  }
  let manifest;
  try {
    const text = await readFile(positional[0], 'utf8');
    manifest = JSON.parse(text);
  } catch (e) {
    stderr.write(`cannot read manifest: ${e.message}\n`);
    exit(2);
  }
  const data = await api('POST', '/api/assets', manifest);
  print({ id: data.data.id, assetType: data.data.assetType, name: data.data.name, version: data.data.version });
}

async function cmdInstall(rest) {
  const { flags, positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill install <assetId> --tenant=X [--version=Y]\n');
    exit(2);
  }
  const tenant = getFlag(flags, 'tenant');
  if (!tenant) {
    stderr.write('error: --tenant=X is required\n');
    exit(2);
  }
  const body = { tenantId: tenant };
  if (flags.version) body.version = flags.version;
  const data = await api('POST', `/api/assets/${encodeURIComponent(positional[0])}/install`, body);
  print({ installId: data.data.id, assetId: data.data.assetId, version: data.data.version, pinned: data.data.pinnedVersion });
}

async function cmdUninstall(rest) {
  const { positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill uninstall <installId>\n');
    exit(2);
  }
  const data = await api('DELETE', `/api/installed/${encodeURIComponent(positional[0])}`);
  print(data.data);
}

async function cmdListInstalled(rest) {
  const { flags } = parseArgs(rest);
  const tenant = getFlag(flags, 'tenant');
  if (!tenant) {
    stderr.write('usage: hojai skill list-installed --tenant=X [--type=skill]\n');
    exit(2);
  }
  const type = getFlag(flags, 'type');
  const path = `/api/installed?tenantId=${encodeURIComponent(tenant)}${type ? `&assetType=${encodeURIComponent(type)}` : ''}`;
  const data = await api('GET', path);
  print({ count: data.count, installs: data.installs });
}

async function cmdTest(rest) {
  const { flags, positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill test <assetId> [--input=<json>]\n');
    exit(2);
  }
  let input = null;
  if (flags.input) {
    try { input = JSON.parse(flags.input); } catch { input = flags.input; }
  }
  const data = await api('POST', `/api/skills/${encodeURIComponent(positional[0])}/test`, { input, mock: false });
  print(data.data);
}

async function cmdCertify(rest) {
  const { flags, positional } = parseArgs(rest);
  if (positional.length === 0 || !flags.level) {
    stderr.write('usage: hojai skill certify <assetId> --level=<community|verified|enterprise|government|hojai-certified> [--certifiedBy=...]\n');
    exit(2);
  }
  const body = { level: flags.level, certifiedBy: flags.certifiedBy || 'cli' };
  const data = await api('POST', `/api/assets/${encodeURIComponent(positional[0])}/certify`, body);
  print(data.data);
}

async function cmdDeprecate(rest) {
  const { flags, positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill deprecate <assetId> [--reason=...]\n');
    exit(2);
  }
  const body = {};
  if (flags.reason) body.reason = flags.reason;
  const data = await api('POST', `/api/assets/${encodeURIComponent(positional[0])}/deprecate`, body);
  print(data.data);
}

async function cmdPayout(rest) {
  const { flags } = parseArgs(rest);
  if (!flags.publisher) {
    stderr.write('usage: hojai skill payout --publisher=X\n');
    exit(2);
  }
  const data = await api('GET', `/api/billing/payouts/${encodeURIComponent(flags.publisher)}`);
  print(data.data);
}

async function cmdAudit(rest) {
  const { flags } = parseArgs(rest);
  const qs = [];
  if (flags.resourceId) qs.push(`resourceId=${encodeURIComponent(flags.resourceId)}`);
  if (flags.action) qs.push(`action=${encodeURIComponent(flags.action)}`);
  if (flags.limit) qs.push(`limit=${encodeURIComponent(flags.limit)}`);
  const path = `/api/audit${qs.length ? '?' + qs.join('&') : ''}`;
  const data = await api('GET', path);
  print({ count: data.count, entries: data.entries });
}

async function cmdOpenapi() {
  const data = await api('GET', '/openapi.json');
  print(data);
}

async function cmdRecommend(rest) {
  const { flags } = parseArgs(rest);
  if (!flags.for) {
    stderr.write('usage: hojai skill recommend --for=<assetId> [--k=5]\n');
    exit(2);
  }
  const k = flags.k || 5;
  const data = await api('GET', `/api/recommend?for=${encodeURIComponent(flags.for)}&k=${k}`);
  print({ count: data.count, for: data.for, results: data.results });
}

async function cmdPin(rest) {
  const { positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill pin <installId>\n');
    exit(2);
  }
  const data = await api('POST', `/api/installed/${encodeURIComponent(positional[0])}/pin`, {});
  print({ installId: data.data.id, version: data.data.version, pinned: data.data.pinnedVersion });
}

async function cmdRollback(rest) {
  const { positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill rollback <installId>\n');
    exit(2);
  }
  const data = await api('POST', `/api/installed/${encodeURIComponent(positional[0])}/rollback`, {});
  print({ installId: data.data.id, version: data.data.version });
}

async function cmdHistory(rest) {
  const { positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill history <installId>\n');
    exit(2);
  }
  const data = await api('GET', `/api/installed/${encodeURIComponent(positional[0])}/history`);
  print(data);
}

// ---- Phase 3: Libraries, datasets, training, reviews, monetization ----

async function cmdLibrary(rest) {
  const { flags, positional } = parseArgs(rest);
  const sub = positional[0];
  if (sub === 'create') {
    if (!flags['owner-id']) { stderr.write('usage: hojai skill library create --name=X --owner-id=Y [--visibility=private|public|org-only]\n'); exit(2); }
    const body = { name: flags.name, ownerId: flags['owner-id'], visibility: flags.visibility || 'private', ownerType: flags['owner-type'] || 'human' };
    const data = await api('POST', '/api/libraries', body);
    print({ libraryId: data.data.id, name: data.data.name, ownerId: data.data.ownerId });
  } else if (sub === 'list') {
    const qs = flags['owner-id'] ? `?ownerId=${encodeURIComponent(flags['owner-id'])}` : '';
    const data = await api('GET', `/api/libraries${qs}`);
    print({ count: data.count, libraries: data.libraries });
  } else if (sub === 'add') {
    if (positional.length < 3) { stderr.write('usage: hojai skill library add <libId> <assetId>\n'); exit(2); }
    const data = await api('POST', `/api/libraries/${encodeURIComponent(positional[1])}/skills/${encodeURIComponent(positional[2])}`);
    print(data.data);
  } else if (sub === 'show') {
    if (positional.length < 2) { stderr.write('usage: hojai skill library show <libId>\n'); exit(2); }
    const data = await api('GET', `/api/libraries/${encodeURIComponent(positional[1])}/skills`);
    print({ libraryId: positional[1], count: data.count, skills: data.skills });
  } else if (sub === 'bind') {
    if (positional.length < 3) { stderr.write('usage: hojai skill library bind <libId> <agentId>\n'); exit(2); }
    const data = await api('POST', `/api/libraries/${encodeURIComponent(positional[1])}/agents/${encodeURIComponent(positional[2])}`);
    print(data.data);
  } else {
    stderr.write('usage: hojai skill library <create|list|add|show|bind> ...\n');
    exit(2);
  }
}

async function cmdDataset(rest) {
  const { flags, positional } = parseArgs(rest);
  const sub = positional[0];
  if (sub === 'create') {
    if (!flags.name || !flags['owner-id'] || !flags.skill) {
      stderr.write('usage: hojai skill dataset create --name=X --owner-id=Y --skill=<assetId> [--file=examples.json]\n');
      exit(2);
    }
    const body = { name: flags.name, ownerId: flags['owner-id'], skillId: flags.skill, tags: flags.tags ? flags.tags.split(',') : [] };
    if (flags.file) {
      try {
        const text = await readFile(flags.file, 'utf8');
        body.examples = JSON.parse(text);
      } catch (e) { stderr.write(`cannot read file: ${e.message}\n`); exit(2); }
    }
    const data = await api('POST', '/api/datasets', body);
    print({ datasetId: data.data.id, status: data.data.status, exampleCount: data.data.examples.length });
  } else if (sub === 'add-examples') {
    if (positional.length < 2) { stderr.write('usage: hojai skill dataset add-examples <datasetId> --file=examples.json\n'); exit(2); }
    if (!flags.file) { stderr.write('--file=path is required\n'); exit(2); }
    let examples;
    try { examples = JSON.parse(await readFile(flags.file, 'utf8')); } catch (e) { stderr.write(`cannot read file: ${e.message}\n`); exit(2); }
    const data = await api('POST', `/api/datasets/${encodeURIComponent(positional[1])}/examples`, { examples });
    print({ datasetId: positional[1], exampleCount: data.data.examples.length });
  } else if (sub === 'finalize') {
    if (positional.length < 2) { stderr.write('usage: hojai skill dataset finalize <datasetId>\n'); exit(2); }
    const data = await api('POST', `/api/datasets/${encodeURIComponent(positional[1])}/finalize`);
    print({ datasetId: positional[1], status: data.data.status });
  } else if (sub === 'list') {
    const data = await api('GET', '/api/datasets');
    print({ count: data.count, datasets: data.datasets });
  } else if (sub === 'version') {
    if (positional.length < 2) { stderr.write('usage: hojai skill dataset version <datasetId>\n'); exit(2); }
    const data = await api('POST', `/api/datasets/${encodeURIComponent(positional[1])}/version`);
    print({ datasetId: data.data.id, version: data.data.version, parentVersionId: data.data.parentVersionId });
  } else {
    stderr.write('usage: hojai skill dataset <create|add-examples|finalize|list|version> ...\n');
    exit(2);
  }
}

async function cmdTrain(rest) {
  const { flags, positional } = parseArgs(rest);
  const sub = positional[0];
  if (sub === 'submit') {
    if (!flags.dataset || !flags.skill || !flags.model) {
      stderr.write('usage: hojai skill train submit --dataset=<id> --skill=<id> --model=<gpt-4o> [--method=lora]\n');
      exit(2);
    }
    const data = await api('POST', '/api/training/jobs', {
      datasetId: flags.dataset, skillId: flags.skill, baseModel: flags.model,
      method: flags.method || 'lora', createdBy: flags['owner-id'] || 'cli-user',
      hyperparameters: { epochs: Number(flags.epochs) || 3 },
    });
    print({ jobId: data.data.id, status: data.data.status, estimatedCost: data.data.estimatedCost, backendOk: data.backend.ok });
  } else if (sub === 'status') {
    if (positional.length < 2) { stderr.write('usage: hojai skill train status <jobId>\n'); exit(2); }
    const data = await api('GET', `/api/training/jobs/${encodeURIComponent(positional[1])}`);
    print(data.data);
  } else if (sub === 'cancel') {
    if (positional.length < 2) { stderr.write('usage: hojai skill train cancel <jobId>\n'); exit(2); }
    const data = await api('POST', `/api/training/jobs/${encodeURIComponent(positional[1])}/cancel`);
    print(data.data);
  } else {
    stderr.write('usage: hojai skill train <submit|status|cancel> ...\n');
    exit(2);
  }
}

async function cmdReview(rest) {
  const { flags, positional } = parseArgs(rest);
  const sub = positional[0];
  if (sub === 'submit' || sub === undefined) {
    if (!flags['asset-id'] || !flags.rating) {
      stderr.write('usage: hojai skill review <assetId> --rating=1..5 [--title=...] [--body=...]\n');
      exit(2);
    }
    const body = {
      reviewerId: flags['reviewer-id'] || 'cli-user',
      rating: Number(flags.rating),
      title: flags.title || '',
      body: flags.body || '',
    };
    const data = await api('POST', `/api/assets/${encodeURIComponent(flags['asset-id'])}/reviews`, body);
    print({ reviewId: data.data.id, rating: data.data.rating });
  } else if (sub === 'list') {
    if (positional.length < 2) { stderr.write('usage: hojai skill review list <assetId>\n'); exit(2); }
    const data = await api('GET', `/api/assets/${encodeURIComponent(positional[1])}/reviews`);
    print({ count: data.count, average: data.aggregate.average, reviews: data.reviews });
  } else {
    stderr.write('usage: hojai skill review <assetId> --rating=N | list <assetId>\n');
    exit(2);
  }
}

async function cmdCreator(rest) {
  const { flags, positional } = parseArgs(rest);
  const sub = positional[0];
  if (sub === 'profile') {
    if (positional.length < 2) { stderr.write('usage: hojai skill creator profile <creatorId>\n'); exit(2); }
    const data = await api('GET', `/api/creators/${encodeURIComponent(positional[1])}`);
    print(data.data);
  } else if (sub === 'leaderboard') {
    const qs = flags.category ? `?category=${encodeURIComponent(flags.category)}` : '';
    const data = await api('GET', `/api/creators/leaderboard${qs}`);
    print({ count: data.count, leaderboard: data.leaderboard });
  } else {
    stderr.write('usage: hojai skill creator <profile|leaderboard> ...\n');
    exit(2);
  }
}

async function cmdDashboard(rest) {
  const { flags, positional } = parseArgs(rest);
  if (positional.length === 0) {
    stderr.write('usage: hojai skill dashboard <publisherId> [--from=ISO] [--to=ISO]\n');
    exit(2);
  }
  const qs = [];
  if (flags.from) qs.push(`from=${encodeURIComponent(flags.from)}`);
  if (flags.to) qs.push(`to=${encodeURIComponent(flags.to)}`);
  const data = await api('GET', `/api/dashboard/publisher/${encodeURIComponent(positional[0])}${qs.length ? '?' + qs.join('&') : ''}`);
  print(data.data);
}

async function cmdPack(rest) {
  const { flags, positional } = parseArgs(rest);
  const sub = positional[0];
  if (sub === 'create') {
    if (!flags.name || !flags.members) { stderr.write('usage: hojai skill pack create --name=X --members=id1,id2 [--tenant=...]\n'); exit(2); }
    const memberIds = flags.members.split(',').map((s) => s.trim());
    const data = await api('POST', '/api/assets', {
      name: flags.name, assetType: 'pack', description: flags.description || '',
      category: flags.category || 'uncategorized',
      memberAssetIds: memberIds,
      installBehavior: flags.behavior || 'best-effort',
      publisher: flags.publisher || 'cli',
    });
    print({ packId: data.data.id, members: memberIds });
  } else if (sub === 'install') {
    if (positional.length < 2) { stderr.write('usage: hojai skill pack install <packId> --tenant=X\n'); exit(2); }
    if (!flags.tenant) { stderr.write('--tenant=X is required\n'); exit(2); }
    const data = await api('POST', `/api/assets/${encodeURIComponent(positional[1])}/install-pack`, { tenantId: flags.tenant });
    print({ packId: positional[1], installedCount: data.installedCount });
  } else {
    stderr.write('usage: hojai skill pack <create|install> ...\n');
    exit(2);
  }
}

async function cmdEnhance(rest) {
  const { flags, positional } = parseArgs(rest);
  if (positional.length === 0) { stderr.write('usage: hojai skill enhance <agentId> --skills=id1,id2\n'); exit(2); }
  if (!flags.skills) { stderr.write('--skills=id1,id2 is required\n'); exit(2); }
  const skillIds = flags.skills.split(',').map((s) => s.trim());
  const data = await api('POST', `/api/agents/${encodeURIComponent(positional[0])}/enhance`, {
    skillIds, installedBy: flags['installed-by'] || 'cli-user', tenantId: flags.tenant,
  });
  print({ enhancementId: data.data.id, agentId: data.data.agentId, skillCount: data.data.skillIds.length });
}

// ---- Main ----

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  usage();
  exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  stdout.write(`hojai-skill v${VERSION}\n`);
  exit(0);
}

const cmd = args[0];
const rest = args.slice(1);

const commands = {
  search: cmdSearch,
  discover: cmdDiscover,
  info: cmdInfo,
  publish: cmdPublish,
  install: cmdInstall,
  uninstall: cmdUninstall,
  'list-installed': cmdListInstalled,
  test: cmdTest,
  certify: cmdCertify,
  deprecate: cmdDeprecate,
  payout: cmdPayout,
  audit: cmdAudit,
  openapi: cmdOpenapi,
  recommend: cmdRecommend,
  pin: cmdPin,
  rollback: cmdRollback,
  history: cmdHistory,
  library: cmdLibrary,
  dataset: cmdDataset,
  train: cmdTrain,
  review: cmdReview,
  creator: cmdCreator,
  dashboard: cmdDashboard,
  pack: cmdPack,
  enhance: cmdEnhance,
};

if (!commands[cmd]) {
  stderr.write(`unknown command: ${cmd}\n`);
  usage();
  exit(2);
}

commands[cmd](rest).catch((e) => {
  stderr.write(`error: ${e.message}\n`);
  exit(1);
});
