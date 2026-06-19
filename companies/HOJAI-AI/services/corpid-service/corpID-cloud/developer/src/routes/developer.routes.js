/**
 * CorpID Cloud - Developer Identity Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../shared/utils/logger.js';
import {
  developers,
  projects,
  developerApps,
  developerKeys,
  developerUsage,
  DEVELOPER_PLANS,
  createDeveloper,
  getDeveloper,
  createProject,
  createApp,
  createDeveloperKey,
  getDeveloperProjects,
  getProjectApps,
  getProjectKeys,
  getUsageStats,
  upgradePlan
} from '../models/developer.model.js';

const router = express.Router();

/**
 * Get developer plans
 * GET /api/developer/plans
 */
router.get('/plans',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      plans: DEVELOPER_PLANS
    });
  })
);

/**
 * Get my developer profile
 * GET /api/developer/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    let developer = getDeveloper(req.user.id);
    if (!developer) {
      developer = createDeveloper(req.user.id, {
        name: req.user.name || req.user.email
      });
    }
    res.json({ success: true, developer });
  })
);

/**
 * Update developer profile
 * PUT /api/developer/me
 */
router.put('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const developer = getDeveloper(req.user.id);
    if (!developer) {
      throw new AppError('Developer profile not found', 404, 'DEVELOPER_NOT_FOUND');
    }

    developer.profile = { ...developer.profile, ...req.body.profile };
    developer.updatedAt = new Date().toISOString();
    developers.set(req.user.id, developer);

    dataAudit('developer.profile_updated', req, 'developer', developer.id);

    res.json({ success: true, developer });
  })
);

/**
 * Upgrade plan
 * POST /api/developer/me/upgrade
 */
router.post('/me/upgrade',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { plan } = req.body;
    if (!plan) {
      throw new AppError('Plan is required', 400, 'VALIDATION_ERROR');
    }

    const developer = upgradePlan(req.user.id, plan);
    if (!developer) {
      throw new AppError('Invalid plan or developer not found', 400, 'INVALID_PLAN');
    }

    dataAudit('developer.plan_upgraded', req, 'developer', developer.id, { plan });

    res.json({ success: true, message: `Upgraded to ${plan} plan`, developer });
  })
);

// ============ PROJECTS ============

/**
 * List my projects
 * GET /api/developer/projects
 */
router.get('/projects',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const projectList = getDeveloperProjects(req.user.id);
    res.json({ success: true, count: projectList.length, projects: projectList });
  })
);

/**
 * Create project
 * POST /api/developer/projects
 */
router.post('/projects',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { name, description, homepage, repository, type, visibility } = req.body;
    if (!name) {
      throw new AppError('Project name is required', 400, 'VALIDATION_ERROR');
    }

    const project = createProject(req.user.id, {
      name, description, homepage, repository, type, visibility
    });

    dataAudit('developer.project_created', req, 'developer_project', project.id);

    res.status(201).json({ success: true, project });
  })
);

/**
 * Get project
 * GET /api/developer/projects/:id
 */
router.get('/projects/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    if (project.ownerId !== req.user.id && !project.members.some(m => m.userId === req.user.id)) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const apps = getProjectApps(project.id);
    const keys = getProjectKeys(project.id);

    res.json({ success: true, project, apps, keys });
  })
);

// ============ APPS ============

/**
 * Create app
 * POST /api/developer/projects/:projectId/apps
 */
router.post('/projects/:projectId/apps',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const project = projects.get(req.params.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    if (project.ownerId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const { name, type, redirectUris, scopes } = req.body;
    if (!name) {
      throw new AppError('App name is required', 400, 'VALIDATION_ERROR');
    }

    const app = createApp(req.user.id, req.params.projectId, {
      name, type, redirectUris, scopes
    });

    dataAudit('developer.app_created', req, 'developer_app', app.id);

    res.status(201).json({
      success: true,
      message: 'App created. Save clientSecret securely - it will not be shown again.',
      app
    });
  })
);

// ============ KEYS ============

/**
 * Create developer key
 * POST /api/developer/projects/:projectId/keys
 */
router.post('/projects/:projectId/keys',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const project = projects.get(req.params.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    if (project.ownerId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const { name, environment, scopes, rateLimit } = req.body;
    if (!name) {
      throw new AppError('Key name is required', 400, 'VALIDATION_ERROR');
    }

    const key = createDeveloperKey(req.user.id, req.params.projectId, {
      name, environment, scopes, rateLimit
    });

    dataAudit('developer.key_created', req, 'developer_key', key.id);

    res.status(201).json({
      success: true,
      message: 'Key created. Save the key securely - it will not be shown again.',
      key: {
        id: key.id,
        name: key.name,
        key: key.key,
        keyPrefix: key.keyPrefix,
        environment: key.environment,
        scopes: key.scopes
      }
    });
  })
);

/**
 * List project keys
 * GET /api/developer/projects/:projectId/keys
 */
router.get('/projects/:projectId/keys',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const project = projects.get(req.params.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    if (project.ownerId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const keys = getProjectKeys(req.params.projectId)
      .filter(k => k.status === 'active')
      .map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix + '...',
        environment: k.environment,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt,
        usageCount: k.usageCount,
        createdAt: k.createdAt
      }));

    res.json({ success: true, count: keys.length, keys });
  })
);

/**
 * Revoke developer key
 * DELETE /api/developer/keys/:id
 */
router.delete('/keys/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const key = developerKeys.get(req.params.id);
    if (!key) {
      throw new AppError('Key not found', 404, 'KEY_NOT_FOUND');
    }
    if (key.ownerId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    key.status = 'revoked';
    key.revokedAt = new Date().toISOString();
    developerKeys.set(req.params.id, key);

    dataAudit('developer.key_revoked', req, 'developer_key', req.params.id);

    res.json({ success: true, message: 'Key revoked' });
  })
);

// ============ USAGE & STATS ============

/**
 * Get usage stats
 * GET /api/developer/me/usage
 */
router.get('/me/usage',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const stats = getUsageStats(req.user.id);
    res.json({ success: true, usage: stats });
  })
);

/**
 * Get developer stats (admin)
 * GET /api/developer/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const allDevs = Array.from(developers.values());
    const byPlan = {};

    for (const dev of allDevs) {
      byPlan[dev.plan] = (byPlan[dev.plan] || 0) + 1;
    }

    res.json({
      success: true,
      stats: {
        totalDevelopers: allDevs.length,
        byPlan,
        totalProjects: projects.size,
        totalApps: developerApps.size,
        totalKeys: developerKeys.size,
        activeKeys: Array.from(developerKeys.values()).filter(k => k.status === 'active').length
      }
    });
  })
);

export default router;
