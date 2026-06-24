/**
 * studio-twin — Twin schema designer: define fields, types, relations, instances
 * Port: 4905
 *
 * A twin schema describes a digital twin's data model:
 * - fields: { name, type, required, default, description, validation }
 * - relations: { name, target_schema, type ('has_one'|'has_many'|'belongs_to') }
 * - actions: list of state-machine actions
 *
 * Instances are concrete data records matching the schema.
 *
 * Storage: $DATA_DIR/schemas.json, $DATA_DIR/instances.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4905', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'studio-internal-token';

const SCHEMAS_FILE = path.join(DATA_DIR, 'schemas.json');
const INSTANCES_FILE = path.join(DATA_DIR, 'instances.json');

const VALID_FIELD_TYPES = ['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'enum', 'array', 'object', 'json', 'uuid', 'email', 'url'];
const VALID_RELATION_TYPES = ['has_one', 'has_many', 'belongs_to'];
const VALID_STATUSES = ['draft', 'active', 'archived'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SCHEMAS_FILE)) fs.writeFileSync(SCHEMAS_FILE, JSON.stringify({ schemas: {} }, null, 2));
  if (!fs.existsSync(INSTANCES_FILE)) fs.writeFileSync(INSTANCES_FILE, JSON.stringify({ instances: {} }, null, 2));
}
function loadSchemas() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(SCHEMAS_FILE, 'utf8')); } catch (_) { return { schemas: {} }; } }
function saveSchemas(d) { const tmp = SCHEMAS_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, SCHEMAS_FILE); }
function loadInstances() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8')); } catch (_) { return { instances: {} }; } }
function saveInstances(d) { const tmp = INSTANCES_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, INSTANCES_FILE); }

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateSchema(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name || typeof body.name !== 'string') return 'name is required';
  if (!/^[a-z][a-z0-9_]*$/.test(body.name)) return 'name must be snake_case (lowercase, digits, underscores) starting with a letter';
  if (body.fields !== undefined && !Array.isArray(body.fields)) return 'fields must be an array';
  if (body.relations !== undefined && !Array.isArray(body.relations)) return 'relations must be an array';
  if (body.fields) {
    const seen = new Set();
    for (const f of body.fields) {
      if (!f.name) return 'each field needs a name';
      if (seen.has(f.name)) return `duplicate field: ${f.name}`;
      seen.add(f.name);
      if (!VALID_FIELD_TYPES.includes(f.type)) return `invalid field type: ${f.type} for ${f.name}`;
    }
  }
  if (body.relations) {
    for (const r of body.relations) {
      if (!r.name) return 'each relation needs a name';
      if (!r.target) return `relation ${r.name} needs a target`;
      if (r.type && !VALID_RELATION_TYPES.includes(r.type)) return `invalid relation type: ${r.type}`;
    }
  }
  return null;
}

// Validate an instance against a schema
function validateInstance(schema, instance) {
  if (!schema.fields) return null;
  for (const f of schema.fields) {
    const v = instance[f.name];
    const has = v !== undefined && v !== null;
    if (f.required && !has) return `field ${f.name} is required`;
    if (!has) continue;
    if (f.type === 'string' && typeof v !== 'string') return `field ${f.name} must be string`;
    if (f.type === 'number' && typeof v !== 'number') return `field ${f.name} must be number`;
    if (f.type === 'integer' && (!Number.isInteger(v))) return `field ${f.name} must be integer`;
    if (f.type === 'boolean' && typeof v !== 'boolean') return `field ${f.name} must be boolean`;
    if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return `field ${f.name} must be YYYY-MM-DD`;
    if (f.type === 'datetime' && isNaN(new Date(v).getTime())) return `field ${f.name} must be valid datetime`;
    if (f.type === 'enum' && (!f.values || !f.values.includes(v))) return `field ${f.name} must be one of ${f.values}`;
    if (f.type === 'array' && !Array.isArray(v)) return `field ${f.name} must be array`;
    if (f.type === 'object' && (typeof v !== 'object' || Array.isArray(v))) return `field ${f.name} must be object`;
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `field ${f.name} must be valid email`;
    if (f.type === 'url' && !/^https?:\/\//.test(v)) return `field ${f.name} must be URL`;
  }
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({
    ok: true, service: 'studio-twin', port: PORT,
    field_types: VALID_FIELD_TYPES, relation_types: VALID_RELATION_TYPES
  }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Capabilities
  app.get('/capabilities', requireInternal, (_req, res) => {
    res.json({ field_types: VALID_FIELD_TYPES, relation_types: VALID_RELATION_TYPES });
  });

  // ----- Schemas -----

  // Create schema
  app.post('/schemas', requireInternal, (req, res) => {
    const err = validateSchema(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, description = '', project_id, user_id, fields = [], relations = [], actions = [] } = req.body;
    if (!project_id) return res.status(400).json({ error: 'validation', message: 'project_id required' });
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id required' });
    const data = loadSchemas();
    if (data.schemas[name]) return res.status(409).json({ error: 'conflict', message: `schema ${name} already exists` });
    const schema = {
      id: newId('sch'),
      name,
      description,
      project_id,
      user_id,
      fields,
      relations,
      actions: Array.isArray(actions) ? actions : [],
      status: 'draft',
      version: 1,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    data.schemas[schema.id] = schema;
    data.schemas[name] = schema; // index by name too
    saveSchemas(data);
    res.status(201).json(schema);
  });

  // List schemas
  app.get('/schemas', requireInternal, (req, res) => {
    const data = loadSchemas();
    // Dedupe by id (schemas are indexed by both id and name)
    const seen = new Set();
    let items = [];
    for (const s of Object.values(data.schemas)) {
      if (!s.id) continue;
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      items.push(s);
    }
    if (req.query.project_id) items = items.filter((s) => s.project_id === req.query.project_id);
    if (req.query.user_id) items = items.filter((s) => s.user_id === req.query.user_id);
    if (req.query.status) items = items.filter((s) => s.status === req.query.status);
    res.json({ count: items.length, schemas: items });
  });

  // Get schema by id or name
  app.get('/schemas/:idOrName', requireInternal, (req, res) => {
    const data = loadSchemas();
    const s = data.schemas[req.params.idOrName];
    if (!s) return res.status(404).json({ error: 'not_found' });
    res.json(s);
  });

  // Update schema
  app.put('/schemas/:id', requireInternal, (req, res) => {
    const data = loadSchemas();
    const s = data.schemas[req.params.id];
    if (!s) return res.status(404).json({ error: 'not_found' });
    const err = validateSchema({ ...s, ...req.body });
    if (err) return res.status(400).json({ error: 'validation', message: err });
    ['description', 'fields', 'relations', 'actions', 'status'].forEach((k) => {
      if (req.body[k] !== undefined) s[k] = req.body[k];
    });
    if (s.status && !VALID_STATUSES.includes(s.status)) {
      return res.status(400).json({ error: 'validation', message: 'invalid status' });
    }
    s.version = (s.version || 1) + 1;
    s.updated_at = nowIso();
    data.schemas[s.id] = s;
    data.schemas[s.name] = s;
    saveSchemas(data);
    res.json(s);
  });

  // Delete schema
  app.delete('/schemas/:id', requireInternal, (req, res) => {
    const data = loadSchemas();
    const s = data.schemas[req.params.id];
    if (!s) return res.status(404).json({ error: 'not_found' });
    delete data.schemas[s.id];
    delete data.schemas[s.name];
    saveSchemas(data);
    res.json({ deleted: true, schema_id: req.params.id });
  });

  // ----- Instances -----

  // Create instance
  app.post('/instances', requireInternal, (req, res) => {
    const { schema_id, schema_name, data: instanceData, project_id, user_id } = req.body || {};
    if (!instanceData || typeof instanceData !== 'object') return res.status(400).json({ error: 'validation', message: 'data required' });
    if (!schema_id && !schema_name) return res.status(400).json({ error: 'validation', message: 'schema_id or schema_name required' });
    const sdata = loadSchemas();
    const schema = sdata.schemas[schema_id || schema_name];
    if (!schema) return res.status(404).json({ error: 'not_found', message: 'schema not found' });
    if (schema.status !== 'active') return res.status(400).json({ error: 'validation', message: 'schema must be active' });
    const err = validateInstance(schema, instanceData);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const idata = loadInstances();
    const instance = {
      id: newId('twi'),
      schema_id: schema.id,
      schema_name: schema.name,
      schema_version: schema.version,
      data: instanceData,
      project_id: project_id || schema.project_id,
      user_id: user_id || schema.user_id,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    idata.instances[instance.id] = instance;
    saveInstances(idata);
    res.status(201).json(instance);
  });

  // List instances (filter by schema_name, schema_id, project_id, user_id)
  app.get('/instances', requireInternal, (req, res) => {
    const idata = loadInstances();
    let items = Object.values(idata.instances);
    if (req.query.schema_name) items = items.filter((i) => i.schema_name === req.query.schema_name);
    if (req.query.schema_id) items = items.filter((i) => i.schema_id === req.query.schema_id);
    if (req.query.project_id) items = items.filter((i) => i.project_id === req.query.project_id);
    if (req.query.user_id) items = items.filter((i) => i.user_id === req.query.user_id);
    res.json({ count: items.length, instances: items });
  });

  // Get instance
  app.get('/instances/:id', requireInternal, (req, res) => {
    const idata = loadInstances();
    const inst = idata.instances[req.params.id];
    if (!inst) return res.status(404).json({ error: 'not_found' });
    res.json(inst);
  });

  // Update instance
  app.put('/instances/:id', requireInternal, (req, res) => {
    const idata = loadInstances();
    const inst = idata.instances[req.params.id];
    if (!inst) return res.status(404).json({ error: 'not_found' });
    const { data: newData } = req.body || {};
    if (!newData || typeof newData !== 'object') return res.status(400).json({ error: 'validation', message: 'data required' });
    const sdata = loadSchemas();
    const schema = sdata.schemas[inst.schema_id];
    if (!schema) return res.status(404).json({ error: 'not_found', message: 'schema not found' });
    const err = validateInstance(schema, { ...inst.data, ...newData });
    if (err) return res.status(400).json({ error: 'validation', message: err });
    inst.data = { ...inst.data, ...newData };
    inst.updated_at = nowIso();
    saveInstances(idata);
    res.json(inst);
  });

  // Delete instance
  app.delete('/instances/:id', requireInternal, (req, res) => {
    const idata = loadInstances();
    if (!idata.instances[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete idata.instances[req.params.id];
    saveInstances(idata);
    res.json({ deleted: true, instance_id: req.params.id });
  });

  // Validate an instance against a schema (no save)
  app.post('/schemas/:idOrName/validate', requireInternal, (req, res) => {
    const sdata = loadSchemas();
    const schema = sdata.schemas[req.params.idOrName];
    if (!schema) return res.status(404).json({ error: 'not_found' });
    const err = validateInstance(schema, req.body.data || {});
    if (err) return res.status(400).json({ error: 'invalid', message: err });
    res.json({ valid: true });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[studio-twin] listening on :${PORT}`));
}

module.exports = { createApp, VALID_FIELD_TYPES, VALID_RELATION_TYPES, validateSchema, validateInstance };
