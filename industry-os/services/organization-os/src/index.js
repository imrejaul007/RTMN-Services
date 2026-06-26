/**
 * Organization OS - Enterprise Organization Management Platform
 * Port: 5280
 *
 * AI-Powered Organization Management: Org charts, hierarchies,
 * restructuring, governance, and strategic alignment.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5280;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// In-memory storage
const storage = {
  organizations: new Map(),
  departments: new Map(),
  teams: new Map(),
  roles: new Map(),
  employees: new Map(),
  hierarchies: new Map(),
  reorganizations: new Map(),
  governance: new Map()
};

// Unique ID generator
const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// AI AGENTS
// ============================================

// AI Agent: Org Structure Analyzer
const orgAnalyzerAgent = {
  analyzeStructure: (orgId) => {
    const org = storage.organizations.get(orgId);
    if (!org) return null;

    const departments = Array.from(storage.departments.values()).filter(d => d.orgId === orgId);
    const teams = Array.from(storage.teams.values()).filter(t => t.orgId === orgId);

    return {
      orgId,
      totalDepartments: departments.length,
      totalTeams: teams.length,
      totalEmployees: departments.reduce((sum, d) => sum + (d.employeeCount || 0), 0),
      spanOfControl: calculateSpanOfControl(departments),
      hierarchyDepth: calculateHierarchyDepth(org),
      efficiencyScore: calculateEfficiencyScore(departments, teams),
      recommendations: generateOrgRecommendations(departments, teams)
    };
  },

  detectSilos: (orgId) => {
    const departments = Array.from(storage.departments.values()).filter(d => d.orgId === orgId);

    return departments.map(dept => ({
      departmentId: dept.id,
      name: dept.name,
      siloRisk: calculateSiloRisk(dept),
      dependencies: dept.dependencies || [],
      collaborationScore: dept.collabScore || 75,
      recommendations: getSiloRecommendations(dept)
    }));
  },

  simulateReorg: (orgId, changes) => {
    const simulations = [];

    changes.forEach(change => {
      const sim = {
        change,
        impact: {},
        risks: [],
        benefits: [],
        timeline: ''
      };

      if (change.type === 'merge_departments') {
        sim.impact.costSavings = calculateCostSavings(change);
        sim.impact.headcountChange = -Math.floor(Math.random() * 10);
        sim.timeline = '6-12 months';
        sim.benefits.push('Reduced overhead', 'Streamlined communication');
        sim.risks.push('Cultural integration challenges', 'Key person dependencies');
      }

      if (change.type === 'split_department') {
        sim.impact.focusImprovement = '20-30%';
        sim.impact.headcountChange = Math.floor(Math.random() * 5);
        sim.timeline = '3-6 months';
        sim.benefits.push('Better focus', 'Clearer accountability');
        sim.risks.push('Coordination overhead', 'Resource duplication');
      }

      simulations.push(sim);
    });

    return simulations;
  }
};

// AI Agent: Governance & Compliance Agent
const governanceAgent = {
  assessCompliance: (orgId) => {
    const org = storage.organizations.get(orgId);
    if (!org) return null;

    const complianceAreas = [
      'financial_controls',
      'data_privacy',
      'labor_laws',
      'health_safety',
      'environmental',
      'corporate_governance'
    ];

    return {
      orgId,
      overallScore: 75 + Math.random() * 20,
      areas: complianceAreas.map(area => ({
        name: area,
        score: 60 + Math.random() * 40,
        status: Math.random() > 0.2 ? 'compliant' : 'needs_attention',
        findings: generateFindings(area)
      })),
      recommendations: getComplianceRecommendations()
    };
  },

  auditTrail: (orgId, filters) => {
    const auditLogs = [];
    const now = new Date();

    // Generate sample audit trail
    for (let i = 0; i < 50; i++) {
      auditLogs.push({
        id: generateId('audit'),
        timestamp: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        action: getRandomAction(),
        user: `user_${Math.floor(Math.random() * 100)}`,
        resource: `resource_${Math.floor(Math.random() * 50)}`,
        status: Math.random() > 0.1 ? 'success' : 'warning',
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      });
    }

    return auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  riskAssessment: (orgId) => {
    return {
      orgId,
      risks: [
        { category: 'operational', level: 'medium', description: 'Key person dependencies in IT', mitigation: 'Succession planning' },
        { category: 'compliance', level: 'low', description: 'GDPR training completion', mitigation: 'Mandatory training program' },
        { category: 'financial', level: 'medium', description: 'Currency exposure', mitigation: 'Hedging strategy' },
        { category: 'strategic', level: 'high', description: 'Talent retention risk', mitigation: 'Retention packages' }
      ],
      overallRiskScore: 45,
      trend: 'stable'
    };
  }
};

// AI Agent: Strategic Alignment Agent
const alignmentAgent = {
  mapOKRs: (orgId) => {
    const departments = Array.from(storage.departments.values()).filter(d => d.orgId === orgId);

    const okrs = {
      orgId,
      organizational: [
        { objective: 'Increase Revenue', keyResults: ['Expand to 3 new markets', 'Launch 5 new products', 'Improve customer NPS by 20%'] },
        { objective: 'Operational Excellence', keyResults: ['Reduce costs by 15%', 'Improve delivery time by 30%', 'Achieve 99.9% uptime'] }
      ],
      departmental: departments.map(dept => ({
        departmentId: dept.id,
        departmentName: dept.name,
        objectives: [
          { objective: `Support ${dept.name} growth`, keyResults: [`Improve metrics by 25%`, 'Reduce friction points'] }
        ]
      }))
    };

    return okrs;
  },

  trackProgress: (okrId, updates) => {
    return {
      okrId,
      currentProgress: updates.current || 45,
      trend: updates.trend || 'on_track',
      lastUpdated: new Date().toISOString(),
      blockers: updates.blockers || [],
      celebrations: updates.celebrations || []
    };
  },

  alignmentScore: (orgId) => {
    const departments = Array.from(storage.departments.values()).filter(d => d.orgId === orgId);

    return {
      orgId,
      overallScore: 78,
      byDimension: {
        strategic: 82,
        operational: 75,
        cultural: 80,
        talent: 76
      },
      misalignedAreas: departments.filter(d => d.alignmentScore < 70).map(d => ({
        department: d.name,
        gap: 70 - d.alignmentScore,
        recommendation: `Review ${d.name} objectives for strategic alignment`
      }))
    };
  }
};

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'Organization OS',
    status: 'healthy',
    port: PORT,
    version: '1.0.0',
    capabilities: ['org_structure', 'governance', 'compliance', 'okr_tracking'],
    agents: 3
  });
});

// ---- Organizations ----

app.post('/api/organizations', (req, res) => {
  const { name, type, industry, size, founded, headquarters, subsidiaries } = req.body;

  const org = {
    id: generateId('org'),
    name,
    type,
    industry,
    size,
    founded: founded || new Date().toISOString(),
    headquarters,
    subsidiaries: subsidiaries || [],
    status: 'active',
    createdAt: new Date().toISOString()
  };

  storage.organizations.set(org.id, org);
  res.status(201).json(org);
});

app.get('/api/organizations', (req, res) => {
  const orgs = Array.from(storage.organizations.values());
  res.json({ organizations: orgs, count: orgs.length });
});

app.get('/api/organizations/:id', (req, res) => {
  const org = storage.organizations.get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organization not found' });
  res.json(org);
});

app.get('/api/organizations/:id/structure', (req, res) => {
  const structure = orgAnalyzerAgent.analyzeStructure(req.params.id);
  if (!structure) return res.status(404).json({ error: 'Organization not found' });
  res.json(structure);
});

app.get('/api/organizations/:id/silos', (req, res) => {
  const silos = orgAnalyzerAgent.detectSilos(req.params.id);
  res.json({ silos, count: silos.length });
});

app.post('/api/organizations/:id/simulate-reorg', (req, res) => {
  const { changes } = req.body;
  const simulations = orgAnalyzerAgent.simulateReorg(req.params.id, changes);
  res.json({ simulations });
});

// ---- Departments ----

app.post('/api/departments', (req, res) => {
  const { orgId, name, parentDepartmentId, headCount, budget, objectives } = req.body;

  const department = {
    id: generateId('dept'),
    orgId,
    name,
    parentDepartmentId,
    headCount: headCount || 0,
    budget: budget || 0,
    objectives: objectives || [],
    status: 'active',
    createdAt: new Date().toISOString()
  };

  storage.departments.set(department.id, department);
  res.status(201).json(department);
});

app.get('/api/departments', (req, res) => {
  const { orgId } = req.query;
  let departments = Array.from(storage.departments.values());
  if (orgId) departments = departments.filter(d => d.orgId === orgId);
  res.json({ departments, count: departments.length });
});

app.get('/api/departments/:id', (req, res) => {
  const dept = storage.departments.get(req.params.id);
  if (!dept) return res.status(404).json({ error: 'Department not found' });
  res.json(dept);
});

app.patch('/api/departments/:id', (req, res) => {
  const dept = storage.departments.get(req.params.id);
  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const updated = { ...dept, ...req.body, updatedAt: new Date().toISOString() };
  storage.departments.set(req.params.id, updated);
  res.json(updated);
});

// ---- Teams ----

app.post('/api/teams', (req, res) => {
  const { orgId, departmentId, name, leadId, members } = req.body;

  const team = {
    id: generateId('team'),
    orgId,
    departmentId,
    name,
    leadId,
    members: members || [],
    status: 'active',
    createdAt: new Date().toISOString()
  };

  storage.teams.set(team.id, team);
  res.status(201).json(team);
});

app.get('/api/teams', (req, res) => {
  const { orgId, departmentId } = req.query;
  let teams = Array.from(storage.teams.values());
  if (orgId) teams = teams.filter(t => t.orgId === orgId);
  if (departmentId) teams = teams.filter(t => t.departmentId === departmentId);
  res.json({ teams, count: teams.length });
});

app.get('/api/teams/:id', (req, res) => {
  const team = storage.teams.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json(team);
});

// ---- Roles ----

app.post('/api/roles', (req, res) => {
  const { orgId, title, level, departmentId, responsibilities, competencies } = req.body;

  const role = {
    id: generateId('role'),
    orgId,
    title,
    level,
    departmentId,
    responsibilities: responsibilities || [],
    competencies: competencies || [],
    createdAt: new Date().toISOString()
  };

  storage.roles.set(role.id, role);
  res.status(201).json(role);
});

app.get('/api/roles', (req, res) => {
  const { orgId, departmentId } = req.query;
  let roles = Array.from(storage.roles.values());
  if (orgId) roles = roles.filter(r => r.orgId === orgId);
  if (departmentId) roles = roles.filter(r => r.departmentId === departmentId);
  res.json({ roles, count: roles.length });
});

// ---- Employees ----

app.post('/api/employees', (req, res) => {
  const { orgId, departmentId, teamId, name, email, title, managerId, hireDate } = req.body;

  const employee = {
    id: generateId('emp'),
    orgId,
    departmentId,
    teamId,
    name,
    email,
    title,
    managerId,
    hireDate: hireDate || new Date().toISOString(),
    status: 'active',
    createdAt: new Date().toISOString()
  };

  storage.employees.set(employee.id, employee);
  res.status(201).json(employee);
});

app.get('/api/employees', (req, res) => {
  const { orgId, departmentId, teamId } = req.query;
  let employees = Array.from(storage.employees.values());
  if (orgId) employees = employees.filter(e => e.orgId === orgId);
  if (departmentId) employees = employees.filter(e => e.departmentId === departmentId);
  if (teamId) employees = employees.filter(e => e.teamId === teamId);
  res.json({ employees, count: employees.length });
});

app.get('/api/employees/:id', (req, res) => {
  const employee = storage.employees.get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
});

// ---- Hierarchy ----

app.get('/api/hierarchy/:orgId', (req, res) => {
  const org = storage.organizations.get(req.params.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  const departments = Array.from(storage.departments.values()).filter(d => d.orgId === req.params.orgId);
  const teams = Array.from(storage.teams.values()).filter(t => t.orgId === req.params.orgId);

  const hierarchy = {
    orgId: req.params.orgId,
    root: { type: 'organization', name: org.name },
    departments: departments.map(d => ({
      id: d.id,
      name: d.name,
      parentId: d.parentDepartmentId,
      teams: teams.filter(t => t.departmentId === d.id).map(t => ({ id: t.id, name: t.name }))
    }))
  };

  res.json(hierarchy);
});

// ---- Governance ----

app.get('/api/governance/:orgId/compliance', (req, res) => {
  const compliance = governanceAgent.assessCompliance(req.params.orgId);
  res.json(compliance);
});

app.get('/api/governance/:orgId/audit-trail', (req, res) => {
  const { action, user, startDate, endDate } = req.query;
  let trail = governanceAgent.auditTrail(req.params.orgId, { action, user, startDate, endDate });

  if (action) trail = trail.filter(t => t.action.includes(action));
  if (user) trail = trail.filter(t => t.user === user);

  res.json({ trail, count: trail.length });
});

app.get('/api/governance/:orgId/risk-assessment', (req, res) => {
  const assessment = governanceAgent.riskAssessment(req.params.orgId);
  res.json(assessment);
});

// ---- OKRs & Strategic Alignment ----

app.get('/api/okrs/:orgId', (req, res) => {
  const okrs = alignmentAgent.mapOKRs(req.params.orgId);
  res.json(okrs);
});

app.patch('/api/okrs/:okrId/progress', (req, res) => {
  const progress = alignmentAgent.trackProgress(req.params.okrId, req.body);
  res.json(progress);
});

app.get('/api/alignment/:orgId/score', (req, res) => {
  const score = alignmentAgent.alignmentScore(req.params.orgId);
  res.json(score);
});

// ---- Reorganizations ----

app.post('/api/reorganizations', (req, res) => {
  const { orgId, name, type, description, affectedDepartments } = req.body;

  const reorg = {
    id: generateId('reorg'),
    orgId,
    name,
    type,
    description,
    affectedDepartments: affectedDepartments || [],
    status: 'planned',
    phases: [],
    createdAt: new Date().toISOString()
  };

  storage.reorganizations.set(reorg.id, reorg);
  res.status(201).json(reorg);
});

app.get('/api/reorganizations/:orgId', (req, res) => {
  const reorgs = Array.from(storage.reorganizations.values()).filter(r => r.orgId === req.params.orgId);
  res.json({ reorganizations: reorgs, count: reorgs.length });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateSpanOfControl(departments) {
  const avg = departments.reduce((sum, d) => sum + (d.employeeCount || 5), 0) / Math.max(departments.length, 1);
  return { average: Math.round(avg), recommended: '5-10' };
}

function calculateHierarchyDepth(org) {
  return Math.floor(Math.random() * 3) + 4; // 4-6 levels
}

function calculateEfficiencyScore(departments, teams) {
  return 65 + Math.random() * 25;
}

function generateOrgRecommendations(departments, teams) {
  const recommendations = [];

  if (departments.length > 15) {
    recommendations.push('Consider consolidating departments to reduce complexity');
  }

  if (teams.some(t => t.members?.length > 12)) {
    recommendations.push('Some teams exceed optimal size - consider splitting');
  }

  recommendations.push('Implement regular cross-functional meetings');
  recommendations.push('Review reporting lines for flatter structure');

  return recommendations;
}

function calculateSiloRisk(dept) {
  const risk = Math.random() * 100;
  if (risk > 70) return 'high';
  if (risk > 40) return 'medium';
  return 'low';
}

function getSiloRecommendations(dept) {
  return [
    'Establish cross-functional projects',
    'Implement shared KPIs with other departments',
    'Rotate team members between departments',
    'Create shared communication channels'
  ];
}

function calculateCostSavings(change) {
  return Math.floor(Math.random() * 500000) + 100000;
}

function generateFindings(area) {
  const findings = [];
  if (Math.random() > 0.5) {
    findings.push({ severity: 'low', description: 'Minor documentation gap identified' });
  }
  return findings;
}

function getComplianceRecommendations() {
  return [
    'Complete annual compliance training',
    'Update data classification policy',
    'Review vendor compliance status',
    'Conduct quarterly internal audits'
  ];
}

function getRandomAction() {
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'APPROVE', 'REJECT'];
  const resources = ['department', 'employee', 'role', 'budget', 'document'];
  return `${actions[Math.floor(Math.random() * actions.length)]}_${resources[Math.floor(Math.random() * resources.length)]}`;
}

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🏢 Organization OS running on port ${PORT}`);
  console.log('Capabilities:');
  console.log('  - Org Structure Analyzer Agent');
  console.log('  - Governance & Compliance Agent');
  console.log('  - Strategic Alignment Agent');
});

module.exports = app;
