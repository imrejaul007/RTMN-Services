/**
 * Routes for nexha-business-directory (ADR-0009 Phase 3).
 *
 * Endpoints (under /api/v1):
 *
 *   POST   /companies                 — register/update a company (auth)
 *   GET    /companies                 — list (tenant-scoped for users, all for internal)
 *   GET    /companies/:companyId      — fetch one
 *   PATCH  /companies/:companyId      — update
 *   DELETE /companies/:companyId      — delete (cascade agents)
 *
 *   POST   /companies/:companyId/agents — register/update an agent
 *   GET    /companies/:companyId/agents — list agents of a company
 *   GET    /agents/:agentId             — fetch one
 *
 *   GET    /capabilities              — public search by capability
 *   GET    /trust                     — fetch trust linkage for a set of companies
 *
 *   GET    /health                    — liveness probe
 */

import express from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth, tenantFrom } from '../middleware/auth.js';
import * as svc from '../services/directoryService.js';

const router = express.Router();

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = err.code || 'INTERNAL_ERROR';
      const status =
        code === 'VALIDATION_ERROR' ? 400
          : code === 'NOT_FOUND' ? 404
          : code === 'FORBIDDEN' ? 403
          : code === 'CONFLICT' ? 409
          : 500;
      if (!res.headersSent) {
        res.status(status).json({ success: false, error: { code, message: msg } });
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────────
// Companies
// ─────────────────────────────────────────────────────────────────

const CompanyInputSchema = z.object({
  tenantId: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  capabilities: z.array(z.string().min(1).max(100)).max(50).optional(),
  industries: z.array(z.string().min(1).max(100)).max(50).optional(),
  contact: z.object({}).passthrough().optional().nullable(),
  trustEntityId: z.string().max(200).optional().nullable(),
  metadata: z.object({}).passthrough().optional().nullable(),
});

router.post(
  '/companies',
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = CompanyInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }
    const input = parsed.data;
    const tenantId = input.tenantId || tenantFrom(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' },
      });
    }
    const company = await svc.registerCompany({ ...input, tenantId });
    res.status(201).json({ success: true, data: company });
  }),
);

router.get(
  '/companies',
  optionalAuth,
  asyncRoute(async (req, res) => {
    const { limit, offset } = req.query;
    // Internal callers see across tenants; everyone else sees their own.
    const tenantId = req.isInternalCall ? null : tenantFrom(req);
    const out = await svc.listCompanies({
      tenantId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ success: true, data: out });
  }),
);

router.get(
  '/companies/:companyId',
  optionalAuth,
  asyncRoute(async (req, res) => {
    const company = await svc.getCompany(req.params.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Company ${req.params.companyId} not found` },
      });
    }
    // Tenant isolation for non-internal callers.
    if (!req.isInternalCall) {
      const tenantId = tenantFrom(req);
      if (tenantId && company.tenantId !== tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Company ${req.params.companyId} not found` },
        });
      }
    }
    res.json({ success: true, data: company });
  }),
);

const CompanyPatchSchema = z.object({
  description: z.string().max(4000).optional().nullable(),
  capabilities: z.array(z.string().min(1).max(100)).max(50).optional(),
  industries: z.array(z.string().min(1).max(100)).max(50).optional(),
  contact: z.object({}).passthrough().optional().nullable(),
  trustEntityId: z.string().max(200).optional().nullable(),
  verificationLevel: z.number().int().min(0).max(3).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW']).optional(),
  metadata: z.object({}).passthrough().optional().nullable(),
});

router.patch(
  '/companies/:companyId',
  requireAuth,
  asyncRoute(async (req, res) => {
    const tenantId = tenantFrom(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' },
      });
    }
    const parsed = CompanyPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }
    const updated = await svc.updateCompany(req.params.companyId, tenantId, parsed.data);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Company ${req.params.companyId} not found for tenant` },
      });
    }
    res.json({ success: true, data: updated });
  }),
);

router.delete(
  '/companies/:companyId',
  requireAuth,
  asyncRoute(async (req, res) => {
    const tenantId = tenantFrom(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' },
      });
    }
    const ok = await svc.deleteCompany(req.params.companyId, tenantId);
    if (!ok) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Company ${req.params.companyId} not found for tenant` },
      });
    }
    res.json({ success: true, data: { deleted: true, companyId: req.params.companyId } });
  }),
);

// ─────────────────────────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────────────────────────

const AgentInputSchema = z.object({
  agentId: z.string().min(1).max(200),
  tenantId: z.string().min(1).max(200).optional(),
  type: z.enum(['AGENT', 'HUMAN', 'HYBRID', 'SERVICE']).optional(),
  displayName: z.string().max(200).optional().nullable(),
  capabilities: z.array(z.string().min(1).max(100)).max(50).optional(),
  trustEntityId: z.string().max(200).optional().nullable(),
  metadata: z.object({}).passthrough().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

router.post(
  '/companies/:companyId/agents',
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = AgentInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }
    const input = parsed.data;
    const tenantId = input.tenantId || tenantFrom(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' },
      });
    }
    const agent = await svc.registerAgent(req.params.companyId, { ...input, tenantId });
    res.status(201).json({ success: true, data: agent });
  }),
);

router.get(
  '/companies/:companyId/agents',
  optionalAuth,
  asyncRoute(async (req, res) => {
    const { status, limit, offset } = req.query;
    const out = await svc.listCompanyAgents(req.params.companyId, {
      status: status ? String(status) : null,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ success: true, data: out });
  }),
);

router.get(
  '/agents/:agentId',
  optionalAuth,
  asyncRoute(async (req, res) => {
    const agent = await svc.getAgent(req.params.agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Agent ${req.params.agentId} not found` },
      });
    }
    if (!req.isInternalCall) {
      const tenantId = tenantFrom(req);
      if (tenantId && agent.tenantId !== tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Agent ${req.params.agentId} not found` },
        });
      }
    }
    res.json({ success: true, data: agent });
  }),
);

// ─────────────────────────────────────────────────────────────────
// Public search
// ─────────────────────────────────────────────────────────────────

router.get(
  '/capabilities',
  optionalAuth,
  asyncRoute(async (req, res) => {
    const { q, capability, limit, offset } = req.query;
    const caps = capability
      ? String(capability).split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const out = await svc.searchCapabilities({
      q: q ? String(q) : null,
      capabilities: caps,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ success: true, data: out });
  }),
);

// ─────────────────────────────────────────────────────────────────
// Trust linkage (for badge rendering on directory cards)
// ─────────────────────────────────────────────────────────────────

router.get(
  '/trust',
  requireAuth,
  asyncRoute(async (req, res) => {
    const ids = String(req.query.companyIds || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 200);
    const linkage = await svc.getTrustLinkage(ids);
    res.json({ success: true, data: linkage });
  }),
);

export default router;
