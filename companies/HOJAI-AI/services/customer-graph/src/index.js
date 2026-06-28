/**
 * HOJAI Customer Graph API
 *
 * Graph-based customer data model.
 * Part of the Customer Intelligence SDK suite.
 *
 * Port: 4903
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4903;
const SERVICE_NAME = 'customer-graph';
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory graph store
const customers = new Map();
const relationships = new Map();

function resolveCustomer(phone, email, deviceId) {
  // Simple resolution - check existing customers
  for (const [id, customer] of customers) {
    if (phone && customer.phone === phone) return { customerId: id, confidence: 0.95, sources: ['phone'] };
    if (email && customer.email === email) return { customerId: id, confidence: 0.9, sources: ['email'] };
    if (deviceId && customer.deviceId === deviceId) return { customerId: id, confidence: 0.85, sources: ['device'] };
  }

  // Create new customer
  const customerId = `cust_${uuidv4().slice(0, 12)}`;
  customers.set(customerId, { phone, email, deviceId, createdAt: new Date().toISOString() });

  return { customerId, confidence: 1.0, merged_ids: [], sources: phone ? ['phone'] : email ? ['email'] : ['device'] };
}

function getConnections(customerId) {
  const connections = [];

  for (const [relId, rel] of relationships) {
    if (rel.from === customerId || rel.to === customerId) {
      connections.push({
        type: rel.type,
        entity: { id: rel.to === customerId ? rel.from : rel.to, type: rel.entityType },
        strength: rel.strength,
        created_at: rel.createdAt
      });
    }
  }

  return connections;
}

function getNetwork(customerId) {
  const customer = customers.get(customerId);
  if (!customer) return null;

  const visited = new Set([customerId]);
  const nodes = [{ id: customerId, segments: {} }];
  const edges = [];

  // BFS to get 2-hop network
  const queue = [customerId];
  let hops = 0;

  while (queue.length > 0 && hops < 2) {
    const levelSize = queue.length;
    for (let i = 0; i < levelSize; i++) {
      const current = queue.shift();
      for (const [relId, rel] of relationships) {
        if (rel.from === current && !visited.has(rel.to)) {
          visited.add(rel.to);
          queue.push(rel.to);
          nodes.push({ id: rel.to, type: rel.entityType });
          edges.push({ from: rel.from, to: rel.to, strength: rel.strength });
        }
        if (rel.to === current && !visited.has(rel.from)) {
          visited.add(rel.from);
          queue.push(rel.from);
          nodes.push({ id: rel.from, type: rel.entityType });
          edges.push({ from: rel.from, to: rel.to, strength: rel.strength });
        }
      }
    }
    hops++;
  }

  return {
    customer: nodes[0],
    connections: nodes.slice(1),
    network_score: Math.min(nodes.length / 10, 1)
  };
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

app.post('/api/graph/resolve', (req, res) => {
  try {
    const { phone, email, deviceId } = req.body;
    const result = resolveCustomer(phone, email, deviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/graph/relate', (req, res) => {
  try {
    const { customerId, entityType, entityId, relationship, strength } = req.body;

    const relId = uuidv4();
    relationships.set(relId, {
      from: customerId,
      to: entityId,
      type: relationship,
      entityType,
      strength: strength || 1,
      createdAt: new Date().toISOString()
    });

    res.json({ relationshipId: relId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/graph/:customerId/connections', (req, res) => {
  try {
    const connections = getConnections(req.params.customerId);
    res.json({ connections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/graph/:customerId/network', (req, res) => {
  try {
    const network = getNetwork(req.params.customerId);
    if (!network) return res.status(404).json({ error: 'Customer not found' });
    res.json(network);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (!NO_LISTEN) {
  app.listen(PORT, () => console.log(`Customer Graph API listening on port ${PORT}`));
}

module.exports = app;
