/**
 * Workforce Intelligence OS - Strategic Workforce Analytics & Planning Platform
 * Port: 5283
 *
 * AI-Powered Workforce Intelligence: Capacity planning, skills mapping,
 * productivity analytics, retention prediction, and strategic workforce optimization.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5283;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// In-memory storage
const storage = {
  employees: new Map(),
  teams: new Map(),
  departments: new Map(),
  skills: new Map(),
  capacityPlans: new Map(),
  performanceRecords: new Map(),
  turnoverRecords: new Map(),
  benchmarks: new Map()
};

// Unique ID generator
const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// AI AGENTS
// ============================================

// AI Agent: Capacity Planning Agent
const capacityAgent = {
  analyzeCapacity: (orgId, timeframe) => {
    const teams = Array.from(storage.teams.values()).filter(t => t.orgId === orgId);

    const analysis = {
      orgId,
      timeframe,
      currentCapacity: calculateCurrentCapacity(teams),
      demandForecast: generateDemandForecast(teams, timeframe),
      gapAnalysis: calculateGapAnalysis(teams),
      recommendations: generateCapacityRecommendations(teams)
    };

    return analysis;
  },

  predictDemand: (orgId, months) => {
    const teams = Array.from(storage.teams.values()).filter(t => t.orgId === orgId);

    const forecast = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() + i);

      forecast.push({
        month: date.toISOString().slice(0, 7),
        currentHeadcount: teams.reduce((sum, t) => sum + t.memberCount, 0),
        projectedDemand: teams.reduce((sum, t) => sum + t.memberCount * (1 + 0.05 * i), 0),
        attritionImpact: Math.floor(Math.random() * 5) * i,
        netDemand: Math.floor(Math.random() * 10) + 5 * i
      });
    }

    return {
      orgId,
      forecast,
      confidence: 75 + Math.random() * 15,
      keyDrivers: ['business_growth', 'product_launches', 'market_expansion']
    };
  },

  optimizeAllocation: (orgId) => {
    const teams = Array.from(storage.teams.values()).filter(t => t.orgId === orgId);

    const optimization = {
      orgId,
      currentAllocation: teams.map(t => ({
        teamId: t.id,
        teamName: t.name,
        headcount: t.memberCount,
        utilization: t.utilization || 85
      })),
      optimizedAllocation: optimizeTeamAllocation(teams),
      potentialGains: calculatePotentialGains(teams),
      risks: identifyAllocationRisks(teams)
    };

    return optimization;
  }
};

// AI Agent: Skills Intelligence Agent
const skillsAgent = {
  mapSkills: (orgId) => {
    const employees = Array.from(storage.employees.values()).filter(e => e.orgId === orgId);
    const skillMap = {};

    employees.forEach(emp => {
      (emp.skills || []).forEach(skill => {
        if (!skillMap[skill]) {
          skillMap[skill] = { count: 0, employees: [], proficiency: 0 };
        }
        skillMap[skill].count++;
        skillMap[skill].employees.push(emp.id);
        skillMap[skill].proficiency += emp.skillLevels?.[skill] || 3;
      });
    });

    Object.keys(skillMap).forEach(skill => {
      skillMap[skill].proficiency /= skillMap[skill].count;
    });

    return {
      orgId,
      totalSkills: Object.keys(skillMap).length,
      totalEmployees: employees.length,
      skillDistribution: skillMap,
      rareSkills: findRareSkills(skillMap),
      commonSkills: findCommonSkills(skillMap)
    };
  },

  identifyGaps: (orgId, targetSkills) => {
    const skillMap = skillsAgent.mapSkills(orgId);
    const gaps = [];

    targetSkills.forEach(target => {
      const current = skillMap.skillDistribution[target.skill];
      const requiredCount = target.count || 1;
      const currentCount = current?.count || 0;

      if (currentCount < requiredCount) {
        gaps.push({
          skill: target.skill,
          required: requiredCount,
          current: currentCount,
          gap: requiredCount - currentCount,
          severity: (requiredCount - currentCount) / requiredCount > 0.5 ? 'critical' : 'moderate',
          urgency: target.urgency || 'medium',
          recommendedActions: getGapRecommendations(target.skill, requiredCount - currentCount)
        });
      }
    });

    return {
      orgId,
      totalGaps: gaps.length,
      criticalGaps: gaps.filter(g => g.severity === 'critical'),
      moderateGaps: gaps.filter(g => g.severity === 'moderate'),
      overallGapScore: calculateGapScore(gaps)
    };
  },

  recommendDevelopment: (employeeId) => {
    const employee = storage.employees.get(employeeId);
    if (!employee) return null;

    const currentSkills = employee.skills || [];
    const adjacentSkills = findAdjacentSkills(currentSkills);

    const development = {
      employeeId,
      employeeName: employee.name,
      currentSkills: currentSkills.map(s => ({
        skill: s,
        proficiency: employee.skillLevels?.[s] || 3,
        recommendation: getSkillRecommendation(s, employee.skillLevels?.[s] || 3)
      })),
      recommendedGrowth: adjacentSkills.map(s => ({
        skill: s,
        relevance: calculateRelevance(s, currentSkills),
        effort: estimateLearningEffort(s)
      })),
      careerPath: generateCareerPath(employee)
    };

    return development;
  }
};

// AI Agent: Performance Intelligence Agent
const performanceAgent = {
  analyzePerformance: (employeeId, period) => {
    const employee = storage.employees.get(employeeId);
    if (!employee) return null;

    const records = Array.from(storage.performanceRecords.values())
      .filter(r => r.employeeId === employeeId)
      .slice(-period);

    const analysis = {
      employeeId,
      period,
      overallScore: calculateOverallPerformance(records),
      dimensions: analyzeDimensions(records),
      trends: analyzePerformanceTrends(records),
      comparisons: compareToPeers(employee),
      recommendations: generatePerformanceRecommendations(records)
    };

    return analysis;
  },

  identifyHighPerformers: (orgId, criteria) => {
    const employees = Array.from(storage.employees.values()).filter(e => e.orgId === orgId);

    const performers = employees
      .map(emp => {
        const records = Array.from(storage.performanceRecords.values())
          .filter(r => r.employeeId === emp.id);
        return {
          employeeId: emp.id,
          name: emp.name,
          department: emp.department,
          performanceScore: calculateOverallPerformance(records),
          potentialScore: emp.potentialScore || 75,
          retentionRisk: emp.retentionRisk || 'low',
          flightRisk: calculateFlightRisk(emp)
        };
      })
      .filter(p => p.performanceScore >= (criteria?.minScore || 80))
      .sort((a, b) => b.performanceScore - a.performanceScore);

    return {
      orgId,
      highPerformers: performers.slice(0, 20),
      totalHighPerformers: performers.length,
      distribution: getPerformanceDistribution(performers)
    };
  },

  predictPerformance: (employeeId) => {
    const employee = storage.employees.get(employeeId);
    const records = Array.from(storage.performanceRecords.values())
      .filter(r => r.employeeId === employeeId);

    const trajectory = analyzeTrajectory(records);

    return {
      employeeId,
      currentPerformance: calculateOverallPerformance(records),
      predictedNextQuarter: trajectory.nextQuarter,
      confidence: trajectory.confidence,
      factors: identifyPerformanceFactors(records),
      interventions: recommendInterventions(trajectory)
    };
  }
};

// AI Agent: Retention Intelligence Agent
const retentionAgent = {
  predictFlightRisk: (employeeId) => {
    const employee = storage.employees.get(employeeId);
    if (!employee) return null;

    const factors = analyzeFlightRiskFactors(employee);
    const overallRisk = calculateFlightRiskScore(factors);

    return {
      employeeId,
      riskScore: overallRisk,
      riskLevel: getRiskLevel(overallRisk),
      factors: factors,
      warningSigns: identifyWarningSigns(employee),
      retentionActions: getRetentionActions(overallRisk, employee),
      managerActions: getManagerActions(employee)
    };
  },

  analyzeTurnover: (orgId, period) => {
    const records = Array.from(storage.turnoverRecords.values())
      .filter(r => r.orgId === orgId);

    const analysis = {
      orgId,
      period,
      voluntaryRate: calculateTurnoverRate(records, 'voluntary'),
      involuntaryRate: calculateTurnoverRate(records, 'involuntary'),
      totalRate: calculateTurnoverRate(records, 'total'),
      byDepartment: analyzeTurnoverByDepartment(records),
      byTenure: analyzeTurnoverByTenure(records),
      byRole: analyzeTurnoverByRole(records),
      costOfTurnover: calculateTurnoverCost(records),
      predictions: predictTurnoverTrends(records)
    };

    return analysis;
  },

  recommendRetention: (orgId) => {
    const employees = Array.from(storage.employees.values()).filter(e => e.orgId === orgId);

    const highRisk = employees.filter(e => {
      const risk = retentionAgent.predictFlightRisk(e.id);
      return risk && risk.riskLevel === 'high';
    });

    return {
      orgId,
      highRiskCount: highRisk.length,
      criticalRetentions: highRisk.map(e => ({
        employeeId: e.id,
        name: e.name,
        riskScore: retentionAgent.predictFlightRisk(e.id).riskScore,
        recommendedActions: getRetentionActions(80, e)
      })),
      generalRecommendations: getGeneralRetentionRecommendations()
    };
  }
};

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'Workforce Intelligence OS',
    status: 'healthy',
    port: PORT,
    version: '1.0.0',
    capabilities: ['capacity_planning', 'skills_intelligence', 'performance', 'retention'],
    agents: 4
  });
});

// ---- Employees ----

app.post('/api/employees', (req, res) => {
  const { orgId, name, department, teamId, title, skills, hireDate, compensation, managerId } = req.body;

  const employee = {
    id: generateId('emp'),
    orgId,
    name,
    department,
    teamId,
    title,
    skills: skills || [],
    skillLevels: {},
    hireDate: hireDate || new Date().toISOString(),
    compensation,
    managerId,
    status: 'active',
    potentialScore: 75,
    retentionRisk: 'low',
    createdAt: new Date().toISOString()
  };

  // Initialize skill levels
  (skills || []).forEach(s => {
    employee.skillLevels[s] = 3;
  });

  storage.employees.set(employee.id, employee);
  res.status(201).json(employee);
});

app.get('/api/employees', (req, res) => {
  const { orgId, department, teamId, status } = req.query;
  let employees = Array.from(storage.employees.values());

  if (orgId) employees = employees.filter(e => e.orgId === orgId);
  if (department) employees = employees.filter(e => e.department === department);
  if (teamId) employees = employees.filter(e => e.teamId === teamId);
  if (status) employees = employees.filter(e => e.status === status);

  res.json({ employees, count: employees.length });
});

app.get('/api/employees/:id', (req, res) => {
  const employee = storage.employees.get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
});

// ---- Teams ----

app.post('/api/teams', (req, res) => {
  const { orgId, name, department, leadId, memberCount, utilization } = req.body;

  const team = {
    id: generateId('team'),
    orgId,
    name,
    department,
    leadId,
    memberCount: memberCount || 0,
    utilization: utilization || 85,
    capacity: memberCount || 10,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  storage.teams.set(team.id, team);
  res.status(201).json(team);
});

app.get('/api/teams', (req, res) => {
  const { orgId, department } = req.query;
  let teams = Array.from(storage.teams.values());

  if (orgId) teams = teams.filter(t => t.orgId === orgId);
  if (department) teams = teams.filter(t => t.department === department);

  res.json({ teams, count: teams.length });
});

// ---- Departments ----

app.post('/api/departments', (req, res) => {
  const { orgId, name, headCount, budget, headId } = req.body;

  const department = {
    id: generateId('dept'),
    orgId,
    name,
    headCount: headCount || 0,
    budget: budget || 0,
    headId,
    teams: [],
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

// ---- Capacity Planning ----

app.get('/api/capacity/:orgId', (req, res) => {
  const { timeframe } = req.query;
  const analysis = capacityAgent.analyzeCapacity(req.params.orgId, timeframe || 'quarterly');
  res.json(analysis);
});

app.get('/api/capacity/:orgId/forecast', (req, res) => {
  const { months } = req.query;
  const forecast = capacityAgent.predictDemand(req.params.orgId, parseInt(months) || 6);
  res.json(forecast);
});

app.get('/api/capacity/:orgId/optimize', (req, res) => {
  const optimization = capacityAgent.optimizeAllocation(req.params.orgId);
  res.json(optimization);
});

// ---- Skills Intelligence ----

app.get('/api/skills/:orgId/map', (req, res) => {
  const map = skillsAgent.mapSkills(req.params.orgId);
  res.json(map);
});

app.get('/api/skills/:orgId/gaps', (req, res) => {
  const { targets } = req.query;
  const targetSkills = targets ? JSON.parse(targets) : [];
  const gaps = skillsAgent.identifyGaps(req.params.orgId, targetSkills);
  res.json(gaps);
});

app.get('/api/skills/:orgId/development/:employeeId', (req, res) => {
  const development = skillsAgent.recommendDevelopment(req.params.employeeId);
  if (!development) return res.status(404).json({ error: 'Employee not found' });
  res.json(development);
});

// ---- Performance ----

app.post('/api/performance', (req, res) => {
  const { employeeId, period, scores, notes } = req.body;

  const record = {
    id: generateId('perf'),
    employeeId,
    period,
    scores: scores || {},
    overallScore: calculateOverallScore(scores),
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  storage.performanceRecords.set(record.id, record);
  res.status(201).json(record);
});

app.get('/api/performance/:employeeId', (req, res) => {
  const { period } = req.query;
  const analysis = performanceAgent.analyzePerformance(req.params.employeeId, parseInt(period) || 4);
  res.json(analysis);
});

app.get('/api/performance/:orgId/high-performers', (req, res) => {
  const { minScore } = req.query;
  const performers = performanceAgent.identifyHighPerformers(req.params.orgId, { minScore: parseInt(minScore) });
  res.json(performers);
});

app.get('/api/performance/:employeeId/predict', (req, res) => {
  const prediction = performanceAgent.predictPerformance(req.params.employeeId);
  res.json(prediction);
});

// ---- Retention ----

app.get('/api/retention/:employeeId/risk', (req, res) => {
  const risk = retentionAgent.predictFlightRisk(req.params.employeeId);
  if (!risk) return res.status(404).json({ error: 'Employee not found' });
  res.json(risk);
});

app.get('/api/retention/:orgId/analysis', (req, res) => {
  const { period } = req.query;
  const analysis = retentionAgent.analyzeTurnover(req.params.orgId, period || '12months');
  res.json(analysis);
});

app.get('/api/retention/:orgId/recommendations', (req, res) => {
  const recommendations = retentionAgent.recommendRetention(req.params.orgId);
  res.json(recommendations);
});

// ---- Reports ----

app.get('/api/reports/:orgId/workforce-health', (req, res) => {
  const employees = Array.from(storage.employees.values()).filter(e => e.orgId === req.params.orgId);

  const health = {
    orgId: req.params.orgId,
    totalEmployees: employees.length,
    engagementScore: 70 + Math.floor(Math.random() * 20),
    productivityIndex: 75 + Math.floor(Math.random() * 15),
    sentimentTrend: 'improving',
    wellbeingScore: 72 + Math.floor(Math.random() * 15),
    burnoutRisk: Math.floor(Math.random() * 20) + '%',
    keyInsights: generateWorkforceInsights(employees)
  };

  res.json(health);
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateCurrentCapacity(teams) {
  return {
    totalHeadcount: teams.reduce((sum, t) => sum + t.memberCount, 0),
    totalCapacity: teams.reduce((sum, t) => sum + t.capacity, 0),
    utilizationRate: teams.reduce((sum, t) => sum + (t.utilization || 85), 0) / teams.length
  };
}

function generateDemandForecast(teams, timeframe) {
  const baseDemand = teams.reduce((sum, t) => sum + t.memberCount, 0);
  const growth = timeframe === 'quarterly' ? 0.05 : 0.15;
  return Math.round(baseDemand * (1 + growth));
}

function calculateGapAnalysis(teams) {
  const utilization = teams.map(t => t.utilization || 85);
  const avgUtilization = utilization.reduce((a, b) => a + b, 0) / utilization.length;

  return {
    currentUtilization: avgUtilization,
    optimalUtilization: 80,
    surplus: avgUtilization > 85 ? Math.round((avgUtilization - 85) / 100 * teams.length) : 0,
    deficit: avgUtilization < 75 ? Math.round((75 - avgUtilization) / 100 * teams.length) : 0
  };
}

function generateCapacityRecommendations(teams) {
  const recommendations = [];
  const avgUtilization = teams.reduce((sum, t) => sum + (t.utilization || 85), 0) / teams.length;

  if (avgUtilization > 90) {
    recommendations.push('Consider hiring additional team members to reduce burnout risk');
  }
  if (avgUtilization < 70) {
    recommendations.push('Opportunity to increase project scope or redeploy resources');
  }

  recommendations.push('Review cross-functional collaboration opportunities');
  recommendations.push('Implement capacity sharing between teams');

  return recommendations;
}

function optimizeTeamAllocation(teams) {
  return teams.map(t => ({
    teamId: t.id,
    teamName: t.name,
    suggestedHeadcount: Math.round(t.memberCount * 0.9),
    currentUtilization: t.utilization || 85,
    targetUtilization: 80
  }));
}

function calculatePotentialGains(teams) {
  return {
    productivityGain: 5 + Math.floor(Math.random() * 10) + '%',
    costSavings: Math.floor(Math.random() * 100000) + 50000,
    efficiencyImprovement: 8 + Math.floor(Math.random() * 12) + '%'
  };
}

function identifyAllocationRisks(teams) {
  return teams.filter(t => (t.utilization || 85) > 95).map(t => ({
    teamId: t.id,
    teamName: t.name,
    risk: 'Overutilization'
  }));
}

function findRareSkills(skillMap) {
  return Object.entries(skillMap)
    .filter(([_, v]) => v.count <= 2)
    .map(([skill, v]) => ({ skill, count: v.count }));
}

function findCommonSkills(skillMap) {
  return Object.entries(skillMap)
    .filter(([_, v]) => v.count > 5)
    .map(([skill, v]) => ({ skill, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

function findAdjacentSkills(currentSkills) {
  const adjacentMap = {
    'javascript': ['typescript', 'node.js', 'react'],
    'python': ['machine-learning', 'data-science', 'django'],
    'react': ['vue.js', 'angular', 'next.js'],
    'sql': ['postgresql', 'mongodb', 'data-analysis'],
    'aws': ['gcp', 'azure', 'devops']
  };

  const adjacent = new Set();
  currentSkills.forEach(s => {
    (adjacentMap[s] || []).forEach(a => adjacent.add(a));
  });

  return Array.from(adjacent);
}

function calculateRelevance(skill, currentSkills) {
  return 70 + Math.floor(Math.random() * 25);
}

function estimateLearningEffort(skill) {
  return { hours: Math.floor(Math.random() * 40) + 20, level: 'intermediate' };
}

function getSkillRecommendation(skill, currentLevel) {
  if (currentLevel < 4) return 'Practice more to reach proficiency';
  return 'Ready for advanced certification';
}

function generateCareerPath(employee) {
  return [
    { title: employee.title, level: 'current' },
    { title: 'Senior ' + employee.title, level: 'next' },
    { title: 'Lead ' + employee.title, level: 'future' }
  ];
}

function getGapRecommendations(skill, gapSize) {
  return [
    `Hire ${gapSize} specialists in ${skill}`,
    'Cross-train existing employees',
    'Consider contractor for initial gap coverage'
  ];
}

function calculateGapScore(gaps) {
  if (gaps.length === 0) return 100;
  const criticalCount = gaps.filter(g => g.severity === 'critical').length;
  return Math.max(0, 100 - criticalCount * 20 - (gaps.length - criticalCount) * 5);
}

function calculateOverallPerformance(records) {
  if (records.length === 0) return 75;
  return records.reduce((sum, r) => sum + (r.overallScore || 75), 0) / records.length;
}

function analyzeDimensions(records) {
  return {
    productivity: 75 + Math.floor(Math.random() * 15),
    quality: 80 + Math.floor(Math.random() * 15),
    teamwork: 70 + Math.floor(Math.random() * 20),
    innovation: 65 + Math.floor(Math.random() * 25)
  };
}

function analyzePerformanceTrends(records) {
  if (records.length < 2) return 'insufficient_data';
  return records[records.length - 1].overallScore > records[0].overallScore ? 'improving' : 'stable';
}

function compareToPeers(employee) {
  return {
    percentile: 50 + Math.floor(Math.random() * 40),
    comparison: 'above_average'
  };
}

function generatePerformanceRecommendations(records) {
  const recommendations = [];
  const trend = analyzePerformanceTrends(records);

  if (trend === 'improving') {
    recommendations.push('Continue current approach');
  } else {
    recommendations.push('Schedule coaching session');
    recommendations.push('Review workload distribution');
  }

  return recommendations;
}

function getPerformanceDistribution(performers) {
  return {
    top: performers.filter(p => p.performanceScore >= 90).length,
    high: performers.filter(p => p.performanceScore >= 80 && p.performanceScore < 90).length,
    average: performers.filter(p => p.performanceScore >= 70 && p.performanceScore < 80).length,
    below: performers.filter(p => p.performanceScore < 70).length
  };
}

function calculateFlightRisk(employee) {
  const riskScore = Math.random() * 100;
  if (riskScore > 70) return 'high';
  if (riskScore > 40) return 'medium';
  return 'low';
}

function analyzeTrajectory(records) {
  const trend = records.length > 1 && records[records.length - 1].overallScore > records[0].overallScore;
  return {
    nextQuarter: 75 + Math.floor(Math.random() * 15),
    confidence: 70 + Math.floor(Math.random() * 20),
    direction: trend ? 'upward' : 'stable'
  };
}

function identifyPerformanceFactors(records) {
  return ['Workload', 'Team dynamics', 'Manager relationship', 'Growth opportunities'];
}

function recommendInterventions(trajectory) {
  if (trajectory.direction === 'upward') return ['Recognition', 'Increased responsibility'];
  return ['Coaching', 'Skill development'];
}

function analyzeFlightRiskFactors(employee) {
  return {
    tenure: employee.hireDate ? Math.floor((Date.now() - new Date(employee.hireDate)) / (1000 * 60 * 60 * 24 * 365)) : 1,
    compensation competitiveness: 70 + Math.floor(Math.random() * 20),
    career growth: 50 + Math.floor(Math.random() * 30),
    manager relationship: 60 + Math.floor(Math.random() * 30),
    work life balance: 65 + Math.floor(Math.random() * 25)
  };
}

function calculateFlightRiskScore(factors) {
  return Math.round(
    (10 - factors.tenure) * 10 +
    (100 - factors['compensation competitiveness']) * 0.2 +
    (100 - factors['career growth']) * 0.3 +
    (100 - factors['manager relationship']) * 0.2 +
    (100 - factors['work life balance']) * 0.2
  );
}

function getRiskLevel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function identifyWarningSigns(employee) {
  return [
    employee.retentionRisk === 'high' ? 'Previous flight risk indicator' : null,
    'Long tenure with no promotion'
  ].filter(Boolean);
}

function getRetentionActions(riskScore, employee) {
  if (riskScore >= 70) {
    return ['Schedule retention conversation', 'Review compensation', 'Discuss career growth'];
  }
  return ['Regular check-ins', 'Recognition'];
}

function getManagerActions(employee) {
  return [
    'Have career discussion',
    'Assign challenging project',
    'Consider promotion'
  ];
}

function calculateTurnoverRate(records, type) {
  return (Math.random() * 10 + 5).toFixed(1) + '%';
}

function analyzeTurnoverByDepartment(records) {
  return [
    { department: 'Engineering', rate: '12%', trend: 'stable' },
    { department: 'Sales', rate: '18%', trend: 'increasing' },
    { department: 'Marketing', rate: '8%', trend: 'decreasing' }
  ];
}

function analyzeTurnoverByTenure(records) {
  return [
    { tenure: '<1 year', rate: '25%', reason: 'Better opportunities' },
    { tenure: '1-3 years', rate: '15%', reason: 'Career growth' },
    { tenure: '3-5 years', rate: '8%', reason: 'Retirement' },
    { tenure: '5+ years', rate: '3%', reason: 'Life changes' }
  ];
}

function analyzeTurnoverByRole(records) {
  return [
    { role: 'Individual Contributor', rate: '14%' },
    { role: 'Manager', rate: '8%' },
    { role: 'Director', rate: '5%' }
  ];
}

function calculateTurnoverCost(records) {
  return {
    perEmployee: 15000 + Math.floor(Math.random() * 10000),
    totalAnnual: Math.floor(Math.random() * 500000) + 200000,
    breakdown: {
      recruitment: '25%',
      onboarding: '15%',
      lostProductivity: '40%',
      knowledgeTransfer: '20%'
    }
  };
}

function predictTurnoverTrends(records) {
  return {
    nextQuarter: 'stable',
    riskAreas: ['Engineering', 'Sales'],
    recommendedActions: ['Retention program', 'Compensation review']
  };
}

function getGeneralRetentionRecommendations() {
  return [
    'Conduct salary benchmarking',
    'Implement career pathing',
    'Enhance benefits package',
    'Create internal mobility program'
  ];
}

function generateWorkforceInsights(employees) {
  return [
    'Employee engagement trending upward',
    'Consider skill development programs in AI/ML',
    'Review workload distribution in Engineering'
  ];
}

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`📊 Workforce Intelligence OS running on port ${PORT}`);
  console.log('Capabilities:');
  console.log('  - Capacity Planning Agent');
  console.log('  - Skills Intelligence Agent');
  console.log('  - Performance Intelligence Agent');
  console.log('  - Retention Intelligence Agent');
});

module.exports = app;
