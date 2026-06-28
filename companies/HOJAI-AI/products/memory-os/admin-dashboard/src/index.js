/**
 * MemoryOS Department Admin Dashboard
 *
 * Enterprise memory management and analytics for departments.
 *
 * Port: 4895
 *
 * Features:
 * - Department memory browser
 * - Knowledge graph visualization
 * - Team activity timeline
 * - Compliance reports
 * - Memory analytics
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.MEMORY_ADMIN_PORT || 4895;

// In-memory stores (in production, these connect to MemoryOS services)
const departments = new Map();
const teams = new Map();
const projects = new Map();
const memories = new Map();
const activities = new Map();
const complianceReports = new Map();

// Allowed departments
const ALLOWED_DEPARTMENTS = [
  'engineering', 'sales', 'marketing', 'finance',
  'hr', 'operations', 'legal', 'executive', 'support', 'product'
];

// Memory types by category
const MEMORY_TYPES_BY_DEPT = {
  engineering: ['engineering_decision', 'incident_postmortem', 'architecture', 'code'],
  sales: ['sales_win', 'sales_loss', 'lead', 'opportunity'],
  marketing: ['marketing_campaign', 'content', 'analytics'],
  finance: ['finance_approval', 'budget', 'expense'],
  hr: ['hr_policy', 'onboarding', 'performance_review'],
  operations: ['operations_sop', 'incident', 'process'],
  legal: ['legal_review', 'contract', 'compliance'],
  executive: ['strategy_change', 'board_meeting', 'kpi'],
  support: ['ticket_resolution', 'customer_feedback'],
  product: ['feature_request', 'roadmap', 'user_feedback']
};

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Helper functions
function nowIso() { return new Date().toISOString(); }
function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) {
  res.status(status).json({ success: false, error: code, message });
}

// =============================================================================
// HEALTH & INFO
// =============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'memory-admin-dashboard',
    port: PORT,
    version: '1.0.0',
    timestamp: nowIso()
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'MemoryOS Department Admin Dashboard',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      departments: '/api/departments',
      teams: '/api/teams',
      projects: '/api/projects',
      memories: '/api/memories',
      activities: '/api/activities',
      compliance: '/api/compliance',
      analytics: '/api/analytics',
      graph: '/api/graph'
    }
  });
});

// =============================================================================
// DEPARTMENTS
// =============================================================================

// List all departments
app.get('/api/departments', (req, res) => {
  const { include_stats } = req.query;

  const deptList = ALLOWED_DEPARTMENTS.map(deptId => {
    const dept = departments.get(deptId) || {
      id: deptId,
      name: deptId.charAt(0).toUpperCase() + deptId.slice(1),
      description: `${deptId} department`,
      headCount: Math.floor(Math.random() * 50) + 5,
      memoryCount: memoriesArray().filter(m => m.department === deptId).length,
      createdAt: nowIso()
    };

    if (include_stats === 'true') {
      dept.stats = getDepartmentStats(deptId);
    }

    return dept;
  });

  ok(res, { departments: deptList, count: deptList.length });
});

// Get single department
app.get('/api/departments/:deptId', (req, res) => {
  const { deptId } = req.params;

  if (!ALLOWED_DEPARTMENTS.includes(deptId)) {
    return fail(res, 'INVALID_DEPARTMENT', `Department must be one of: ${ALLOWED_DEPARTMENTS.join(', ')}`, 400);
  }

  const dept = departments.get(deptId) || {
    id: deptId,
    name: deptId.charAt(0).toUpperCase() + deptId.slice(1),
    description: `${deptId} department`,
    headCount: Math.floor(Math.random() * 50) + 5,
    memoryCount: memoriesArray().filter(m => m.department === deptId).length,
    createdAt: nowIso()
  };

  dept.stats = getDepartmentStats(deptId);
  dept.memoryTypes = MEMORY_TYPES_BY_DEPT[deptId] || [];
  dept.recentMemories = getDepartmentMemories(deptId).slice(0, 10);
  dept.topContributors = getTopContributors(deptId).slice(0, 5);

  ok(res, { department: dept });
});

// Update department
app.put('/api/departments/:deptId', (req, res) => {
  const { deptId } = req.params;
  const { name, description, headCount } = req.body;

  if (!ALLOWED_DEPARTMENTS.includes(deptId)) {
    return fail(res, 'INVALID_DEPARTMENT', `Department must be one of: ${ALLOWED_DEPARTMENTS.join(', ')}`, 400);
  }

  const dept = departments.get(deptId) || { id: deptId, createdAt: nowIso() };
  if (name) dept.name = name;
  if (description) dept.description = description;
  if (typeof headCount === 'number') dept.headCount = headCount;
  dept.updatedAt = nowIso();

  departments.set(deptId, dept);
  ok(res, { department: dept });
});

// =============================================================================
// TEAMS
// =============================================================================

// List teams
app.get('/api/teams', (req, res) => {
  const { department, limit = 50 } = req.query;

  let teamList = Array.from(teams.values());
  if (department) {
    teamList = teamList.filter(t => t.department === department);
  }

  teamList = teamList.slice(0, parseInt(limit));

  ok(res, { teams: teamList, count: teamList.length });
});

// Get team
app.get('/api/teams/:teamId', (req, res) => {
  const { teamId } = req.params;
  const team = teams.get(teamId);

  if (!team) {
    // Return mock data for demo
    const mockTeam = {
      id: teamId,
      name: `Team ${teamId}`,
      department: 'engineering',
      members: ['user_1', 'user_2', 'user_3'],
      memoryCount: Math.floor(Math.random() * 100),
      createdAt: nowIso()
    };
    teams.set(teamId, mockTeam);
    return ok(res, { team: mockTeam });
  }

  team.recentActivity = getTeamActivity(teamId).slice(0, 10);
  team.memberStats = team.members?.map(m => ({
    userId: m,
    memoryCount: memoriesArray().filter(mem => mem.twinId === m).length,
    lastActivity: nowIso()
  })) || [];

  ok(res, { team });
});

// Create team
app.post('/api/teams', (req, res) => {
  const { name, department, members = [] } = req.body;

  if (!name) return fail(res, 'INVALID_INPUT', 'name required');
  if (!department) return fail(res, 'INVALID_INPUT', 'department required');

  const team = {
    id: uuidv4(),
    name,
    department,
    members,
    memoryCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  teams.set(team.id, team);
  res.status(201).json({ success: true, team });
});

// =============================================================================
// PROJECTS
// =============================================================================

// List projects
app.get('/api/projects', (req, res) => {
  const { department, status, limit = 50 } = req.query;

  let projectList = Array.from(projects.values());
  if (department) projectList = projectList.filter(p => p.department === department);
  if (status) projectList = projectList.filter(p => p.status === status);

  projectList = projectList.slice(0, parseInt(limit));

  ok(res, { projects: projectList, count: projectList.length });
});

// Get project
app.get('/api/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  const project = projects.get(projectId);

  if (!project) {
    const mockProject = {
      id: projectId,
      name: `Project ${projectId}`,
      department: 'engineering',
      status: 'active',
      teamMembers: ['user_1', 'user_2'],
      decisionCount: Math.floor(Math.random() * 20),
      createdAt: nowIso()
    };
    projects.set(projectId, mockProject);
    return ok(res, { project: mockProject });
  }

  project.memories = getProjectMemories(projectId).slice(0, 20);
  project.decisions = getProjectDecisions(projectId);

  ok(res, { project });
});

// =============================================================================
// MEMORIES (Department Browser)
// =============================================================================

// List all memories with filters
app.get('/api/memories', (req, res) => {
  const {
    department, type, team, project,
    twinId, importance, visibility,
    from, to, limit = 50, offset = 0
  } = req.query;

  let memList = memoriesArray();

  // Apply filters
  if (department) memList = memList.filter(m => m.department === department);
  if (type) memList = memList.filter(m => m.type === type);
  if (team) memList = memList.filter(m => m.team === team);
  if (project) memList = memList.filter(m => m.project === project);
  if (twinId) memList = memList.filter(m => m.twinId === twinId);
  if (importance) memList = memList.filter(m => m.importance === importance);
  if (visibility) memList = memList.filter(m => m.visibility === visibility);

  // Pagination
  const total = memList.length;
  memList = memList.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  ok(res, {
    memories: memList,
    count: memList.length,
    total,
    offset: parseInt(offset),
    limit: parseInt(limit)
  });
});

// Get single memory
app.get('/api/memories/:memoryId', (req, res) => {
  const { memoryId } = req.params;
  const memory = memories.get(memoryId);

  if (!memory) {
    const mockMemory = {
      id: memoryId,
      twinId: 'user_demo',
      type: 'engineering_decision',
      content: 'Sample memory content',
      department: 'engineering',
      importance: 'High',
      confidence: 0.85,
      createdAt: nowIso()
    };
    return ok(res, { memory: mockMemory });
  }

  ok(res, { memory });
});

// Create memory
app.post('/api/memories', (req, res) => {
  const {
    twinId, type, content, department, team, project,
    importance = 'Medium', visibility = 'team', tags = [],
    approvers = [], alternatives = [], reason
  } = req.body;

  if (!twinId) return fail(res, 'INVALID_INPUT', 'twinId required');
  if (!content) return fail(res, 'INVALID_INPUT', 'content required');

  const memory = {
    id: uuidv4(),
    twinId,
    type: type || 'knowledge',
    content,
    department: department || null,
    team: team || null,
    project: project || null,
    importance,
    visibility,
    tags,
    approvers,
    alternatives,
    reason: reason || null,
    confidence: 0.5,
    accessCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  memories.set(memory.id, memory);

  // Log activity
  logActivity(twinId, 'memory_created', { memoryId: memory.id, type });

  res.status(201).json({ success: true, memory });
});

// =============================================================================
// ACTIVITIES (Timeline)
// =============================================================================

// Get activities (timeline)
app.get('/api/activities', (req, res) => {
  const { department, team, project, userId, type, limit = 100 } = req.query;

  let activityList = Array.from(activities.values());

  if (department) activityList = activityList.filter(a => a.department === department);
  if (team) activityList = activityList.filter(a => a.team === team);
  if (project) activityList = activityList.filter(a => a.project === project);
  if (userId) activityList = activityList.filter(a => a.userId === userId);
  if (type) activityList = activityList.filter(a => a.type === type);

  // Sort by timestamp descending
  activityList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  activityList = activityList.slice(0, parseInt(limit));

  ok(res, { activities: activityList, count: activityList.length });
});

// Get activity stream (for real-time updates)
app.get('/api/activities/stream', (req, res) => {
  const { department, team } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: nowIso() })}\n\n`);

  // In production, this would push real-time updates
  // For demo, we just keep the connection open
  const interval = setInterval(() => {
    const activity = {
      type: 'heartbeat',
      timestamp: nowIso()
    };
    res.write(`data: ${JSON.stringify(activity)}\n\n`);
  }, 30000);

  req.on('close', () => clearInterval(interval));
});

// =============================================================================
// KNOWLEDGE GRAPH (Visualization)
// =============================================================================

// Get knowledge graph
app.get('/api/graph', (req, res) => {
  const { department, depth = 2, center } = req.query;

  // Build a sample knowledge graph
  const nodes = [];
  const edges = [];

  // Get unique entities from memories
  const entities = new Map();

  memoriesArray()
    .filter(m => !department || m.department === department)
    .forEach(m => {
      if (m.twinId && !entities.has(m.twinId)) {
        entities.set(m.twinId, {
          id: m.twinId,
          type: 'user',
          label: m.twinId,
          department: m.department
        });
      }
      if (m.department && !entities.has(`dept:${m.department}`)) {
        entities.set(`dept:${m.department}`, {
          id: `dept:${m.department}`,
          type: 'department',
          label: m.department
        });
      }
    });

  nodes.push(...entities.values());

  // Create edges between users and their departments
  entities.forEach((entity, id) => {
    if (entity.type === 'user' && entity.department) {
      edges.push({
        from: id,
        to: `dept:${entity.department}`,
        type: 'member_of',
        weight: 1
      });
    }
  });

  ok(res, {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      departments: new Set(nodes.filter(n => n.type === 'department').map(n => n.id)).size
    }
  });
});

// Get graph stats
app.get('/api/graph/stats', (req, res) => {
  const { department } = req.query;

  const memList = memoriesArray().filter(m => !department || m.department === department);

  const stats = {
    totalMemories: memList.length,
    totalEntities: new Set(memList.map(m => m.twinId)).size,
    totalRelationships: memList.filter(m => m.relatedMemories?.length > 0).length,
    avgConfidence: memList.reduce((sum, m) => sum + (m.confidence || 0.5), 0) / memList.length || 0.5,
    byType: {},
    byDepartment: {}
  };

  // Count by type
  memList.forEach(m => {
    stats.byType[m.type] = (stats.byType[m.type] || 0) + 1;
    if (m.department) {
      stats.byDepartment[m.department] = (stats.byDepartment[m.department] || 0) + 1;
    }
  });

  ok(res, { stats });
});

// =============================================================================
// COMPLIANCE & AUDIT
// =============================================================================

// Get compliance report
app.get('/api/compliance', (req, res) => {
  const { department, from, to, reportType = 'full' } = req.query;

  let memList = memoriesArray();
  if (department) memList = memList.filter(m => m.department === department);

  const report = {
    id: uuidv4(),
    type: reportType,
    generatedAt: nowIso(),
    period: { from: from || 'all-time', to: to || 'now' },
    summary: {
      totalMemories: memList.length,
      privateCount: memList.filter(m => m.visibility === 'private').length,
      teamCount: memList.filter(m => m.visibility === 'team').length,
      departmentCount: memList.filter(m => m.visibility === 'department').length,
      companyCount: memList.filter(m => m.visibility === 'company').length,
      publicCount: memList.filter(m => m.visibility === 'public').length
    },
    gdpr: {
      userConsentRequired: memList.filter(m => m.type === 'personal').length,
      exportableMemories: memList.length,
      deletableMemories: memList.length,
      retentionPolicy: '90 days default'
    },
    dataByDepartment: {},
    dataByType: {}
  };

  // Group by department
  memList.forEach(m => {
    const dept = m.department || 'uncategorized';
    if (!report.dataByDepartment[dept]) {
      report.dataByDepartment[dept] = { count: 0, types: {} };
    }
    report.dataByDepartment[dept].count++;
    report.dataByDepartment[dept].types[m.type] = (report.dataByDepartment[dept].types[m.type] || 0) + 1;

    const type = m.type || 'unknown';
    if (!report.dataByType[type]) {
      report.dataByType[type] = { count: 0, departments: {} };
    }
    report.dataByType[type].count++;
    report.dataByType[type].departments[dept] = (report.dataByType[type].departments[dept] || 0) + 1;
  });

  complianceReports.set(report.id, report);

  ok(res, { report });
});

// Generate GDPR export
app.get('/api/compliance/export/:twinId', (req, res) => {
  const { twinId } = req.params;
  const { format = 'json' } = req.query;

  const userMemories = memoriesArray().filter(m => m.twinId === twinId);

  const exportData = {
    exportedAt: nowIso(),
    twinId,
    memoryCount: userMemories.length,
    memories: userMemories.map(m => ({
      id: m.id,
      type: m.type,
      content: m.content,
      createdAt: m.createdAt,
      importance: m.importance
    }))
  };

  if (format === 'json') {
    res.json(exportData);
  } else if (format === 'csv') {
    const csv = [
      'id,type,content,createdAt,importance',
      ...userMemories.map(m => `"${m.id}","${m.type}","${m.content}","${m.createdAt}","${m.importance}"`)
    ].join('\n');
    res.type('text/csv').send(csv);
  }
});

// =============================================================================
// ANALYTICS
// =============================================================================

// Get dashboard analytics
app.get('/api/analytics', (req, res) => {
  const { department, period = '30d' } = req.query;

  let memList = memoriesArray();
  if (department) memList = memList.filter(m => m.department === department);

  // Calculate metrics
  const now = new Date();
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
  const periodAgo = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const recentMemories = memList.filter(m => new Date(m.createdAt) > periodAgo);

  const analytics = {
    period,
    overview: {
      totalMemories: memList.length,
      newMemories: recentMemories.length,
      avgConfidence: (memList.reduce((s, m) => s + (m.confidence || 0.5), 0) / memList.length || 0.5).toFixed(2),
      highImportance: memList.filter(m => m.importance === 'Critical' || m.importance === 'High').length
    },
    byDepartment: {},
    byType: {},
    byImportance: {
      Critical: memList.filter(m => m.importance === 'Critical').length,
      High: memList.filter(m => m.importance === 'High').length,
      Medium: memList.filter(m => m.importance === 'Medium').length,
      Low: memList.filter(m => m.importance === 'Low').length,
      Temporary: memList.filter(m => m.importance === 'Temporary').length
    },
    byVisibility: {
      private: memList.filter(m => m.visibility === 'private').length,
      team: memList.filter(m => m.visibility === 'team').length,
      department: memList.filter(m => m.visibility === 'department').length,
      company: memList.filter(m => m.visibility === 'company').length,
      public: memList.filter(m => m.visibility === 'public').length
    },
    topContributors: getTopContributors(department).slice(0, 10),
    growthTrend: generateGrowthTrend(memList.length, periodDays)
  };

  // Group by department
  memList.forEach(m => {
    const dept = m.department || 'uncategorized';
    if (!analytics.byDepartment[dept]) {
      analytics.byDepartment[dept] = { total: 0, recent: 0 };
    }
    analytics.byDepartment[dept].total++;
    if (recentMemories.includes(m)) analytics.byDepartment[dept].recent++;
  });

  // Group by type
  memList.forEach(m => {
    const type = m.type || 'unknown';
    analytics.byType[type] = (analytics.byType[type] || 0) + 1;
  });

  ok(res, { analytics });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function memoriesArray() {
  return Array.from(memories.values());
}

function getDepartmentStats(deptId) {
  const deptMemories = memoriesArray().filter(m => m.department === deptId);
  return {
    totalMemories: deptMemories.length,
    avgConfidence: deptMemories.length > 0
      ? (deptMemories.reduce((s, m) => s + (m.confidence || 0.5), 0) / deptMemories.length).toFixed(2)
      : 0.5,
    highImportance: deptMemories.filter(m => m.importance === 'Critical' || m.importance === 'High').length,
    teamCount: new Set(deptMemories.map(m => m.team).filter(Boolean)).size
  };
}

function getDepartmentMemories(deptId) {
  return memoriesArray()
    .filter(m => m.department === deptId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getProjectMemories(projectId) {
  return memoriesArray()
    .filter(m => m.project === projectId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getProjectDecisions(projectId) {
  return memoriesArray()
    .filter(m => m.project === projectId && (m.type === 'decision' || m.type === 'engineering_decision'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getTeamActivity(teamId) {
  return Array.from(activities.values())
    .filter(a => a.team === teamId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getTopContributors(department) {
  const contribs = new Map();

  memoriesArray()
    .filter(m => !department || m.department === department)
    .forEach(m => {
      contribs.set(m.twinId, (contribs.get(m.twinId) || 0) + 1);
    });

  return Array.from(contribs.entries())
    .map(([userId, count]) => ({ userId, memoryCount: count }))
    .sort((a, b) => b.memoryCount - a.memoryCount);
}

function logActivity(userId, type, data = {}) {
  const activity = {
    id: uuidv4(),
    userId,
    type,
    timestamp: nowIso(),
    ...data
  };
  activities.set(activity.id, activity);
  return activity;
}

function generateGrowthTrend(currentTotal, days) {
  const trend = [];
  const avgGrowth = currentTotal / days;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trend.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(currentTotal - (avgGrowth * i) + Math.random() * 5)
    });
  }

  return trend;
}

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`[Memory Admin Dashboard] Running on port ${PORT}`);
  console.log(`[Memory Admin Dashboard] Department browser, knowledge graph, compliance reports`);
});

export default app;
