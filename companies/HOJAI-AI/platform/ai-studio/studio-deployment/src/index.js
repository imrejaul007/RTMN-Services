/**
 * studio-deployment — One-click deploy: environments, releases, deployments, rollback
 * Port: 4908
 *
 * Environments: dev, staging, prod, custom
 * Releases: versioned artifact (model + config + prompt_id) deployable to environments
 * Deployments: a release deployed to an env with a strategy (immediate, canary, blue_green)
 * Rollback: revert to a previous deployment
 *
 * Storage: $DATA_DIR/deployments.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4908', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'studio-internal-token';

const DEPLOY_FILE = path.join(DATA_DIR, 'deployments.json');

const VALID_STRATEGIES = ['immediate', 'canary', 'blue_green'];
const VALID_DEPLOY_STATUSES = ['pending', 'deploying', 'live', 'failed', 'rolled_back', 'rolled_forward'];
const VALID_ENV_STATUSES = ['active', 'paused', 'archived'];
const DEFAULT_ENVS = [
  { name: 'development', slug: 'dev', description: 'Development environment' },
  { name: 'staging', slug: 'staging', description: 'Pre-production environment' },
  { name: 'production', slug: 'prod', description: 'Production environment' }
];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DEPLOY_FILE)) {
    // Seed default environments
    const seed = { environments: {}, env_slug_to_id: {}, releases: {}, release_name_to_id: {}, deployments: {} };
    for (const env of DEFAULT_ENVS) {
      const id = newId('env');
      const e = { ...env, id, status: 'active', created_at: nowIso(), updated_at: nowIso() };
      seed.environments[id] = e;
      seed.env_slug_to_id[env.slug] = id;
    }
    fs.writeFileSync(DEPLOY_FILE, JSON.stringify(seed, null, 2));
  }
}
function loadAll() {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(DEPLOY_FILE, 'utf8')); }
  catch (_) { return { environments: {}, env_slug_to_id: {}, releases: {}, release_name_to_id: {}, deployments: {} }; }
}
function saveAll(d) { const tmp = DEPLOY_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DEPLOY_FILE); }

function findByIdOrName(items, nameMap, idOrName) {
  if (items[idOrName]) return items[idOrName];
  if (nameMap[idOrName]) return items[nameMap[idOrName]];
  return null;
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Mock deployment execution
function executeDeployment(deployment, env, release) {
  const stages = [];
  if (deployment.strategy === 'canary') {
    stages.push({ stage: 'canary_1pct', status: 'completed', percent: 1 });
    stages.push({ stage: 'canary_10pct', status: 'completed', percent: 10 });
    stages.push({ stage: 'canary_50pct', status: 'completed', percent: 50 });
    stages.push({ stage: 'full_100pct', status: 'completed', percent: 100 });
  } else if (deployment.strategy === 'blue_green') {
    stages.push({ stage: 'deploy_to_green', status: 'completed' });
    stages.push({ stage: 'switch_traffic', status: 'completed' });
    stages.push({ stage: 'keep_blue_for_rollback', status: 'completed' });
  } else {
    stages.push({ stage: 'immediate_deploy', status: 'completed' });
  }
  return stages;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({
    ok: true, service: 'studio-deployment', port: PORT,
    strategies: VALID_STRATEGIES
  }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.get('/capabilities', requireInternal, (_req, res) => {
    res.json({ strategies: VALID_STRATEGIES, deploy_statuses: VALID_DEPLOY_STATUSES, env_statuses: VALID_ENV_STATUSES });
  });

  // ----- Environments -----

  // List
  app.get('/environments', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.environments);
    if (req.query.status) items = items.filter((e) => e.status === req.query.status);
    res.json({ count: items.length, environments: items });
  });

  // Get
  app.get('/environments/:idOrSlug', requireInternal, (req, res) => {
    const data = loadAll();
    const env = findByIdOrName(data.environments, data.env_slug_to_id, req.params.idOrSlug);
    if (!env) return res.status(404).json({ error: 'not_found' });
    res.json(env);
  });

  // Create custom environment
  app.post('/environments', requireInternal, (req, res) => {
    const { name, slug, description = '', project_id, user_id } = req.body || {};
    if (!name) return res.status(400).json({ error: 'validation', message: 'name required' });
    if (!slug) return res.status(400).json({ error: 'validation', message: 'slug required' });
    if (!/^[a-z][a-z0-9-]*$/.test(slug)) return res.status(400).json({ error: 'validation', message: 'slug must be kebab-case' });
    const data = loadAll();
    if (data.env_slug_to_id[slug]) return res.status(409).json({ error: 'conflict', message: `env ${slug} exists` });
    const env = {
      id: newId('env'),
      name,
      slug,
      description,
      project_id: project_id || null,
      user_id: user_id || null,
      status: 'active',
      created_at: nowIso(),
      updated_at: nowIso()
    };
    data.environments[env.id] = env;
    data.env_slug_to_id[slug] = env.id;
    saveAll(data);
    res.status(201).json(env);
  });

  app.put('/environments/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const env = data.environments[req.params.id];
    if (!env) return res.status(404).json({ error: 'not_found' });
    ['name', 'description', 'status'].forEach((k) => {
      if (req.body[k] !== undefined) env[k] = req.body[k];
    });
    if (env.status && !VALID_ENV_STATUSES.includes(env.status)) return res.status(400).json({ error: 'validation', message: 'invalid status' });
    env.updated_at = nowIso();
    saveAll(data);
    res.json(env);
  });

  app.delete('/environments/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const env = data.environments[req.params.id];
    if (!env) return res.status(404).json({ error: 'not_found' });
    if (['dev', 'staging', 'prod'].includes(env.slug)) return res.status(400).json({ error: 'validation', message: 'cannot delete default env' });
    delete data.environments[env.id];
    delete data.env_slug_to_id[env.slug];
    saveAll(data);
    res.json({ deleted: true, environment_id: req.params.id });
  });

  // ----- Releases -----

  app.post('/releases', requireInternal, (req, res) => {
    const { name, version, description = '', project_id, user_id, artifact = {} } = req.body || {};
    if (!name) return res.status(400).json({ error: 'validation', message: 'name required' });
    if (!version) return res.status(400).json({ error: 'validation', message: 'version required' });
    if (!/^\d+\.\d+\.\d+$/.test(version)) return res.status(400).json({ error: 'validation', message: 'version must be semver (e.g. 1.0.0)' });
    if (!project_id) return res.status(400).json({ error: 'validation', message: 'project_id required' });
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id required' });
    const data = loadAll();
    const key = `${name}@${version}`;
    if (data.release_name_to_id[key]) return res.status(409).json({ error: 'conflict', message: `release ${key} exists` });
    const r = {
      id: newId('rel'),
      name,
      version,
      key,
      description,
      project_id,
      user_id,
      artifact, // { agent_id?, prompt_id?, model?, twin_schema_id? }
      created_at: nowIso()
    };
    data.releases[r.id] = r;
    data.release_name_to_id[key] = r.id;
    saveAll(data);
    res.status(201).json(r);
  });

  app.get('/releases', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.releases);
    if (req.query.project_id) items = items.filter((r) => r.project_id === req.query.project_id);
    if (req.query.name) items = items.filter((r) => r.name === req.query.name);
    res.json({ count: items.length, releases: items });
  });

  app.get('/releases/:idOrKey', requireInternal, (req, res) => {
    const data = loadAll();
    const r = findByIdOrName(data.releases, data.release_name_to_id, req.params.idOrKey);
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  app.delete('/releases/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.releases[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    delete data.releases[r.id];
    delete data.release_name_to_id[r.key];
    saveAll(data);
    res.json({ deleted: true, release_id: req.params.id });
  });

  // ----- Deployments -----

  app.post('/deployments', requireInternal, (req, res) => {
    const { release_id, release_key, environment_id, environment_slug, strategy = 'immediate', user_id } = req.body || {};
    if (!release_id && !release_key) return res.status(400).json({ error: 'validation', message: 'release_id or release_key required' });
    if (!environment_id && !environment_slug) return res.status(400).json({ error: 'validation', message: 'environment_id or environment_slug required' });
    if (!VALID_STRATEGIES.includes(strategy)) return res.status(400).json({ error: 'validation', message: `strategy must be one of: ${VALID_STRATEGIES.join(', ')}` });
    const data = loadAll();
    const release = findByIdOrName(data.releases, data.release_name_to_id, release_id || release_key);
    if (!release) return res.status(404).json({ error: 'not_found', message: 'release not found' });
    const env = findByIdOrName(data.environments, data.env_slug_to_id, environment_id || environment_slug);
    if (!env) return res.status(404).json({ error: 'not_found', message: 'environment not found' });
    if (env.status !== 'active') return res.status(400).json({ error: 'validation', message: 'environment is not active' });
    const stages = executeDeployment({ strategy }, env, release);
    const d = {
      id: newId('dep'),
      release_id: release.id,
      release_key: release.key,
      environment_id: env.id,
      environment_slug: env.slug,
      strategy,
      user_id: user_id || 'system',
      status: 'live',
      stages,
      artifact_snapshot: release.artifact,
      started_at: nowIso(),
      finished_at: nowIso(),
      duration_ms: strategy === 'canary' ? 60000 : 5000
    };
    data.deployments[d.id] = d;
    // Track current deployment per env
    env.current_deployment_id = d.id;
    env.current_release_id = release.id;
    env.updated_at = nowIso();
    saveAll(data);
    res.status(201).json(d);
  });

  app.get('/deployments', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.deployments);
    if (req.query.environment_id) items = items.filter((d) => d.environment_id === req.query.environment_id);
    if (req.query.release_id) items = items.filter((d) => d.release_id === req.query.release_id);
    if (req.query.status) items = items.filter((d) => d.status === req.query.status);
    res.json({ count: items.length, deployments: items });
  });

  app.get('/deployments/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const d = data.deployments[req.params.id];
    if (!d) return res.status(404).json({ error: 'not_found' });
    res.json(d);
  });

  // Get current deployment for environment
  app.get('/environments/:idOrSlug/current', requireInternal, (req, res) => {
    const data = loadAll();
    const env = findByIdOrName(data.environments, data.env_slug_to_id, req.params.idOrSlug);
    if (!env) return res.status(404).json({ error: 'not_found' });
    if (!env.current_deployment_id) return res.json({ environment: env, current: null });
    const d = data.deployments[env.current_deployment_id];
    res.json({ environment: env, current: d });
  });

  // Rollback
  app.post('/deployments/:id/rollback', requireInternal, (req, res) => {
    const data = loadAll();
    const d = data.deployments[req.params.id];
    if (!d) return res.status(404).json({ error: 'not_found' });
    // Find previous deployment to this env
    const prev = Object.values(data.deployments)
      .filter((x) => x.environment_id === d.environment_id && x.id !== d.id && x.finished_at < d.finished_at)
      .sort((a, b) => b.finished_at.localeCompare(a.finished_at))[0];
    if (!prev) return res.status(400).json({ error: 'validation', message: 'no previous deployment to rollback to' });
    d.status = 'rolled_back';
    d.rolled_back_at = nowIso();
    d.rolled_back_to = prev.id;
    const env = data.environments[d.environment_id];
    env.current_deployment_id = prev.id;
    env.current_release_id = prev.release_id;
    env.updated_at = nowIso();
    saveAll(data);
    res.json({ deployment: d, rolled_back_to: prev });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[studio-deployment] listening on :${PORT}`));
}

module.exports = { createApp, VALID_STRATEGIES, VALID_DEPLOY_STATUSES };
