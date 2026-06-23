/**
 * SkillOS — Composability: packs, dependencies, agent enhancement
 *
 * - Packs: collections of assets installed together (atomic or best-effort)
 * - Dependencies: auto-resolve at install time
 * - Agent enhancement: bind a library to an agent identity
 */

import { v4 as uuidv4 } from 'uuid';

export const PACK_INSTALL_BEHAVIORS = ['atomic', 'best-effort'];

/**
 * Build a personal library record.
 */
export function buildLibrary(input) {
  const { ownerId, ownerType = 'human', name, description = '', visibility = 'private' } = input;
  if (!ownerId) throw new Error('ownerId required');
  if (!name) throw new Error('name required');
  if (!['private', 'public', 'org-only'].includes(visibility)) {
    throw new Error(`invalid visibility: ${visibility}`);
  }
  return {
    id: `lib-${uuidv4().slice(0, 8)}`,
    ownerId,
    ownerType,
    name,
    description,
    visibility,
    skillIds: [],
    agentRefs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Resolve the dependency closure of a set of asset ids.
 * Returns the set of all required assets (including the input ones).
 *
 * @param {string[]} assetIds
 * @param {Function} getAsset — async (id) => asset | null
 * @param {Function} getDependencies — async (id) => string[] (returns dependent asset ids)
 * @returns {Promise<{ resolved: string[], missing: string[] }>}
 */
export async function resolveDependencies(assetIds, getAsset, getDependencies) {
  const resolved = new Set();
  const missing = new Set();
  const queue = [...assetIds];

  while (queue.length > 0) {
    const id = queue.shift();
    if (resolved.has(id)) continue;
    const asset = await getAsset(id);
    if (!asset) { missing.add(id); continue; }
    resolved.add(id);
    const deps = await getDependencies(id);
    for (const d of (deps || [])) {
      if (!resolved.has(d)) queue.push(d);
    }
  }
  return {
    resolved: Array.from(resolved),
    missing: Array.from(missing),
  };
}

/**
 * Plan a pack install: returns the ordered list of assets to install.
 * For 'atomic' behavior, missing deps cause an error. For 'best-effort', we proceed.
 */
export async function planPackInstall(pack, getAsset, getDependencies) {
  if (!pack) throw new Error('pack required');
  if (pack.assetType !== 'pack') throw new Error('asset is not a pack');
  const members = pack.memberAssetIds || [];
  if (members.length === 0) throw new Error('pack has no members');

  const { resolved, missing } = await resolveDependencies(members, getAsset, getDependencies);
  if (pack.installBehavior === 'atomic' && missing.length > 0) {
    throw new Error(`atomic pack install failed: missing dependencies: ${missing.join(', ')}`);
  }
  return { toInstall: resolved, missing };
}

/**
 * Build an "enhancement" record: a set of skills bound to an agent.
 * An agent is a user identity (typically an SUTAR agent) in CorpID.
 */
export function buildEnhancement(input) {
  const { agentId, libraryId, skillIds, installedBy, tenantId } = input;
  if (!agentId) throw new Error('agentId required');
  if (!installedBy) throw new Error('installedBy (user) required');
  if (!Array.isArray(skillIds) || skillIds.length === 0) {
    throw new Error('skillIds must be a non-empty array');
  }
  return {
    id: `enh-${uuidv4().slice(0, 8)}`,
    agentId,
    libraryId: libraryId || null,
    skillIds: [...skillIds],
    installedBy,
    tenantId: tenantId || null,
    installedAt: new Date().toISOString(),
    status: 'active',
  };
}