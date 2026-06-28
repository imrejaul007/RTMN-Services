/**
 * PolicyOS — GitOps Service (Phase P1: GitOps Policies)
 *
 * Bridges Git repositories with PolicyOS stores.
 * Enables Git-backed policy management with:
 *   - Policy-as-Code: YAML/JSON policy files in Git
 *   - PR workflow: policies reviewed and approved via PRs
 *   - Branch strategy: feature branches, staging, production
 *   - Auto-sync: webhooks trigger policy reload on push
 *   - Rollback: revert to previous policy version via Git
 *   - Audit trail: every policy change is a Git commit with author + diff
 *
 * Architecture:
 *   Git Repo (e.g. github.com/org/policy-repo)
 *     └── policies/
 *         ├── finance/
 *         │   ├── spending-limit.yaml
 *         │   └── approval-threshold.yaml
 *         ├── security/
 *         │   └── data-classification.yaml
 *         └── compliance/
 *             └── gdpr-retention.yaml
 *
 * Workflow:
 *   1. Developer creates feature branch: git checkout -b policy/finance/spending-v2
 *   2. Edits YAML policy file
 *   3. Opens PR → automated tests run against staging policies
 *   4. Reviewer approves → PR merged to main
 *   5. Webhook fires → PolicyOS syncs from Git
 *   6. New policy deployed atomically with rollback on failure
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ── Constants ─────────────────────────────────────────────────────────────────

const GITOPS_STATE_FILE = 'gitops-state.json';
const POLICY_FILE_EXTENSIONS = ['.yaml', '.yml', '.json'];
const MAX_RETRY_ATTEMPTS = 3;

// ── State ──────────────────────────────────────────────────────────────────────

let _gitopsStores = null;   // { policies, relationships, ... }
let _config = null;          // { repoUrl, branch, syncInterval, autoSync, ... }
let _syncStatus = 'idle';   // idle | syncing | error | disabled
let _lastSyncAt = null;
let _lastError = null;
let _webhookSecret = null;
let _branchProtections = new Map(); // branch → { requireReviews, requireCI, autoMerge }
let _syncHistory = []; // last 100 sync events
let _syncIdCounter = 0;

/**
 * Reset all GitOps state — for testing only.
 */
export function _resetGitOpsState() {
  _gitopsStores = null;
  _config = null;
  _syncStatus = 'idle';
  _lastSyncAt = null;
  _lastError = null;
  _webhookSecret = null;
  _branchProtections = new Map();
  _syncHistory = [];
  _syncIdCounter = 0;
}

// ── Configuration ────────────────────────────────────────────────────────────────

/**
 * Configure the GitOps service.
 * @param {object} opts
 * @param {object} opts.policies          PersistentStore for policies
 * @param {object} opts.relationships     PersistentStore for ReBAC (optional)
 * @param {object} opts.conditionTemplates PersistentStore (optional)
 * @param {string} [opts.repoUrl]         Git repo URL (https://github.com/org/repo)
 * @param {string} [opts.branch]         Target branch (default: main)
 * @param {string} [opts.subPath]         Subdirectory for policies (default: policies)
 * @param {string} [opts.webhookSecret]   Secret for HMAC webhook verification
 * @param {boolean} [opts.autoSync]        Auto-sync on push (default: true)
 * @param {number}  [opts.syncInterval]   Interval in ms for polling (default: 60000)
 * @param {string}  [opts.gitToken]       Git token (for private repos)
 * @param {string}  [opts.gitProvider]   github | gitlab | bitbucket (default: github)
 */
export function configureGitOps(opts) {
  _gitopsStores = {
    policies: opts.policies || null,
    relationships: opts.relationships || null,
    conditionTemplates: opts.conditionTemplates || null,
    attributePolicies: opts.attributePolicies || null,
    aiModels: opts.aiModels || null,
    constitutions: opts.constitutions || null,
    agentRegistry: opts.agentRegistry || null,
    memoryPolicies: opts.memoryPolicies || null,
    twinPolicies: opts.twinPolicies || null,
    automations: opts.automations || null,
  };

  _config = {
    repoUrl: opts.repoUrl || null,
    branch: opts.branch || 'main',
    subPath: opts.subPath || 'policies',
    webhookSecret: opts.webhookSecret || crypto.randomUUID(),
    autoSync: opts.autoSync !== false,
    syncInterval: opts.syncInterval || 60000,
    gitToken: opts.gitToken || null,
    gitProvider: opts.gitProvider || 'github',
    dryRun: opts.dryRun || false,
  };

  _syncStatus = opts.repoUrl ? 'idle' : 'disabled';
  _lastSyncAt = null;
  _lastError = null;

  return { status: _syncStatus, config: { ..._config, gitToken: _config.gitToken ? '***' : null } };
}

/**
 * Verify HMAC-SHA256 webhook signature.
 * @param {string} payload  Raw request body (string)
 * @param {string} signature  Signature from X-GitOps-Signature header
 * @returns {boolean}
 */
export function verifyWebhookSignature(payload, signature) {
  if (!_config?.webhookSecret) return false;
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', _config.webhookSecret)
    .update(payload, 'utf8')
    .digest('hex');
  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

// ── Git Repository Operations (simulated for file-based repos) ──────────────────

/**
 * Represents a policy file in the Git repository.
 */
export class PolicyFile {
  constructor({ path: filePath, content, sha, branch, lastCommit }) {
    this.path = filePath;
    this.content = content;
    this.sha = sha || crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
    this.branch = branch || _config?.branch || 'main';
    this.lastCommit = lastCommit || {
      hash: this.sha,
      author: 'system',
      message: 'Initial commit',
      timestamp: new Date().toISOString(),
    };
    this.errors = [];
  }

  /** Parse content as YAML or JSON. Returns { data, format, parseError }. */
  parse() {
    try {
      if (this.path.endsWith('.json')) {
        return { data: JSON.parse(this.content), format: 'json', parseError: null };
      }
      // Simple YAML parser for policy files
      const data = parseYAML(this.content);
      return { data, format: 'yaml', parseError: null };
    } catch (err) {
      return { data: null, format: null, parseError: err.message };
    }
  }

  /** Validate policy structure. Returns { valid, errors }. */
  validate() {
    const errors = [];
    const { data, format, parseError } = this.parse();

    if (parseError) {
      errors.push(`Parse error (${format}): ${parseError}`);
      this.errors = errors;
      return { valid: false, errors };
    }

    if (!data) {
      errors.push('Empty policy file');
      return { valid: false, errors };
    }

    // Required fields
    if (!data.id && !data.name) errors.push('Policy must have id or name');
    if (data.effect && !['allow', 'deny'].includes(data.effect)) {
      errors.push(`Invalid effect: ${data.effect}. Must be "allow" or "deny"`);
    }
    if (data.conditions && !Array.isArray(data.conditions)) {
      errors.push('conditions must be an array');
    }
    if (data.version && typeof data.version !== 'string' && typeof data.version !== 'number') {
      errors.push('version must be a string or number');
    }

    this.errors = errors;
    return { valid: errors.length === 0, errors };
  }

  /** Extract category from path: "policies/finance/spending.yaml" → "finance" */
  category() {
    const parts = this.path.split('/');
    if (parts.length >= 2) return parts[parts.length - 2];
    return 'uncategorized';
  }

  /** Extract policy ID from path or content */
  policyId() {
    const { data } = this.parse();
    if (data?.id) return data.id;
    const name = path.basename(this.path, path.extname(this.path));
    return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  }
}

// ── Simple YAML Parser ─────────────────────────────────────────────────────────

/**
 * Minimal YAML parser for Policy-as-Code files.
 * Handles the YAML subset used by policy files:
 * - Top-level key: value pairs
 * - Nested objects with 2-space indentation
 * - Lists of objects: - key: value
 * - Lists of scalars: - value
 * - Comments (#)
 * - Booleans, numbers, strings
 */
function parseYAML(yaml) {
  const lines = yaml.split('\n');
  let pos = 0;

  function scalar(s) {
    s = (s || '').trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null' || s === '~') return null;
    const n = parseFloat(s);
    if (!isNaN(n) && s === String(n)) return n;
    return s;
  }

  // Parse nested object starting at current position
  // Returns { value, consumed } where consumed = number of lines consumed
  function parseNested(baseIndent) {
    const obj = {};
    let start = pos;
    const list = [];

    while (pos < lines.length) {
      const raw = lines[pos];
      const hash = raw.indexOf('#');
      const line = hash >= 0 ? raw.slice(0, hash) : raw;
      if (!line.trim()) { pos++; continue; }
      const indent = raw.search(/\S/);
      if (indent < baseIndent) break; // Done with this block

      const content = line.trim();

      // List item
      if (content.startsWith('- ')) {
        const rest = content.slice(2).trim();
        const colon = rest.indexOf(':');
        if (colon >= 0) {
          const key = rest.slice(0, colon).trim();
          const val = rest.slice(colon + 1).trim();
          if (val === '') {
            pos++;
            const nested = parseNested(indent + 2);
            list.push({ [key]: nested.value });
            pos += nested.consumed;
          } else {
            list.push({ [key]: scalar(val) });
            pos++;
          }
        } else {
          list.push(scalar(rest));
          pos++;
        }
      } else {
        // Key-value
        const colon = content.indexOf(':');
        if (colon < 0) { pos++; continue; }
        const key = content.slice(0, colon).trim();
        const val = content.slice(colon + 1).trim();
        if (val === '' || val === '|' || val === '>' || val === '|-' || val === '>-') {
          pos++;
          const nested = parseNested(indent + 2);
          obj[key] = nested.value;
          pos += nested.consumed;
        } else {
          obj[key] = scalar(val);
          pos++;
        }
      }
    }

    const consumed = pos - start;
    if (list.length > 0) {
      // If all items are single-key objects, check if we can merge by key
      if (list.every(item => item !== null && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 1)) {
        const merged = {};
        for (const item of list) {
          const [k, v] = Object.entries(item)[0];
          if (!merged[k]) merged[k] = [];
          merged[k].push(v);
        }
        for (const [k, arr] of Object.entries(merged)) {
          obj[k] = arr.length === 1 ? arr[0] : arr;
        }
      } else {
        obj._items = list;
      }
    }
    return { value: obj, consumed };
  }

  const { value } = parseNested(-1);
  return value;
}

// ── Sync Engine ────────────────────────────────────────────────────────────────

/**
 * Sync policies from Git repository into PolicyOS stores.
 * @param {object} [opts]
 * @param {boolean} [opts.dryRun]     Don't write to stores, just report changes
 * @param {string}  [opts.branch]     Override branch
 * @param {string}  [opts.commitSha]  Sync from specific commit
 * @returns {Promise<SyncResult>}
 */
export async function syncFromGit(opts = {}) {
  if (_syncStatus === 'disabled') {
    return { ok: false, error: 'GitOps not configured — set repoUrl first' };
  }
  if (_syncStatus === 'syncing') {
    return { ok: false, error: 'Sync already in progress' };
  }

  _syncStatus = 'syncing';
  _lastError = null;
  const syncId = ++_syncIdCounter;
  const startedAt = new Date().toISOString();

  try {
    const dryRun = opts.dryRun ?? _config.dryRun;
    const branch = opts.branch || _config.branch;

    // 1. List policy files from Git
    const files = await listPolicyFiles({ branch, commitSha: opts.commitSha });

    // 2. Parse and validate each file
    const parsed = [];
    for (const file of files) {
      const policyFile = new PolicyFile({ ...file, branch });
      const { valid, errors } = policyFile.validate();
      parsed.push({
        file: policyFile,
        valid,
        errors,
        policy: policyFile.parse().data,
        policyId: policyFile.policyId(),
        category: policyFile.category(),
      });
    }

    // 3. Report validation errors
    const validationErrors = parsed.filter(p => !p.valid);
    if (validationErrors.length > 0) {
      const errMsg = validationErrors.map(p =>
        `${p.file.path}: ${p.errors.join(', ')}`
      ).join('; ');
      if (dryRun) {
        _syncStatus = 'idle';
        return { ok: false, error: `Validation failed: ${errMsg}`, dryRun: true };
      }
      // In production: fail-safe — don't apply broken policies
      _lastError = `Validation failed: ${errMsg}`;
      _syncStatus = 'error';
      recordSyncEvent({ syncId, status: 'error', error: _lastError, startedAt, filesCount: files.length });
      return { ok: false, error: _lastError, validationErrors };
    }

    // 4. Compute diff: what's new, updated, deleted vs current store
    const store = _gitopsStores?.policies;
    const existingPolicies = store ? Object.fromEntries(store.entries()) : {};
    const existingIds = new Set(Object.keys(existingPolicies));

    const toCreate = [];
    const toUpdate = [];
    const unchanged = [];

    for (const p of parsed) {
      const existing = existingPolicies[p.policyId];
      if (!existing) {
        toCreate.push(p);
      } else if (JSON.stringify(existing) !== JSON.stringify(p.policy)) {
        toUpdate.push({ ...p, existing });
      } else {
        unchanged.push(p);
      }
    }

    // 5. Apply changes (or report in dry-run mode)
    const applied = { created: [], updated: [], deleted: [], failed: [] };

    if (dryRun) {
      _syncStatus = 'idle';
      return {
        ok: true,
        dryRun: true,
        syncId,
        summary: {
          total: parsed.length,
          toCreate: toCreate.length,
          toUpdate: toUpdate.length,
          unchanged: unchanged.length,
          wouldDelete: [...existingIds].filter(id => !parsed.find(p => p.policyId === id)).length,
        },
        changes: { toCreate, toUpdate },
        branch,
      };
    }

    // Apply to store
    for (const p of toCreate) {
      try {
        store.set(p.policyId, enrichPolicy(p.policy, p.file.path, 'created', syncId));
        applied.created.push(p.policyId);
      } catch (err) {
        applied.failed.push({ policyId: p.policyId, error: err.message });
      }
    }

    for (const p of toUpdate) {
      try {
        const updated = {
          ...p.policy,
          _gitops: {
            ...(p.existing._gitops || {}),
            lastSyncedAt: startedAt,
            lastSyncedBy: 'gitops',
            syncId,
            commitSha: p.file.lastCommit?.hash,
            sourcePath: p.file.path,
            version: incrementVersion(p.existing._gitops?.version),
          },
        };
        store.set(p.policyId, updated);
        applied.updated.push(p.policyId);
      } catch (err) {
        applied.failed.push({ policyId: p.policyId, error: err.message });
      }
    }

    // Detect deleted policies (in repo but not in files)
    const fileIds = new Set(parsed.map(p => p.policyId));
    for (const id of existingIds) {
      if (!fileIds.has(id) && existingPolicies[id]?._gitops?.sourcePath) {
        // Policy was in Git and is now gone — archive it, don't delete
        try {
          const archived = {
            ...existingPolicies[id],
            status: 'archived',
            _gitops: {
              ...(existingPolicies[id]._gitops || {}),
              archivedAt: startedAt,
              archivedReason: 'removed from git',
              syncId,
            },
          };
          store.set(id, archived);
          applied.deleted.push(id);
        } catch (err) {
          applied.failed.push({ policyId: id, error: err.message });
        }
      }
    }

    _lastSyncAt = startedAt;
    _syncStatus = applied.failed.length > 0 ? 'error' : 'idle';
    if (applied.failed.length > 0) {
      _lastError = `${applied.failed.length} policies failed to apply`;
    }

    recordSyncEvent({
      syncId,
      status: _syncStatus,
      applied,
      startedAt,
      completedAt: new Date().toISOString(),
      filesCount: files.length,
      branch,
    });

    return {
      ok: applied.failed.length === 0,
      syncId,
      applied,
      summary: {
        total: parsed.length,
        created: applied.created.length,
        updated: applied.updated.length,
        deleted: applied.deleted.length,
        failed: applied.failed.length,
        unchanged: unchanged.length,
      },
      branch,
    };
  } catch (err) {
    _lastError = err.message;
    _syncStatus = 'error';
    recordSyncEvent({ syncId, status: 'error', error: err.message, startedAt });
    return { ok: false, error: err.message, syncId };
  }
}

/**
 * List policy files from Git repository.
 * In dry-run/development mode: reads from HOJAI_DATA_DIR/policy-repo/.
 * In production: calls GitHub/GitLab/Bitbucket API.
 */
async function listPolicyFiles({ branch = 'main', commitSha } = {}) {
  const repoPath = path.join(process.env.HOJAI_DATA_DIR || '/tmp/hojai', 'policy-repo', branch);

  // In dry-run mode: read from local filesystem
  if (_config?.dryRun || !_config?.repoUrl) {
    return listLocalPolicyFiles(repoPath, branch);
  }

  // Production: fetch from Git provider
  try {
    if (_config.gitProvider === 'github') {
      return await fetchGitHubPolicyFiles({ branch, commitSha });
    } else if (_config.gitProvider === 'gitlab') {
      return await fetchGitLabPolicyFiles({ branch, commitSha });
    } else {
      return await fetchGitHubPolicyFiles({ branch, commitSha }); // fallback
    }
  } catch (err) {
    throw new Error(`Failed to fetch policy files from ${_config.gitProvider}: ${err.message}`);
  }
}

/**
 * List policy files from local filesystem (development/dry-run mode).
 */
async function listLocalPolicyFiles(repoPath, branch) {
  const subPath = _config?.subPath || 'policies';
  const fullPath = path.join(repoPath, subPath);
  const files = [];

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    return files;
  }

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (POLICY_FILE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
        const content = fs.readFileSync(full, 'utf8');
        const relativePath = path.relative(fullPath, full);
        files.push({
          path: path.join(subPath, relativePath).replace(/\\/g, '/'),
          content,
          sha: crypto.createHash('sha256').update(content).digest('hex').slice(0, 8),
        });
      }
    }
  }

  walk(fullPath);
  return files;
}

/**
 * Fetch policy files from GitHub API.
 */
async function fetchGitHubPolicyFiles({ branch, commitSha }) {
  const { repoUrl, gitToken, subPath } = _config;
  if (!repoUrl) throw new Error('repoUrl not configured');

  const repo = extractGitHubRepo(repoUrl);
  const branchParam = commitSha ? commitSha : branch;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'PolicyOS-GitOps/1.0',
  };
  if (gitToken) headers['Authorization'] = `token ${gitToken}`;

  // Get tree of repository
  const treeUrl = `https://api.github.com/repos/${repo}/git/trees/${branchParam}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers });
  if (!treeRes.ok) {
    const body = await treeRes.text();
    throw new Error(`GitHub API error ${treeRes.status}: ${body}`);
  }
  const treeData = await treeRes.json();

  // Filter to policy files in subPath
  const policyFiles = (treeData.tree || []).filter(f =>
    f.path.startsWith(subPath + '/') &&
    POLICY_FILE_EXTENSIONS.some(ext => f.path.endsWith(ext))
  );

  // Fetch content for each file (up to 100 at a time via blob API)
  const files = [];
  for (const f of policyFiles.slice(0, 100)) {
    const blobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs/${f.sha}`, { headers });
    if (!blobRes.ok) continue;
    const blob = await blobRes.json();
    const content = Buffer.from(blob.content, blob.encoding).toString('utf8');
    files.push({ path: f.path, content, sha: f.sha });
  }

  return files;
}

/**
 * Fetch policy files from GitLab API.
 */
async function fetchGitLabPolicyFiles({ branch, commitSha }) {
  const { repoUrl, gitToken, subPath } = _config;
  if (!repoUrl) throw new Error('repoUrl not configured');

  const projectId = extractGitLabProjectId(repoUrl);
  const ref = commitSha || branch;
  const headers = gitToken ? { 'PRIVATE-TOKEN': gitToken } : {};
  const baseUrl = repoUrl.includes('gitlab.com')
    ? 'https://gitlab.com/api/v4'
    : repoUrl.replace(/\/api\/v4.*$/, '/api/v4');

  const files = [];
  const perPage = 100;
  let page = 1;

  while (true) {
    const res = await fetch(
      `${baseUrl}/projects/${encodeURIComponent(projectId)}/repository/tree?path=${encodeURIComponent(subPath)}&ref=${encodeURIComponent(ref)}&per_page=${perPage}&page=${page}`,
      { headers }
    );
    if (!res.ok) break;
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;

    for (const item of items) {
      if (item.type === 'blob' && POLICY_FILE_EXTENSIONS.some(ext => item.name.endsWith(ext))) {
        const contentRes = await fetch(
          `${baseUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(item.path)}?ref=${encodeURIComponent(ref)}`,
          { headers }
        );
        if (contentRes.ok) {
          const contentData = await contentRes.json();
          files.push({
            path: item.path,
            content: Buffer.from(contentData.content, 'base64').toString('utf8'),
            sha: contentData.blob_id || contentData.commit_id,
          });
        }
      }
    }

    if (items.length < perPage) break;
    page++;
  }

  return files;
}

function extractGitHubRepo(url) {
  const m = url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!m) throw new Error(`Invalid GitHub URL: ${url}`);
  return m[1];
}

function extractGitLabProjectId(url) {
  const m = url.match(/gitlab(?:\.com|\.[^/]+)?[/:](.+?)(?:\.git)?(?:\/.*)?$/);
  if (!m) throw new Error(`Invalid GitLab URL: ${url}`);
  return encodeURIComponent(m[1]);
}

// ── Policy Enrichment ─────────────────────────────────────────────────────────

function enrichPolicy(policy, sourcePath, action, syncId) {
  const now = new Date().toISOString();
  return {
    ...policy,
    _gitops: {
      sourcePath,
      lastSyncedAt: now,
      lastSyncedBy: 'gitops',
      syncId,
      version: '1.0',
      status: 'synced',
    },
    createdAt: policy.createdAt || now,
    updatedAt: now,
    status: policy.status || 'published',
  };
}

function incrementVersion(v) {
  if (!v) return '1.1';
  const parts = String(v).split('.');
  parts[parts.length - 1] = parseInt(parts[parts.length - 1]) + 1;
  return parts.join('.');
}

// ── PR Workflow ───────────────────────────────────────────────────────────────

/**
 * Simulate a PR merge event: syncs the target branch policies.
 * @param {object} opts
 * @param {string} opts.prNumber      PR number
 * @param {string} opts.action         opened | closed | merged | synchronized
 * @param {string} opts.branch         Source branch
 * @param {string} opts.targetBranch   Target branch (default: main)
 * @param {object} opts.author         { name, email, login }
 * @param {string} opts.commitSha      Merge commit SHA
 * @param {string} opts.message        Merge commit message
 */
export async function handlePRLifecycle({
  prNumber, action, branch, targetBranch = 'main', author, commitSha, message
}) {
  const event = {
    type: 'pr',
    prNumber,
    action,
    branch,
    targetBranch,
    author: author?.login || author?.name || 'unknown',
    commitSha,
    message,
    timestamp: new Date().toISOString(),
  };

  // Only sync on merge to target branch
  if (action === 'closed' && targetBranch === _config?.branch) {
    return await syncFromGit({ branch: targetBranch, commitSha });
  }

  // On PR open/sync: dry-run to preview changes
  if (['opened', 'synchronized', 'reopened'].includes(action) && targetBranch === _config?.branch) {
    return await syncFromGit({ dryRun: true, branch: targetBranch });
  }

  return { ok: true, skipped: true, reason: `Action '${action}' does not trigger sync` };
}

// ── Rollback ──────────────────────────────────────────────────────────────────

/**
 * Rollback a policy to a previous Git commit.
 * @param {string} policyId
 * @param {string} [opts.commitSha]  Git commit SHA to rollback to (default: previous commit)
 * @returns {Promise<RollbackResult>}
 */
export async function rollbackPolicy(policyId, { commitSha } = {}) {
  if (_syncStatus === 'syncing') {
    return { ok: false, error: 'Sync in progress — cannot rollback' };
  }

  const store = _gitopsStores?.policies;
  const policy = store?.get(policyId);
  if (!policy) return { ok: false, error: `Policy '${policyId}' not found` };
  if (!policy._gitops?.sourcePath) {
    return { ok: false, error: 'Policy is not GitOps-managed — no rollback available' };
  }

  // In production: git show <sha>:<path> to get file at specific commit
  // In dry-run: return error asking to configure repoUrl
  if (_config?.dryRun || !_config?.repoUrl) {
    // Development: just archive the current policy
    const archived = {
      ...policy,
      status: 'archived',
      _gitops: {
        ...policy._gitops,
        rollbackAt: new Date().toISOString(),
        rollbackReason: commitSha ? `rollback to ${commitSha}` : 'manual rollback',
      },
    };
    store.set(policyId, archived);
    return { ok: true, policyId, action: 'archived', previousVersion: policy.version };
  }

  // Production: fetch specific commit
  try {
    const filePath = policy._gitops.sourcePath;
    const { repoUrl, gitToken, gitProvider, branch } = _config;

    let content;
    if (gitProvider === 'github') {
      const repo = extractGitHubRepo(repoUrl);
      const targetSha = commitSha || 'HEAD~1';
      const headers = { 'Accept': 'application/vnd.github.v3+json' };
      if (gitToken) headers['Authorization'] = `token ${gitToken}`;
      const res = await fetch(
        `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${targetSha}`,
        { headers }
      );
      if (!res.ok) throw new Error(`GitHub: ${res.status}`);
      const data = await res.json();
      content = Buffer.from(data.content, 'base64').toString('utf8');
    } else {
      return { ok: false, error: 'Rollback not yet implemented for GitLab' };
    }

    const pf = new PolicyFile({ path: filePath, content, branch });
    const { valid, errors } = pf.validate();
    if (!valid) return { ok: false, error: `Policy invalid at rollback target: ${errors.join(', ')}` };

    const rollbackPolicyData = {
      ...pf.parse().data,
      _gitops: {
        ...policy._gitops,
        lastSyncedAt: new Date().toISOString(),
        lastSyncedBy: 'gitops-rollback',
        commitSha: commitSha || 'HEAD~1',
        version: incrementVersion(policy._gitops?.version),
      },
      updatedAt: new Date().toISOString(),
    };

    store.set(policyId, rollbackPolicyData);

    return {
      ok: true,
      policyId,
      action: 'restored',
      previousVersion: policy.version,
      restoredTo: rollbackPolicyData.version,
      commitSha: commitSha || 'HEAD~1',
    };
  } catch (err) {
    return { ok: false, error: `Rollback failed: ${err.message}` };
  }
}

// ── Branch Management ──────────────────────────────────────────────────────────

/**
 * List all branches in the repository.
 * @returns {Promise<Branch[]>}
 */
export async function listBranches() {
  if (!_config?.repoUrl) return [];
  if (_config.gitProvider === 'github') {
    const repo = extractGitHubRepo(_config.repoUrl);
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (_config.gitToken) headers['Authorization'] = `token ${_config.gitToken}`;
    const res = await fetch(`https://api.github.com/repos/${repo}/branches`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(b => ({
      name: b.name,
      protected: b.protected,
      lastCommit: b.commit.sha,
    }));
  }
  return [];
}

/**
 * Create a feature branch from the target branch.
 * @param {string} name         Branch name (e.g. "policy/finance/spending-v2")
 * @param {string} [fromBranch]  Source branch (default: main)
 */
export async function createBranch(name, fromBranch = 'main') {
  if (!_config?.repoUrl) {
    return { ok: false, error: 'GitOps not configured' };
  }
  if (_config.gitProvider === 'github') {
    const repo = extractGitHubRepo(_config.repoUrl);
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    if (_config.gitToken) headers['Authorization'] = `token ${_config.gitToken}`;

    // Get SHA of source branch
    const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${fromBranch}`, { headers });
    if (!refRes.ok) return { ok: false, error: `Failed to get ref for ${fromBranch}` };
    const refData = await refRes.json();
    const sha = refData.object.sha;

    const createRes = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: `refs/heads/${name}`, sha }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      return { ok: false, error: err.message || createRes.status };
    }
    return { ok: true, branch: name, from: fromBranch };
  }
  return { ok: false, error: 'Branch creation only supported for GitHub currently' };
}

/**
 * Set branch protection rules.
 * @param {string} branch
 * @param {object} rules  { requireReviews, requireCI, requiredApprovals, dismissStaleReviews }
 */
export function setBranchProtection(branch, rules = {}) {
  _branchProtections.set(branch, {
    requireReviews: rules.requireReviews ?? true,
    requireCI: rules.requireCI ?? true,
    requiredApprovals: rules.requiredApprovals ?? 1,
    dismissStaleReviews: rules.dismissStaleReviews ?? true,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true, branch, protection: _branchProtections.get(branch) };
}

// ── Status & History ───────────────────────────────────────────────────────────

export function getSyncStatus() {
  return {
    status: _syncStatus,
    lastSyncAt: _lastSyncAt,
    lastError: _lastError,
    config: _config ? {
      repoUrl: _config.repoUrl,
      branch: _config.branch,
      subPath: _config.subPath,
      autoSync: _config.autoSync,
      gitProvider: _config.gitProvider,
    } : null,
  };
}

export function getSyncHistory(limit = 100) {
  return _syncHistory.slice(-limit);
}

export function getBranchProtections(branch) {
  if (branch) return _branchProtections.get(branch) || null;
  return Object.fromEntries(_branchProtections.entries());
}

function recordSyncEvent(event) {
  const entry = { id: event.syncId, ...event };
  _syncHistory.push(entry);
  if (_syncHistory.length > 100) _syncHistory.shift();
}

// ── Default export ────────────────────────────────────────────────────────────

export default {
  configureGitOps,
  verifyWebhookSignature,
  syncFromGit,
  handlePRLifecycle,
  rollbackPolicy,
  listBranches,
  createBranch,
  setBranchProtection,
  getSyncStatus,
  getSyncHistory,
  getBranchProtections,
};
