import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('dataConnectors');
/**
 * Salar OS - Data Connectors
 *
 * Connect to real data sources:
 * - CorpPerks HRMS
 * - MemoryOS
 * - GitHub
 * - Jira
 * - LMS
 * - Calendar
 */

import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';

const router = Router();

// ============================================================================
// CORPPERKS CONNECTOR
// ============================================================================

/**
 * Sync CorpPerks employees to Human Twins
 * POST /corpperks/sync
 */
router.post('/corpperks/sync', async (req: Request, res: Response) => {
  try {
    const CORPPERKS_URL = process.env.CORPPERKS_URL || 'http://localhost:4006';
    const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

    // Fetch employees from CorpPerks
    const response = await fetch(`${CORPPERKS_URL}/api/employees`, {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`CorpPerks API error: ${response.status}`);
    }

    const data = await response.json();
    const employees = data.data || data.employees || [];

    // Import models
    const { HumanTwin } = await import('./hybridTwin.js');
    const { CapabilityMapping } = await import('./capabilityRegistry.js');

    const result = {
      success: 0,
      skipped: 0,
      failed: 0,
    };

    for (const emp of employees) {
      try {
        // Check if already exists
        const existing = await HumanTwin.findOne({ corpId: emp.corpId });
        if (existing) {
          result.skipped++;
          continue;
        }

        // Create Human Twin
        const twin = new HumanTwin({
          twinId: `HU-${(emp.corpId || '').split('-').pop() || randomBytes(4).toString('hex')}`,
          corpId: emp.corpId,
          name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          employment: {
            role: emp.designation || emp.role || 'Employee',
            department: emp.department || 'General',
            managerId: emp.managerId,
            tenure: emp.tenure || 0,
          },
          skills: (emp.skills || []).map((s: any) => ({
            capabilityId: s.skillId,
            name: s.name || s,
            level: s.level || 'INTERMEDIATE',
            confidence: 0.5,
          })),
          aiCollaboration: {
            comfortLevel: 0.5,
            trustInAI: 0.5,
            preferredTasks: [],
            delegatedTasks: [],
          },
          capacity: {
            hoursPerWeek: emp.hoursPerWeek || 40,
            availableHours: emp.availableHours || 40,
            utilizationRate: 0,
            burnoutRisk: 0,
          },
          health: {
            status: emp.status === 'ACTIVE' ? 'ACTIVE' : 'ACTIVE',
            healthScore: 1.0,
          },
        });

        await twin.save();
        result.success++;

        // Create skill mappings
        for (const skill of emp.skills || []) {
          const mapping = new CapabilityMapping({
            mappingId: `MAP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            capabilityId: skill.skillId || skill.name || skill,
            entityType: 'HUMAN',
            entityId: emp.corpId,
            level: skill.level || 'INTERMEDIATE',
            metrics: {
              confidence: 0.5,
              evidenceCount: 0,
              lastVerified: new Date(),
            },
            status: 'ACTIVE',
          });
          await mapping.save();
        }
      } catch (error) {
        result.failed++;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('CorpPerks sync error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

/**
 * Sync CorpPerks performance reviews
 * POST /corpperks/performance
 */
router.post('/corpperks/performance', async (req: Request, res: Response) => {
  try {
    const CORPPERKS_URL = process.env.CORPPERKS_URL || 'http://localhost:4006';
    const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

    const response = await fetch(`${CORPPERKS_URL}/api/performance-reviews`, {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`CorpPerks API error: ${response.status}`);
    }

    const data = await response.json();
    const reviews = data.data || [];

    const { HumanTwin } = await import('./hybridTwin.js');

    const result = {
      success: 0,
      failed: 0,
    };

    for (const review of reviews) {
      try {
        await HumanTwin.updateOne(
          { corpId: review.employeeId },
          {
            $set: {
              'performance.totalTasks': review.totalTasks || review.performanceScore * 10,
              'performance.successfulTasks': Math.floor((review.performanceScore || 0.7) * (review.totalTasks || 10)),
            },
          }
        );
        result.success++;
      } catch (error) {
        result.failed++;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// MEMORYOS CONNECTOR
// ============================================================================

/**
 * Sync MemoryOS events to Vector Store
 * POST /memoryos/sync
 */
router.post('/memoryos/sync', async (req: Request, res: Response) => {
  try {
    const MEMORYOS_URL = process.env.MEMORYOS_URL || 'http://localhost:4520';
    const TENANT_ID = req.headers['x-tenant-id'] || 'default';

    // Fetch memories from MemoryOS
    const response = await fetch(`${MEMORYOS_URL}/memory`, {
      headers: {
        'x-tenant-id': TENANT_ID,
      },
    });

    if (!response.ok) {
      throw new Error(`MemoryOS API error: ${response.status}`);
    }

    const data = await response.json();
    const memories = data.data?.items || [];

    const { VectorDocument } = await import('./vectorStore.js');

    const result = {
      success: 0,
      failed: 0,
    };

    for (const memory of memories) {
      try {
        const doc = new VectorDocument({
          documentId: `DOC-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`,
          collectionId: 'memory',
          content: memory.content,
          embedding: [],
          metadata: {
            source: 'memoryos',
            sourceId: memory.id,
            corpId: memory.userId,
            entityType: 'HUMAN',
            tags: memory.tags,
          },
          status: 'INDEXED',
        });
        await doc.save();
        result.success++;
      } catch (error) {
        result.failed++;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// GITHUB CONNECTOR
// ============================================================================

/**
 * Sync GitHub activity to Evidence
 * POST /github/sync
 */
router.post('/github/sync', async (req: Request, res: Response) => {
  try {
    const { GITHUB_TOKEN } = process.env;

    if (!GITHUB_TOKEN) {
      return res.status(503).json({
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'GitHub token not configured' },
      });
    }

    const { owner, repo, corpId } = req.body;

    if (!owner || !repo || !corpId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'owner, repo, corpId required' },
      });
    }

    // Fetch commits
    const commitsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!commitsRes.ok) {
      throw new Error(`GitHub API error: ${commitsRes.status}`);
    }

    const commits = await commitsRes.json();

    // Import models
    const { AgentTwin } = await import('./agentTwin.js');
    const { CapabilityMapping } = await import('./capabilityRegistry.js');

    const result = {
      commits: commits.length,
      skills: new Set(),
    };

    for (const commit of commits.slice(0, 50)) {
      // Extract language from repo
      const lang = repo.split('-').pop() || 'code';

      // Add skill evidence
      result.skills.add(lang);

      await CapabilityMapping.updateOne(
        {
          entityId: corpId,
          capabilityId: { $regex: new RegExp(lang, 'i') },
        },
        {
          $push: {
            evidence: {
              type: 'PROJECT',
              sourceId: commit.sha,
              sourceName: `GitHub: ${commit.sha.substring(0, 7)}`,
              weight: 0.8,
              verifiedAt: new Date(commit.commit.author.date),
            },
          },
          $inc: { 'metrics.evidenceCount': 1 },
        }
      );
    }

    res.json({
      success: true,
      data: {
        synced: result.commits,
        skills: Array.from(result.skills),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// LMS CONNECTOR
// ============================================================================

/**
 * Sync LMS completions to Certifications
 * POST /lms/sync
 */
router.post('/lms/sync', async (req: Request, res: Response) => {
  try {
    const { completions } = req.body;

    if (!completions || !Array.isArray(completions)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'completions array required' },
      });
    }

    const { CapabilityMapping } = await import('./capabilityRegistry.js');

    const result = {
      success: 0,
      failed: 0,
    };

    for (const completion of completions) {
      try {
        await CapabilityMapping.updateOne(
          {
            entityId: completion.corpId,
            capabilityId: completion.courseId,
          },
          {
            $set: {
              'evidence': {
                type: 'CERTIFICATION',
                sourceId: completion.completionId,
                sourceName: completion.courseName,
                weight: 0.9,
                verifiedAt: new Date(completion.completedAt),
              },
              'metrics.confidence': 0.9,
            },
          },
          { upsert: true }
        );
        result.success++;
      } catch (error) {
        result.failed++;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// CALENDAR CONNECTOR
// ============================================================================

/**
 * Sync calendar to Capacity
 * POST /calendar/sync
 */
router.post('/calendar/sync', async (req: Request, res: Response) => {
  try {
    const { events, corpId } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'events array required' },
      });
    }

    const { HumanTwin } = await import('./hybridTwin.js');

    // Calculate busy hours
    const busyHours = events.reduce((sum, event) => {
      const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / 3600000;
      return sum + duration;
    }, 0);

    // Update capacity
    await HumanTwin.updateOne(
      { corpId },
      {
        $set: {
          'capacity.availableHours': Math.max(0, 40 - busyHours),
          'capacity.utilizationRate': busyHours / 40,
        },
      }
    );

    res.json({
      success: true,
      data: {
        synced: events.length,
        busyHours,
        availableHours: 40 - busyHours,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// JIRA CONNECTOR
// ============================================================================

/**
 * Sync Jira tasks to Performance
 * POST /jira/sync
 */
router.post('/jira/sync', async (req: Request, res: Response) => {
  try {
    const { JIRA_URL, JIRA_TOKEN, JIRA_EMAIL } = process.env;

    if (!JIRA_URL || !JIRA_TOKEN) {
      return res.status(503).json({
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'Jira not configured' },
      });
    }

    const { tasks, corpId } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tasks array required' },
      });
    }

    const { HumanTwin } = await import('./hybridTwin.js');

    const result = {
      success: 0,
      failed: 0,
    };

    for (const task of tasks) {
      try {
        // Update performance
        await HumanTwin.updateOne(
          { corpId },
          {
            $inc: {
              'performance.totalTasks': 1,
              'performance.successfulTasks': task.status === 'DONE' ? 1 : 0,
            },
          }
        );
        result.success++;
      } catch (error) {
        result.failed++;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export { router as dataConnectorsRouter };
export default router;
