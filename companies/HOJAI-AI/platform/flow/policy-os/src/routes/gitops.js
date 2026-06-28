/**
 * PolicyOS — GitOps Policy Routes (Phase P1: GitOps Policies)
 *
 * Endpoints:
 *  - GET    /api/gitops/status           — sync status + config
 *  - POST   /api/gitops/config          — configure repo URL, branch, token
 *  - POST   /api/gitops/sync            — trigger full sync from Git
 *  - GET    /api/gitops/diff            — dry-run: preview what would change
 *  - POST   /api/gitops/rollback/:id    — rollback policy to previous Git commit
 *  - GET    /api/gitops/history         — sync history
 *  - GET    /api/gitops/branches        — list repository branches
 *  - POST   /api/gitops/branches        — create feature branch
 *  - GET    /api/gitops/branches/:name/protection — get branch protection
 *  - PUT    /api/gitops/branches/:name/protection — set branch protection
 *  - POST   /api/gitops/webhook         — receive Git webhook (push, PR)
 *  - GET    /api/gitops/policies       — list GitOps-managed policies
 */

import {
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
} from '../services/gitops.js';

export function registerGitOpsRoutes(app, {
  policies,
  relationships,
  conditionTemplates,
  attributePolicies,
  aiModels,
  constitutions,
  agentRegistry,
  memoryPolicies,
  twinPolicies,
  automations,
  customAuth,
  writeLimiter,
}) {

  // Initialize GitOps service with all stores
  configureGitOps({
    policies,
    relationships,
    conditionTemplates,
    attributePolicies,
    aiModels,
    constitutions,
    agentRegistry,
    memoryPolicies,
    twinPolicies,
    automations,
  });

  // ── GET /api/gitops/status ──────────────────────────────────────────────────

  app.get('/api/gitops/status', customAuth, (req, res) => {
    const status = getSyncStatus();
    res.json({
      ...status,
      configured: !!status.config?.repoUrl,
      ready: status.status !== 'disabled',
    });
  });

  // ── POST /api/gitops/config ──────────────────────────────────────────────────

  app.post('/api/gitops/config', customAuth, writeLimiter, (req, res) => {
    const {
      repoUrl, branch, subPath, webhookSecret,
      autoSync, syncInterval, gitToken, gitProvider, dryRun,
    } = req.body || {};

    const result = configureGitOps({
      policies,
      relationships,
      conditionTemplates,
      attributePolicies,
      aiModels,
      constitutions,
      agentRegistry,
      memoryPolicies,
      twinPolicies,
      automations,
      repoUrl, branch, subPath, webhookSecret,
      autoSync, syncInterval, gitToken, gitProvider, dryRun,
    });

    res.json({
      ok: true,
      ...result,
      message: result.status === 'disabled'
        ? 'GitOps disabled — no repoUrl configured'
        : `GitOps configured for ${result.config?.repoUrl || 'local filesystem'}`,
    });
  });

  // ── POST /api/gitops/sync ───────────────────────────────────────────────────

  app.post('/api/gitops/sync', customAuth, writeLimiter, async (req, res) => {
    const { dryRun, branch, commitSha } = req.body || {};
    try {
      const result = await syncFromGit({ dryRun, branch, commitSha });
      if (!result.ok && !result.dryRun) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /api/gitops/diff ───────────────────────────────────────────────────

  app.get('/api/gitops/diff', customAuth, async (req, res) => {
    const { branch } = req.query;
    try {
      const result = await syncFromGit({ dryRun: true, branch });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /api/gitops/rollback/:id ─────────────────────────────────────────────

  app.post('/api/gitops/rollback/:id', customAuth, writeLimiter, async (req, res) => {
    const { id } = req.params;
    const { commitSha } = req.body || {};
    try {
      const result = await rollbackPolicy(id, { commitSha });
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /api/gitops/history ─────────────────────────────────────────────────

  app.get('/api/gitops/history', customAuth, (req, res) => {
    const { limit = 100 } = req.query;
    const history = getSyncHistory(parseInt(limit));
    res.json({ count: history.length, events: history });
  });

  // ── GET /api/gitops/branches ────────────────────────────────────────────────

  app.get('/api/gitops/branches', customAuth, async (req, res) => {
    try {
      const branches = await listBranches();
      const protections = getBranchProtections();
      res.json({
        count: branches.length,
        branches: branches.map(b => ({
          ...b,
          protection: protections[b.name] || null,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/gitops/branches ────────────────────────────────────────────────

  app.post('/api/gitops/branches', customAuth, writeLimiter, async (req, res) => {
    const { name, fromBranch = 'main' } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const result = await createBranch(name, fromBranch);
      if (!result.ok) return res.status(400).json(result);
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/gitops/branches/:name/protection ───────────────────────────────

  app.get('/api/gitops/branches/:name/protection', customAuth, (req, res) => {
    const protection = getBranchProtections(req.params.name);
    if (!protection) return res.status(404).json({ error: 'No protection rules set' });
    res.json({ branch: req.params.name, protection });
  });

  // ── PUT /api/gitops/branches/:name/protection ──────────────────────────────

  app.put('/api/gitops/branches/:name/protection', customAuth, writeLimiter, (req, res) => {
    const rules = req.body || {};
    const result = setBranchProtection(req.params.name, rules);
    res.json(result);
  });

  // ── POST /api/gitops/webhook ───────────────────────────────────────────────
  // Receives GitHub/GitLab webhook events and triggers sync accordingly.
  // Verifies HMAC signature if webhookSecret is configured.
  // Events handled:
  //   GitHub: push, pull_request
  //   GitLab: push, merge_request

  app.post('/api/gitops/webhook', async (req, res) => {
    // Get raw body for HMAC verification
    const rawBody = req.rawBody || JSON.stringify(req.body) || '';

    // Verify webhook signature
    const gitHubSig = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
    const gitLabSig = req.headers['x-gitlab-token'];
    const signature = gitHubSig || gitLabSig;

    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const event = req.headers['x-github-event'] || req.headers['x-gitlab-event'] || 'unknown';

    try {
      if (event === 'push') {
        const branch = extractPushBranch(req.headers, req.body);
        const commitSha = req.body?.after || req.body?.checkout_sha;
        const result = await syncFromGit({ branch, commitSha });
        return res.json({ ok: true, event: 'push', branch, ...result });
      }

      if (event === 'pull_request' || event === 'merge_request') {
        const pr = req.body?.pull_request || req.body?.object_attributes;
        if (!pr) return res.json({ ok: true, skipped: true });
        const result = await handlePRLifecycle({
          prNumber: pr.number,
          action: pr.action || (pr.merged ? 'closed' : 'opened'),
          branch: pr.head?.ref || pr.source_branch,
          targetBranch: pr.base?.ref || pr.target_branch,
          author: { login: pr.user?.login, name: pr.author?.name },
          commitSha: pr.merge_commit_sha || pr.last_commit?.id,
          message: pr.title,
        });
        return res.json({ ok: true, event, ...result });
      }

      if (event === 'ping') {
        return res.json({ ok: true, message: 'Webhook connected', event: 'ping' });
      }

      return res.json({ ok: true, skipped: true, event });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /api/gitops/policies ────────────────────────────────────────────────
  // List all policies that are GitOps-managed (have _gitops metadata)

  app.get('/api/gitops/policies', customAuth, (req, res) => {
    const { branch, source } = req.query;
    const gitopsPolicies = [];
    for (const [id, policy] of policies.entries()) {
      if (policy._gitops) {
        if (branch && policy._gitops.branch !== branch) continue;
        if (source && policy._gitops.lastSyncedBy !== source) continue;
        gitopsPolicies.push({
          policyId: id,
          name: policy.name,
          version: policy.version,
          sourcePath: policy._gitops.sourcePath,
          branch: policy._gitops.branch || _config?.branch,
          lastSyncedAt: policy._gitops.lastSyncedAt,
          lastSyncedBy: policy._gitops.lastSyncedBy,
          status: policy._gitops.status,
          syncId: policy._gitops.syncId,
        });
      }
    }
    gitopsPolicies.sort((a, b) =>
      new Date(b.lastSyncedAt || 0) - new Date(a.lastSyncedAt || 0)
    );
    res.json({
      count: gitopsPolicies.length,
      totalPolicies: policies.size,
      policies: gitopsPolicies,
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractPushBranch(headers, body) {
  // GitHub
  if (body?.ref) return body.ref.replace('refs/heads/', '');
  if (headers['x-github-event'] === 'push') return headers['x-github-ref'];
  // GitLab
  if (body?.ref) return body.ref.replace('refs/heads/', '');
  if (body?.project?.default_branch) return body.project.default_branch;
  return 'main';
}
