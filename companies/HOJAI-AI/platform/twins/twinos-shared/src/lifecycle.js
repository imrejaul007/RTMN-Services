/**
 * RTMN TwinOS - Lifecycle Router (Phase 5)
 *
 * Adds standard lifecycle endpoints to a twin service so that any twin
 * can be transitioned through a state machine (active <-> paused, archived,
 * draft, etc.) with consistent auditing, event publishing, and platform
 * side-effects.
 *
 * Usage:
 *
 *   import { lifecycleRouter } from '@rtmn/twinos-shared';
 *
 *   app.use('/api/twins', lifecycleRouter({
 *     store: myStore,
 *     idParam: 'id',
 *     twinType: 'order',
 *     platform,
 *     publish: publishAsync,
 *     requireAuth
 *   }));
 *
 * Endpoints (relative to mount path):
 *
 *   GET    /:id/lifecycle              -> current lifecycle state
 *   POST   /:id/lifecycle/transition   -> { to, reason }
 *   GET    /:id/lifecycle/history      -> audit trail
 *   POST   /:id/lifecycle/archive      -> shortcut to -> 'archived'
 *   POST   /:id/lifecycle/restore      -> shortcut to -> 'active'
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TWIN_STATUS } from './constants/twins.js';

const DEFAULT_STATUSES = Object.values(TWIN_STATUS);

const ALLOWED_TRANSITIONS = {
  active:    ['inactive', 'archived', 'paused', 'draft', 'syncing'],
  inactive:  ['active', 'archived', 'paused'],
  paused:    ['active', 'archived'],
  draft:     ['active', 'archived'],
  syncing:   ['active', 'inactive', 'archived'],
  pending:   ['active', 'inactive', 'archived'],
  archived:  ['active']
};

export const LIFECYCLE_STATUSES = [...DEFAULT_STATUSES, 'paused'];

export function lifecycleRouter(opts = {}) {
  const {
    store,
    idParam = 'id',
    twinType = 'twin',
    platform = null,
    publish = null,
    requireAuth = null,
    strictLimiter = null,
    statuses = LIFECYCLE_STATUSES
  } = opts;

  if (!store) {
    throw new Error('lifecycleRouter: `store` is required');
  }

  const router = express.Router({ mergeParams: true });
  const auth = requireAuth || ((req, res, next) => next());
  const writeGuard = strictLimiter || ((req, res, next) => next());

  function _get(id) {
    if (typeof store.get === 'function') return store.get(id);
    if (store instanceof Map) return store.get(id);
    return null;
  }
  function _set(id, value) {
    if (typeof store.set === 'function') return store.set(id, value);
    if (store instanceof Map) return store.set(id, value);
    throw new Error('Store does not support set()');
  }

  async function _publishAsync(type, payload) {
    if (typeof publish === 'function') {
      try { await publish(type, payload); } catch (_e) { /* swallow */ }
    }
  }
  async function _audit(action, twinId, details) {
    if (platform && platform.policy && typeof platform.policy.audit === 'function') {
      try { platform.policy.audit(action, twinType, { twinId, ...details }); } catch (_e) { /* swallow */ }
    }
  }

  router.get(`/:${idParam}/lifecycle`, auth, (req, res) => {
    const id = req.params[idParam];
    const twin = _get(id);
    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'TWIN_NOT_FOUND', message: `${twinType} ${id} not found` }
      });
    }
    res.json({
      success: true,
      twinId: id,
      twinType,
      status: twin.status || 'unknown',
      version: twin.version || 1,
      updatedAt: twin.updatedAt || null,
      transitions: ALLOWED_TRANSITIONS[twin.status] || []
    });
  });

  router.post(`/:${idParam}/lifecycle/transition`, auth, writeGuard, async (req, res, next) => {
    try {
      const id = req.params[idParam];
      const twin = _get(id);
      if (!twin) {
        return res.status(404).json({
          success: false,
          error: { code: 'TWIN_NOT_FOUND', message: `${twinType} ${id} not found` }
        });
      }
      const { to, reason } = req.body || {};
      if (!to || typeof to !== 'string') {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '`to` is required (target status)' }
        });
      }
      if (!statuses.includes(to)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: `Invalid target status "${to}"`, details: { allowed: statuses } }
        });
      }
      const from = twin.status || 'unknown';
      if (from === to) {
        return res.status(409).json({
          success: false,
          error: { code: 'NO_OP', message: `Twin is already in status "${to}"` }
        });
      }
      const allowed = ALLOWED_TRANSITIONS[from] || [];
      if (!allowed.includes(to)) {
        return res.status(409).json({
          success: false,
          error: { code: 'INVALID_TRANSITION', message: `Cannot transition from "${from}" to "${to}"`, details: { allowedFrom: allowed } }
        });
      }
      const now = new Date().toISOString();
      const history = Array.isArray(twin.lifecycleHistory) ? twin.lifecycleHistory : [];
      const transition = {
        id: `lc-${uuidv4().slice(0, 8)}`,
        from, to,
        reason: reason || null,
        actorId: (req.user && req.user.id) || null,
        at: now
      };
      const updated = {
        ...twin,
        status: to,
        version: (twin.version || 1) + 1,
        updatedAt: now,
        lastTransitionAt: now,
        lifecycleHistory: [...history, transition]
      };
      await _set(id, updated);
      await _publishAsync(`${twinType}.lifecycle.transitioned`, {
        twinId: id, from, to, reason: reason || null,
        actorId: (req.user && req.user.id) || null
      });
      await _audit('transition', id, { from, to, reason });
      res.json({ success: true, twinId: id, from, to, transition, version: updated.version });
    } catch (err) { next(err); }
  });

  router.get(`/:${idParam}/lifecycle/history`, auth, (req, res) => {
    const id = req.params[idParam];
    const twin = _get(id);
    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'TWIN_NOT_FOUND', message: `${twinType} ${id} not found` }
      });
    }
    const history = Array.isArray(twin.lifecycleHistory) ? twin.lifecycleHistory : [];
    res.json({ success: true, twinId: id, twinType, history });
  });

  // Shortcut: POST /:id/lifecycle/archive -> transition to 'archived'
  router.post(`/:${idParam}/lifecycle/archive`, auth, writeGuard, async (req, res, next) => {
    try {
      const id = req.params[idParam];
      const twin = _get(id);
      if (!twin) {
        return res.status(404).json({
          success: false,
          error: { code: 'TWIN_NOT_FOUND', message: `${twinType} ${id} not found` }
        });
      }
      const from = twin.status || 'unknown';
      if (from === 'archived') {
        return res.status(409).json({
          success: false,
          error: { code: 'NO_OP', message: `Twin is already archived` }
        });
      }
      const allowed = ALLOWED_TRANSITIONS[from] || [];
      if (!allowed.includes('archived')) {
        return res.status(409).json({
          success: false,
          error: { code: 'INVALID_TRANSITION', message: `Cannot archive from "${from}"`, details: { allowedFrom: allowed } }
        });
      }
      const reason = (req.body && req.body.reason) || 'archived via shortcut';
      const now = new Date().toISOString();
      const history = Array.isArray(twin.lifecycleHistory) ? twin.lifecycleHistory : [];
      const transition = {
        id: `lc-${uuidv4().slice(0, 8)}`,
        from, to: 'archived',
        reason,
        actorId: (req.user && req.user.id) || null,
        at: now
      };
      const updated = {
        ...twin,
        status: 'archived',
        version: (twin.version || 1) + 1,
        updatedAt: now,
        lastTransitionAt: now,
        archivedAt: now,
        lifecycleHistory: [...history, transition]
      };
      await _set(id, updated);
      await _publishAsync(`${twinType}.lifecycle.transitioned`, {
        twinId: id, from, to: 'archived', reason,
        actorId: (req.user && req.user.id) || null
      });
      await _audit('archive', id, { from, reason });
      res.json({ success: true, twinId: id, from, to: 'archived', transition, version: updated.version });
    } catch (err) { next(err); }
  });

  // Shortcut: POST /:id/lifecycle/restore -> transition from 'archived' to 'active'
  router.post(`/:${idParam}/lifecycle/restore`, auth, writeGuard, async (req, res, next) => {
    try {
      const id = req.params[idParam];
      const twin = _get(id);
      if (!twin) {
        return res.status(404).json({
          success: false,
          error: { code: 'TWIN_NOT_FOUND', message: `${twinType} ${id} not found` }
        });
      }
      const from = twin.status || 'unknown';
      if (from !== 'archived') {
        return res.status(409).json({
          success: false,
          error: { code: 'INVALID_TRANSITION', message: `Can only restore from "archived", got "${from}"` }
        });
      }
      const now = new Date().toISOString();
      const history = Array.isArray(twin.lifecycleHistory) ? twin.lifecycleHistory : [];
      const transition = {
        id: `lc-${uuidv4().slice(0, 8)}`,
        from, to: 'active',
        reason: 'restored via shortcut',
        actorId: (req.user && req.user.id) || null,
        at: now
      };
      const updated = {
        ...twin,
        status: 'active',
        mergedInto: null,
        version: (twin.version || 1) + 1,
        updatedAt: now,
        lastTransitionAt: now,
        restoredAt: now,
        lifecycleHistory: [...history, transition]
      };
      await _set(id, updated);
      await _publishAsync(`${twinType}.lifecycle.transitioned`, {
        twinId: id, from, to: 'active', reason: 'restored',
        actorId: (req.user && req.user.id) || null
      });
      await _audit('restore', id, { from });
      res.json({ success: true, twinId: id, from, to: 'active', transition, version: updated.version });
    } catch (err) { next(err); }
  });

  return router;
}

export default lifecycleRouter;
