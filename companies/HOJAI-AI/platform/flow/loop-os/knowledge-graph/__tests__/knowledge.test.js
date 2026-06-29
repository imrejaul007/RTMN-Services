/**
 * Knowledge Graph - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

process.env.HOJAI_API_KEY = 'test-key';
process.env.PORT = '4738';

describe('Knowledge Graph - Health', () => {
  it('should return healthy status', async () => {
    const res = await fetch('http://localhost:4738/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('knowledge-graph');
  });
});

describe('Knowledge Graph - Entities', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create entity', async () => {
    const res = await fetch('http://localhost:4738/api/entities', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        type: 'customer',
        name: 'Acme Corp'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Acme Corp');
  });

  it('should list entities', async () => {
    const res = await fetch('http://localhost:4738/api/entities?type=customer');
    const data = await res.json();
    expect(data.entities).toBeInstanceOf(Array);
  });

  it('should search entities', async () => {
    const res = await fetch('http://localhost:4738/api/search?q=acme');
    const data = await res.json();
    expect(data.results).toBeInstanceOf(Array);
  });
});

describe('Knowledge Graph - Relations', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create relation', async () => {
    // Create two entities first
    const e1 = await fetch('http://localhost:4738/api/entities', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ type: 'customer', name: 'Customer A' })
    });
    const entity1 = await e1.json();

    const e2 = await fetch('http://localhost:4738/api/entities', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ type: 'order', name: 'Order 001' })
    });
    const entity2 = await e2.json();

    const res = await fetch('http://localhost:4738/api/relations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        from: entity1.id,
        to: entity2.id,
        type: 'placed'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
  });
});

describe('Knowledge Graph - Ontologies', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create ontology', async () => {
    const res = await fetch('http://localhost:4738/api/ontologies', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'Business Ontology',
        version: '1.0.0'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
  });
});
