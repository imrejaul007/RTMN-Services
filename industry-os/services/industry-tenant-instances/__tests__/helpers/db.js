/**
 * Test helpers — MongoDB memory server + auth tokens.
 *
 * ADR-0010 Phase 10 (2026-06-22).
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const STATE_KEY = '__industry_tenant_instances_test_state__';

function getState() {
  if (!globalThis[STATE_KEY]) {
    globalThis[STATE_KEY] = { mongo: null, ownerFile: null };
  }
  return globalThis[STATE_KEY];
}

export const JWT_SECRET = 'test-secret-industry-tenant-instances';
export const INTERNAL_TOKEN = 'iti-test-internal-token';

process.env.JWT_SECRET = JWT_SECRET;
process.env.INDUSTRY_TENANT_INSTANCES_INTERNAL_TOKEN = INTERNAL_TOKEN;

export async function connect(fileLabel) {
  const state = getState();
  if (mongoose.connection.readyState === 1 && state.mongo) return;
  state.mongo = await MongoMemoryServer.create();
  state.ownerFile = fileLabel || state.ownerFile;
  await mongoose.connect(state.mongo.getUri());
  await syncAllIndexes();
}

export async function disconnect() {
  const state = getState();
  if (state.ownerFile === null || !state.mongo) return;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await state.mongo.stop();
  state.mongo = null;
  state.ownerFile = null;
}

export async function syncAllIndexes() {
  const { IndustryInstance } = await import('../../src/models/IndustryInstance.js');
  const { UsageMetric } = await import('../../src/models/UsageMetric.js');
  await IndustryInstance.syncIndexes();
  await UsageMetric.syncIndexes();
}

export async function clear() {
  const { IndustryInstance } = await import('../../src/models/IndustryInstance.js');
  const { UsageMetric } = await import('../../src/models/UsageMetric.js');
  await IndustryInstance.deleteMany({});
  await UsageMetric.deleteMany({});
}

export function issueToken({
  tenantId = 't_admin',
  sub = 'admin',
  roles = ['industry:admin'],
  expiresInSec = 3600,
}) {
  return jwt.sign({ tenantId, sub, roles }, JWT_SECRET, { expiresIn: expiresInSec });
}

export function issueInternalHeaders({ tenantId = 't_admin' } = {}) {
  return { 'x-internal-token': INTERNAL_TOKEN, 'x-tenant-id': tenantId };
}

export function issueAuthHeaders({
  tenantId = 't_admin',
  roles = ['industry:admin'],
  sub = 'admin',
} = {}) {
  const token = issueToken({ tenantId, sub, roles });
  return { authorization: `Bearer ${token}` };
}

export function issueNoRoleHeaders({ tenantId = 't_admin' } = {}) {
  const token = jwt.sign({ tenantId, sub: 'lurker', roles: ['genie:user'] }, JWT_SECRET, { expiresIn: 3600 });
  return { authorization: `Bearer ${token}` };
}