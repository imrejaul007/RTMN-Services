'use strict';
var express = require('express');
var uuidv4 = require('uuid').v4;
var path = require('path');
var fs = require('fs');
var fileURLToPath = require('url').fileURLToPath;
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) { fs.mkdirSync(DATA_DIR, { recursive: true }); }

function readJson(name) { var p = path.join(DATA_DIR, name); if (!fs.existsSync(p)) { return null; } return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function writeJson(name, data) { fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2)); }
function upsert(name, item, idField) { idField = idField || 'id'; var list = readJson(name) || []; var idx = list.findIndex(function(i) { return i[idField] === item[idField]; }); if (idx >= 0) { list[idx] = item; } else { list.push(item); } writeJson(name, list); return item; }

var app = express();
var PORT = 4904;
app.use(express.json());

// Regions CRUD
app.get('/api/regions', function(req, res) { res.json({ regions: readJson('regions.json') || [], count: (readJson('regions.json') || []).length }); });
app.get('/api/regions/:id', function(req, res) { var r = (readJson('regions.json') || []).find(function(x) { return x.id === req.params.id; }); if (!r) return res.status(404).json({ error: 'Not found' }); res.json(r); });
app.post('/api/regions', function(req, res) { var b = req.body; if (!b.name || !b.code) return res.status(400).json({ error: 'name and code required' }); var region = { id: uuidv4(), name: b.name, code: b.code, location: b.location || '', provider: b.provider || 'aws', zones: b.zones || [], compliance: b.compliance || [], status: 'active', createdAt: new Date().toISOString() }; upsert('regions.json', region); res.status(201).json(region); });
app.put('/api/regions/:id', function(req, res) { var regions = readJson('regions.json') || []; var idx = regions.findIndex(function(r) { return r.id === req.params.id; }); if (idx < 0) return res.status(404).json({ error: 'Not found' }); var b = req.body; if (b.name) regions[idx].name = b.name; if (b.status) regions[idx].status = b.status; if (b.compliance) regions[idx].compliance = b.compliance; writeJson('regions.json', regions); res.json(regions[idx]); });
app.delete('/api/regions/:id', function(req, res) { var regions = readJson('regions.json') || []; if (!regions.find(function(r) { return r.id === req.params.id; })) return res.status(404).json({ error: 'Not found' }); writeJson('regions.json', regions.filter(function(r) { return r.id !== req.params.id; })); res.json({ deleted: true }); });

// Tenant Region Assignment
app.get('/api/assignments', function(req, res) { res.json({ assignments: readJson('assignments.json') || [], count: (readJson('assignments.json') || []).length }); });
app.get('/api/assignments/:tenantId', function(req, res) { var a = (readJson('assignments.json') || []).find(function(x) { return x.tenantId === req.params.tenantId; }); if (!a) return res.status(404).json({ error: 'Tenant not found' }); res.json(a); });
app.post('/api/assignments', function(req, res) { var b = req.body; if (!b.tenantId || !b.regionId) return res.status(400).json({ error: 'tenantId and regionId required' }); var assignment = { id: uuidv4(), tenantId: b.tenantId, regionId: b.regionId, dataResidency: b.dataResidency || 'primary', failoverRegion: b.failoverRegion || null, status: 'active', createdAt: new Date().toISOString() }; upsert('assignments.json', assignment, 'tenantId'); res.status(201).json(assignment); });
app.put('/api/assignments/:tenantId', function(req, res) { var ass = readJson('assignments.json') || []; var idx = ass.findIndex(function(a) { return a.tenantId === req.params.tenantId; }); if (idx < 0) return res.status(404).json({ error: 'Tenant not found' }); var b = req.body; if (b.regionId) ass[idx].regionId = b.regionId; if (b.failoverRegion) ass[idx].failoverRegion = b.failoverRegion; if (b.status) ass[idx].status = b.status; writeJson('assignments.json', ass); res.json(ass[idx]); });

// Failover
app.post('/api/failover/:tenantId', function(req, res) { var ass = readJson('assignments.json') || []; var idx = ass.findIndex(function(a) { return a.tenantId === req.params.tenantId; }); if (idx < 0) return res.status(404).json({ error: 'Tenant not found' }); if (!ass[idx].failoverRegion) return res.status(400).json({ error: 'No failover region configured' }); var old = ass[idx].regionId; ass[idx].regionId = ass[idx].failoverRegion; ass[idx].failoverRegion = old; ass[idx].lastFailover = new Date().toISOString(); writeJson('assignments.json', ass); res.json({ failedOver: true, from: old, to: ass[idx].regionId }); });
app.get('/api/failover/status/:tenantId', function(req, res) { var a = (readJson('assignments.json') || []).find(function(x) { return x.tenantId === req.params.tenantId; }); if (!a) return res.status(404).json({ error: 'Tenant not found' }); res.json({ tenantId: a.tenantId, currentRegion: a.regionId, failoverRegion: a.failoverRegion, lastFailover: a.lastFailover || null, status: 'active' }); });

// Latency Routing
app.get('/api/routing/closest/:tenantId', function(req, res) { var regions = readJson('regions.json') || []; var a = (readJson('assignments.json') || []).find(function(x) { return x.tenantId === req.params.tenantId; }); if (!a) return res.status(404).json({ error: 'Tenant not found' }); var region = regions.find(function(r) { return r.id === a.regionId; }); res.json({ tenantId: req.params.tenantId, recommendedRegion: region ? region.code : 'unknown', regionId: a.regionId }); });

// Compliance
app.get('/api/compliance/:tenantId', function(req, res) { var a = (readJson('assignments.json') || []).find(function(x) { return x.tenantId === req.params.tenantId; }); if (!a) return res.status(404).json({ error: 'Tenant not found' }); var regions = readJson('regions.json') || []; var region = regions.find(function(r) { return r.id === a.regionId; }); res.json({ tenantId: req.params.tenantId, region: region ? region.name : null, compliance: region ? region.compliance : [], dataResidency: a.dataResidency }); });

// Stats
app.get('/api/stats', function(req, res) { var regions = readJson('regions.json') || []; var ass = readJson('assignments.json') || []; var byRegion = {}; ass.forEach(function(a) { byRegion[a.regionId] = (byRegion[a.regionId] || 0) + 1; }); res.json({ totalRegions: regions.length, totalTenants: ass.length, byRegion: byRegion }); });

app.get('/health', function(req, res) { res.json({ service: 'tenant-isolation', status: 'healthy' }); });
app.get('/ready', function(req, res) { res.json({ ready: true }); });

var server = app.listen(PORT, function() { console.log('Tenant Isolation OS running on port ' + PORT); });
module.exports = server;
