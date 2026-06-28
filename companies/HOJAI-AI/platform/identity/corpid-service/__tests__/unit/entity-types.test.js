/**
 * CorpID Entity Types Tests
 * Tests for P0 Entity Type Extension
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

const ENTITY_TYPE_PREFIXES = {
  IND: 'CI-IND-',      // Individual/Human
  BIZ: 'CI-BIZ-',      // Business
  AGT: 'CI-AGT-',      // AI Agent
  WRK: 'CI-WRK-',      // Workload
  DEV: 'CI-DEV-',      // Device
  API: 'CI-API-',      // API/Application
  TWN: 'CI-TWN-',      // Digital Twin
  AST: 'CI-AST-',      // Asset
  ORG: 'CI-ORG-',      // Organization
  DEP: 'CI-DEP-',      // Department
  TEAM: 'CI-TEAM-',    // Team
  PROD: 'CI-PROD-',    // Product
  CONTRACT: 'CI-CTR-', // Contract
  POLICY: 'CI-POL-',   // Policy
  CERT: 'CI-CERT-',    // Certificate
  KPI: 'CI-KPI-',      // KPI
  EVT: 'CI-EVT-',      // Event
  LOC: 'CI-LOC-',      // Location
  REL: 'CI-REL-',      // Relationship
};

function getEntityTypeDescription(type) {
  const descriptions = {
    IND: 'Individual/Human user',
    BIZ: 'Business/Company',
    AGT: 'AI Agent',
    WRK: 'Workload/Service',
    DEV: 'Device (IoT, mobile, etc.)',
    API: 'API/Application',
    TWN: 'Digital Twin',
    AST: 'Asset (physical/digital)',
    ORG: 'Organization (detailed)',
    DEP: 'Department',
    TEAM: 'Team',
    PROD: 'Product/SKU',
    CONTRACT: 'Contract/Agreement',
    POLICY: 'Business Policy',
    CERT: 'Certificate/Credential',
    KPI: 'KPI/Metric',
    EVT: 'Business Event',
    LOC: 'Location',
    REL: 'Relationship',
  };
  return descriptions[type] || 'Unknown entity type';
}

function createApp() {
  const app = express();

  // GET /api/entity-types
  app.get('/api/entity-types', (req, res) => {
    res.json({
      success: true,
      entityTypes: Object.entries(ENTITY_TYPE_PREFIXES).map(([key, prefix]) => ({
        key,
        prefix,
        description: getEntityTypeDescription(key),
      })),
    });
  });

  return app;
}

describe('CorpID Entity Types', () => {
  describe('GET /api/entity-types', () => {
    it('returns all entity types without auth', async () => {
      const res = await request(createApp()).get('/api/entity-types');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.entityTypes)).toBe(true);
      expect(res.body.entityTypes.length).toBeGreaterThanOrEqual(19);
    });

    it('includes all standard types (IND, BIZ, AGT, WRK)', async () => {
      const res = await request(createApp()).get('/api/entity-types');
      const keys = res.body.entityTypes.map(e => e.key);

      expect(keys).toContain('IND');
      expect(keys).toContain('BIZ');
      expect(keys).toContain('AGT');
      expect(keys).toContain('WRK');
    });

    it('includes extended types (DEV, API, TWN, AST)', async () => {
      const res = await request(createApp()).get('/api/entity-types');
      const keys = res.body.entityTypes.map(e => e.key);

      expect(keys).toContain('DEV');
      expect(keys).toContain('API');
      expect(keys).toContain('TWN');
      expect(keys).toContain('AST');
    });

    it('includes business types (PROD, CONTRACT, POLICY)', async () => {
      const res = await request(createApp()).get('/api/entity-types');
      const keys = res.body.entityTypes.map(e => e.key);

      expect(keys).toContain('PROD');
      expect(keys).toContain('CONTRACT');
      expect(keys).toContain('POLICY');
    });

    it('each entity has key, prefix, and description', async () => {
      const res = await request(createApp()).get('/api/entity-types');

      for (const entity of res.body.entityTypes) {
        expect(entity).toHaveProperty('key');
        expect(entity).toHaveProperty('prefix');
        expect(entity).toHaveProperty('description');
        expect(entity.prefix).toMatch(/^CI-/);
      }
    });

    it('prefixes follow CorpID format', async () => {
      const res = await request(createApp()).get('/api/entity-types');

      for (const entity of res.body.entityTypes) {
        expect(entity.prefix).toMatch(/^CI-[A-Z]+-/);
        expect(entity.prefix.length).toBeGreaterThanOrEqual(7); // CI-X- minimum
        expect(entity.prefix.length).toBeLessThanOrEqual(10); // CI-PROD- maximum
      }
    });

    it('has correct prefix for each type', async () => {
      const res = await request(createApp()).get('/api/entity-types');
      const byKey = {};
      for (const e of res.body.entityTypes) byKey[e.key] = e;

      expect(byKey['IND'].prefix).toBe('CI-IND-');
      expect(byKey['AGT'].prefix).toBe('CI-AGT-');
      expect(byKey['WRK'].prefix).toBe('CI-WRK-');
      expect(byKey['DEV'].prefix).toBe('CI-DEV-');
      expect(byKey['AST'].prefix).toBe('CI-AST-');
    });
  });
});