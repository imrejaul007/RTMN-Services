/**
 * Company Emotional Intelligence - v1.0.0
 * =======================================
 * Organization mood and morale tracking.
 *
 * Port: 4780
 *
 * Features:
 * - Company emotional profile
 * - Department mood tracking
 * - Burnout risk aggregation
 * - Morale trends
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4780;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Data stores
const companies = new Map();      // companyId -> CompanyProfile
const departments = new Map();    // `${companyId}:${deptId}` -> DeptProfile
const employees = new Map();      // employeeId -> EmployeeProfile
const snapshots = new Map();      // `${companyId}:${date}` -> Snapshot

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function calculateMorale(scores) {
  const weights = { happiness: 0.3, engagement: 0.25, stress: 0.25, trust: 0.2 };
  let total = 0;
  let weightSum = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (scores[key] !== undefined) {
      total += scores[key] * weight;
      weightSum += weight;
    }
  }

  // Invert stress (high stress = low morale)
  total = (total / weightSum) * (1 - (scores.stress || 0.5) * 0.3);

  return Math.round(total * 100) / 100;
}

function getMoraleLevel(score) {
  if (score >= 80) return { level: 'excellent', emoji: '🚀', color: 'green' };
  if (score >= 60) return { level: 'good', emoji: '😊', color: 'blue' };
  if (score >= 40) return { level: 'moderate', emoji: '😐', color: 'yellow' };
  if (score >= 20) return { level: 'concerning', emoji: '😟', color: 'orange' };
  return { level: 'critical', emoji: '🚨', color: 'red' };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /company - Create company profile
 */
app.post('/company', (req, res) => {
  const { companyId, name, industry, size, departments: deptList } = req.body;

  if (!companyId) {
    return res.status(400).json({ error: 'companyId required' });
  }

  const company = {
    id: companyId,
    name: name || companyId,
    industry: industry || 'general',
    size: size || 'unknown',
    emotionalProfile: {
      morale: 70,
      happiness: 70,
      engagement: 70,
      stress: 30,
      trust: 75
    },
    departmentCount: deptList?.length || 0,
    employeeCount: 0,
    burnoutRisk: 0.3,
    trend: 'stable',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  companies.set(companyId, company);

  res.json({ success: true, company });
});

/**
 * GET /company/:companyId - Get company profile
 */
app.get('/company/:companyId', (req, res) => {
  const { companyId } = req.params;
  const company = companies.get(companyId);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.json({ company });
});

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT PROFILES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /department - Create/update department
 */
app.post('/department', (req, res) => {
  const { companyId, departmentId, name, managerId, metrics } = req.body;

  if (!companyId || !departmentId) {
    return res.status(400).json({ error: 'companyId and departmentId required' });
  }

  const deptKey = `${companyId}:${departmentId}`;
  const dept = {
    id: departmentId,
    companyId,
    name: name || departmentId,
    managerId: managerId || null,
    emotionalProfile: {
      morale: metrics?.morale || 70,
      happiness: metrics?.happiness || 70,
      engagement: metrics?.engagement || 70,
      stress: metrics?.stress || 30,
      productivity: metrics?.productivity || 80
    },
    employeeCount: metrics?.employeeCount || 0,
    burnoutRisk: metrics?.burnoutRisk || 0.3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  departments.set(deptKey, dept);

  // Update company aggregate
  updateCompanyAggregate(companyId);

  res.json({ success: true, department: dept });
});

/**
 * GET /company/:companyId/departments - List departments
 */
app.get('/company/:companyId/departments', (req, res) => {
  const { companyId } = req.params;

  const depts = [];
  departments.forEach((dept, key) => {
    if (key.startsWith(`${companyId}:`)) {
      depts.push(dept);
    }
  });

  res.json({ departments: depts });
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE EMOTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /employee/emotion - Record employee emotion
 */
app.post('/employee/emotion', (req, res) => {
  const { employeeId, companyId, departmentId, emotion, intensity, context } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId required' });
  }

  let employee = employees.get(employeeId);
  if (!employee) {
    employee = {
      id: employeeId,
      companyId: companyId || null,
      departmentId: departmentId || null,
      emotions: [],
      avgHappiness: 70,
      avgStress: 30,
      burnoutRisk: 0.3,
      lastUpdated: new Date().toISOString()
    };
    employees.set(employeeId, employee);
  }

  const emotionRecord = {
    id: uuidv4(),
    emotion: emotion || 'neutral',
    intensity: intensity || 0.5,
    context: context || '',
    timestamp: new Date().toISOString()
  };

  employee.emotions.push(emotionRecord);
  employee.lastUpdated = new Date().toISOString();

  // Keep last 100 emotions
  if (employee.emotions.length > 100) {
    employee.emotions = employee.emotions.slice(-100);
  }

  // Update averages
  const recentEmotions = employee.emotions.slice(-10);
  const happyCount = recentEmotions.filter(e => ['happy', 'excited', 'satisfied'].includes(e.emotion)).length;
  const stressedCount = recentEmotions.filter(e => ['stressed', 'anxious', 'frustrated'].includes(e.emotion)).length;

  employee.avgHappiness = (happyCount / recentEmotions.length) * 100;
  employee.avgStress = (stressedCount / recentEmotions.length) * 100;
  employee.burnoutRisk = calculateBurnoutRisk(employee);

  employees.set(employeeId, employee);

  // Update department if applicable
  if (departmentId) {
    updateDepartmentAggregate(`${companyId}:${departmentId}`);
  }

  res.json({ success: true, employee });
});

function calculateBurnoutRisk(employee) {
  let risk = 0.3; // Base risk

  // High stress increases risk
  if (employee.avgStress > 60) risk += 0.2;
  else if (employee.avgStress > 40) risk += 0.1;

  // Low happiness increases risk
  if (employee.avgHappiness < 40) risk += 0.2;
  else if (employee.avgHappiness < 60) risk += 0.1;

  return Math.min(1, risk);
}

function updateDepartmentAggregate(deptKey) {
  const dept = departments.get(deptKey);
  if (!dept) return;

  // Find all employees in this department
  let deptEmployees = [];
  employees.forEach(emp => {
    if (emp.departmentId === dept.id) {
      deptEmployees.push(emp);
    }
  });

  if (deptEmployees.length === 0) return;

  // Calculate aggregates
  const avgHappiness = deptEmployees.reduce((sum, e) => sum + e.avgHappiness, 0) / deptEmployees.length;
  const avgStress = deptEmployees.reduce((sum, e) => sum + e.avgStress, 0) / deptEmployees.length;
  const avgBurnout = deptEmployees.reduce((sum, e) => sum + e.burnoutRisk, 0) / deptEmployees.length;

  dept.emotionalProfile = {
    ...dept.emotionalProfile,
    happiness: Math.round(avgHappiness),
    stress: Math.round(avgStress)
  };
  dept.burnoutRisk = Math.round(avgBurnout * 100) / 100;
  dept.employeeCount = deptEmployees.length;
  dept.updatedAt = new Date().toISOString();

  departments.set(deptKey, dept);
}

function updateCompanyAggregate(companyId) {
  const company = companies.get(companyId);
  if (!company) return;

  // Find all departments for this company
  let companyDepts = [];
  departments.forEach((dept, key) => {
    if (key.startsWith(`${companyId}:`)) {
      companyDepts.push(dept);
    }
  });

  if (companyDepts.length === 0) return;

  // Calculate company-wide aggregates
  const avgMorale = companyDepts.reduce((sum, d) => sum + d.emotionalProfile?.morale || 70, 0) / companyDepts.length;
  const avgBurnout = companyDepts.reduce((sum, d) => sum + d.burnoutRisk || 0.3, 0) / companyDepts.length;

  company.emotionalProfile = {
    morale: Math.round(avgMorale),
    happiness: Math.round(avgMorale * 0.95),
    engagement: Math.round(avgMorale * 0.9),
    stress: Math.round((1 - avgMorale / 100) * 50),
    trust: 75
  };
  company.burnoutRisk = Math.round(avgBurnout * 100) / 100;
  company.departmentCount = companyDepts.length;
  company.employeeCount = companyDepts.reduce((sum, d) => sum + d.employeeCount || 0, 0);
  company.updatedAt = new Date().toISOString();

  companies.set(companyId, company);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /company/:companyId/analytics - Get company analytics
 */
app.get('/company/:companyId/analytics', (req, res) => {
  const { companyId } = req.params;
  const company = companies.get(companyId);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Get department breakdown
  const depts = [];
  departments.forEach((dept, key) => {
    if (key.startsWith(`${companyId}:`)) {
      depts.push({
        id: dept.id,
        name: dept.name,
        morale: dept.emotionalProfile?.morale || 70,
        burnoutRisk: dept.burnoutRisk || 0.3
      });
    }
  });

  // Morale level
  const moraleInfo = getMoraleLevel(company.emotionalProfile?.morale || 70);

  res.json({
    companyId,
    overallMorale: company.emotionalProfile?.morale || 70,
    moraleLevel: moraleInfo,
    burnoutRisk: company.burnoutRisk || 0.3,
    employeeCount: company.employeeCount || 0,
    departments: depts,
    trend: company.trend || 'stable'
  });
});

/**
 * GET /company/:companyId/trends - Get morale trends
 */
app.get('/company/:companyId/trends', (req, res) => {
  const { companyId } = req.params;
  const { days = 30 } = req.query;

  // Get snapshots for this company
  const companyTrends = [];
  snapshots.forEach((snapshot, key) => {
    if (key.startsWith(`${companyId}:`)) {
      companyTrends.push(snapshot);
    }
  });

  res.json({
    companyId,
    trends: companyTrends.slice(-parseInt(days)),
    period: `${days} days`
  });
});

/**
 * POST /snapshot - Take morale snapshot
 */
app.post('/snapshot', (req, res) => {
  const { companyId, metrics } = req.body;

  if (!companyId) {
    return res.status(400).json({ error: 'companyId required' });
  }

  const company = companies.get(companyId);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const date = new Date().toISOString().split('T')[0];
  const snapshotKey = `${companyId}:${date}`;

  const snapshot = {
    companyId,
    date,
    morale: metrics?.morale || company.emotionalProfile?.morale || 70,
    happiness: metrics?.happiness || company.emotionalProfile?.happiness || 70,
    engagement: metrics?.engagement || company.emotionalProfile?.engagement || 70,
    stress: metrics?.stress || company.emotionalProfile?.stress || 30,
    burnoutRisk: company.burnoutRisk || 0.3,
    employeeCount: company.employeeCount || 0
  };

  snapshots.set(snapshotKey, snapshot);

  res.json({ success: true, snapshot });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'company-emotion',
    port: PORT,
    companies: companies.size,
    departments: departments.size,
    employees: employees.size
  });
});

app.listen(PORT, () => {
  console.log(`Company Emotional Intelligence running on port ${PORT}`);
});

export default app;
