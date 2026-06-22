/**
 * RTMN TwinOS - Merge Router (Phase 5)
 *
 * Provides a standard endpoint for merging two twin records into one.
 * Used when duplicate twins are detected and the operator wants to fold
 * one twin into another.
 *
 * Strategies:
 *   - "combine" (default): union of fields, arrays get unique-merged, target
 *     wins on scalar collisions.
 *   - "target": target kept as-is, source's relationships migrated, source
 *     archived.
 *
 * Usage:
 *
 *   app.use('/api/twins', mergeRouter({
 *     store: myStore,
 *     twinType: 'customer',
 *     platform, publish: publishAsync, requireAuth, strictLimiter
 *   }));
 *
 * Endpoints:
 *   POST /merge                  -> { sourceId, targetId, strategy?, dryRun? }
 *   POST /:sourceId/merge-into/:targetId
 *
 * Source twin is soft-deleted (status='archived', mergedInto=targetId) unless
 * hardDelete is true.
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

export function mergeRouter(opts = {}) {
  const {
    store,
    idParam = 'id',
    twinType = 'twin',
    platform = null,
    publish = null,
    requireAuth = null,
    strictLimiter = null,
    hardDelete = false
  } = opts;

  if (!store) {
    throw new Error('mergeRouter: `store` is required');
  }

  const router = express.Router();
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
  function _delete(id) {
    if (typeof store.delete === 'function') return store.delete(id);
    if (store instanceof Map) return store.delete(id);
  }

  async function _publish(type, payload) {
    if (typeof publish === 'function') {
      try { await publish(type, payload); } catch (_e) { /* swallow */ }
    }
  }
  async function _audit(action, twinId, details) {
    if (platform && platform.policy && typeof platform.policy.audit === 'function') {
      try { platform.policy.audit(action, twinType, { twinId, ...details }); } catch (_e) { /* swallow */ }
    }
  }

  function _mergeArrays(a = [], b = []) {
    const out = [...a];
    for (const v of b) {
      if (out.indexOf(v) === -1) out.push(v);
    }
    return out;
  }

  function _mergeScalars(target, source) {
    const out = { ...target };
    for (const k of Object.keys(source)) {
      const sVal = source[k];
      const tVal = target[k];
      if (sVal === undefined || sVal === null) continue;
      if (Array.isArray(sVal) && Array.isArray(tVal)) {
        out[k] = _mergeArrays(tVal, sVal);
      } else if (tVal === undefined || tVal === null || tVal === '') {
        out[k] = sVal;
      }
    }
    return out;
  }

  function _doMerge(source, target, strategy) {
    if (strategy === 'target') {
      return {
        ...target,
        mergedFrom: _mergeArrays(target.mergedFrom, [source.id]),
        mergedAt: new Date().toISOString(),
        version: (target.version || 1) + 1
      };
    }
    const merged = _mergeScalars(target, source);
    merged.mergedFrom = _mergeArrays(target.mergedFrom, [source.id]);
    merged.mergedAt = new Date().toISOString();
    merged.version = (target.version || 1) + 1;
    return merged;
  }

  async function _handleMerge(req, res, next) {
    try {
      const sourceId = (req.body && req.body.sourceId) || req.params.sourceId;
      const targetId = (req.body && req.body.targetId) || req.params.targetId;
      const strategy = (req.body && req.body.strategy) || 'combine';
      const dryRun = !!(req.body && req.body.dryRun);

      if (!sourceId || !targetId) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'sourceId and targetId are required' } });
      }
      if (sourceId === targetId) {
        return res.status(400).json({ success: false, error: { code: 'SAME_TWIN', message: 'sourceId and targetId must differ' } });
      }

      const source = _get(sourceId);
      const target = _get(targetId);
      if (!source) {
        return res.status(404).json({ success: false, error: { code: 'SOURCE_NOT_FOUND', message: `${twinType} ${sourceId} not found` } });
      }
      if (!target) {
        return res.status(404).json({ success: false, error: { code: 'TARGET_NOT_FOUND', message: `${twinType} ${targetId} not found` } });
      }

      const merged = _doMerge(source, target, strategy);

      if (dryRun) {
        return res.json({ success: true, dryRun: true, sourceId, targetId, strategy, preview: merged });
      }

      const now = new Date().toISOString();
      merged.updatedAt = now;
      await _set(targetId, merged);

      const archivedSource = {
        ...source,
        status: 'archived',
        mergedInto: targetId,
        mergedAt: now,
        version: (source.version || 1) + 1,
        updatedAt: now
      };
      if (hardDelete) {
        await _delete(sourceId);
      } else {
        await _set(sourceId, archivedSource);
      }

      const eventId = `mrg-${uuidv4().slice(0, 8)}`;
      await _publish(`${twinType}.merged`, {
        eventId, sourceId, targetId, strategy,
        actorId: (req.user && req.user.id) || null,
        at: now
      });
      await _audit('merge', targetId, { sourceId, strategy });
      await _audit('archive', sourceId, { reason: 'merged', mergedInto: targetId });

      if (platform && platform.memory && typeof platform.memory.recordEvent === 'function') {
        try {
          platform.memory.recordEvent(`${twinType}-merge.completed`,
            { eventId, sourceId, targetId, strategy, actorId: (req.user && req.user.id) || null },
            targetId);
        } catch (_e) { /* swallow */ }
      }

      res.json({ success: true, eventId, sourceId, targetId, strategy, twin: merged });
    } catch (err) { next(err); }
  }

  router.post('/merge', auth, writeGuard, _handleMerge);
  router.post(`/:${idParam}/merge-into/:targetId`, auth, writeGuard, _handleMerge);

  return router;
}

export default mergeRouter;
