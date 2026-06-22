/**
 * HOJAI AI Governance Dashboard
 * Port: 4630 - Enterprise AI governance, usage analytics, and policy enforcement
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 4630;
const app: Express = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Types
interface AIUsageRecord {
  id: string;
  userId: string;
  teamId: string;
  departmentId: string;
  service: string;
  model: string;
  tokensUsed: number;
  cost: number;
  latency: number;
  timestamp: Date;
  status: 'success' | 'error' | 'rate_limited';
  metadata: Record<string, string>;
}

interface Policy {
  id: string;
  name: string;
  description: string;
  type: 'usage_limit' | 'content_filter' | 'access_control' | 'cost_control';
  rules: Record<string, unknown>;
  status: 'active' | 'inactive';
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

interface Team {
  id: string;
  name: string;
  department: string;
  monthlyBudget: number;
  currentSpend: number;
  userCount: number;
  policies: string[];
}

interface Alert {
  id: string;
  type: 'budget_exceeded' | 'policy_violation' | 'anomaly_detected' | 'rate_limit';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  teamId?: string;
  userId?: string;
  acknowledged: boolean;
  createdAt: Date;
}

// In-memory storage
const usageRecords: Map<string, AIUsageRecord> = new Map();
const policies: Map<string, Policy> = new Map();
const teams: Map<string, Team> = new Map();
const alerts: Map<string, Alert> = new Map();

// Middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
};

app.use(requestLogger);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-governance',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ==================== USAGE ANALYTICS ====================

// Get usage overview
app.get('/api/usage/overview', (req: Request, res: Response) => {
  const { startDate, endDate, teamId } = req.query;
  let records = Array.from(usageRecords.values());

  // Filter by date range
  if (startDate) {
    records = records.filter(r => new Date(r.timestamp) >= new Date(startDate as string));
  }
  if (endDate) {
    records = records.filter(r => new Date(r.timestamp) <= new Date(endDate as string));
  }
  if (teamId) {
    records = records.filter(r => r.teamId === teamId);
  }

  const totalTokens = records.reduce((sum, r) => sum + r.tokensUsed, 0);
  const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
  const avgLatency = records.length ? records.reduce((sum, r) => sum + r.latency, 0) / records.length : 0;

  res.json({
    period: { startDate, endDate },
    summary: {
      totalRequests: records.length,
      totalTokens,
      totalCost,
      avgLatencyMs: Math.round(avgLatency),
      successRate: records.length ?
        (records.filter(r => r.status === 'success').length / records.length * 100).toFixed(2) : 100
    },
    byService: groupBy(records, 'service'),
    byTeam: groupBy(records, 'teamId'),
    byModel: groupBy(records, 'model')
  });
});

// Get team usage
app.get('/api/usage/teams/:teamId', (req: Request, res: Response) => {
  const team = teams.get(req.params.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const teamRecords = Array.from(usageRecords.values())
    .filter(r => r.teamId === req.params.teamId);

  const dailyUsage = groupByDate(teamRecords);
  const topUsers = getTopUsers(teamRecords, 10);
  const topServices = getTopItems(teamRecords, 'service', 5);

  res.json({
    team,
    usage: {
      totalRequests: teamRecords.length,
      totalTokens: teamRecords.reduce((sum, r) => sum + r.tokensUsed, 0),
      totalCost: teamRecords.reduce((sum, r) => sum + r.cost, 0),
      budgetUsedPercent: team.monthlyBudget > 0 ?
        (team.currentSpend / team.monthlyBudget * 100).toFixed(2) : 0
    },
    dailyUsage,
    topUsers,
    topServices
  });
});

// Record usage
app.post('/api/usage/record', (req: Request, res: Response) => {
  const { userId, teamId, departmentId, service, model, tokensUsed, cost, latency, metadata } = req.body;

  const record: AIUsageRecord = {
    id: uuidv4(),
    userId: userId || 'anonymous',
    teamId: teamId || 'default',
    departmentId: departmentId || 'default',
    service: service || 'unknown',
    model: model || 'unknown',
    tokensUsed: tokensUsed || 0,
    cost: cost || 0,
    latency: latency || 0,
    timestamp: new Date(),
    status: 'success',
    metadata: metadata || {}
  };

  usageRecords.set(record.id, record);

  // Update team spend
  const team = teams.get(record.teamId);
  if (team) {
    team.currentSpend += record.cost;
    teams.set(team.id, team);

    // Check budget
    if (team.currentSpend >= team.monthlyBudget * 0.8) {
      createAlert({
        type: 'budget_exceeded',
        severity: team.currentSpend >= team.monthlyBudget ? 'critical' : 'warning',
        message: `Team ${team.name} has used ${(team.currentSpend / team.monthlyBudget * 100).toFixed(1)}% of monthly budget`,
        teamId: team.id
      });
    }
  }

  res.json({ record });
});

// ==================== POLICIES ====================

// List policies
app.get('/api/policies', (req: Request, res: Response) => {
  const { type, status } = req.query;
  let policyList = Array.from(policies.values());

  if (type) {
    policyList = policyList.filter(p => p.type === type);
  }
  if (status) {
    policyList = policyList.filter(p => p.status === status);
  }

  res.json({ policies: policyList, count: policyList.length });
});

// Create policy
app.post('/api/policies', (req: Request, res: Response) => {
  const { name, description, type, rules, severity } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  const policy: Policy = {
    id: uuidv4(),
    name,
    description: description || '',
    type,
    rules: rules || {},
    status: 'active',
    severity: severity || 'medium',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  policies.set(policy.id, policy);
  res.status(201).json({ policy });
});

// Update policy
app.put('/api/policies/:id', (req: Request, res: Response) => {
  const policy = policies.get(req.params.id);
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  const { name, description, rules, status, severity } = req.body;

  if (name) policy.name = name;
  if (description) policy.description = description;
  if (rules) policy.rules = { ...policy.rules, ...rules };
  if (status) policy.status = status;
  if (severity) policy.severity = severity;
  policy.updatedAt = new Date();

  policies.set(policy.id, policy);
  res.json({ policy });
});

// Delete policy
app.delete('/api/policies/:id', (req: Request, res: Response) => {
  const deleted = policies.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Policy not found' });
  }
  res.json({ success: true });
});

// Check policy compliance
app.post('/api/policies/check', (req: Request, res: Response) => {
  const { userId, teamId, action, content } = req.body;

  const activePolicies = Array.from(policies.values()).filter(p => p.status === 'active');
  const violations: { policyId: string; policyName: string; severity: string }[] = [];

  for (const policy of activePolicies) {
    // Check content filter
    if (policy.type === 'content_filter' && content) {
      const prohibited = policy.rules.prohibitedKeywords as string[] || [];
      if (prohibited.some(k => content.toLowerCase().includes(k.toLowerCase()))) {
        violations.push({
          policyId: policy.id,
          policyName: policy.name,
          severity: policy.severity
        });
      }
    }

    // Check access control
    if (policy.type === 'access_control' && action) {
      const allowedActions = policy.rules.allowedActions as string[] || [];
      if (allowedActions.length && !allowedActions.includes(action)) {
        violations.push({
          policyId: policy.id,
          policyName: policy.name,
          severity: policy.severity
        });
      }
    }
  }

  res.json({
    compliant: violations.length === 0,
    violations,
    action: violations.length ? 'blocked' : 'allowed'
  });
});

// ==================== TEAMS ====================

// List teams
app.get('/api/teams', (_req: Request, res: Response) => {
  const teamList = Array.from(teams.values());
  res.json({ teams: teamList, count: teamList.length });
});

// Create team
app.post('/api/teams', (req: Request, res: Response) => {
  const { name, department, monthlyBudget, userCount } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const team: Team = {
    id: uuidv4(),
    name,
    department: department || 'General',
    monthlyBudget: monthlyBudget || 1000,
    currentSpend: 0,
    userCount: userCount || 1,
    policies: []
  };

  teams.set(team.id, team);
  res.status(201).json({ team });
});

// Get team
app.get('/api/teams/:id', (req: Request, res: Response) => {
  const team = teams.get(req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  res.json({ team });
});

// Update team
app.put('/api/teams/:id', (req: Request, res: Response) => {
  const team = teams.get(req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const { name, monthlyBudget, userCount, policies } = req.body;

  if (name) team.name = name;
  if (monthlyBudget) team.monthlyBudget = monthlyBudget;
  if (userCount) team.userCount = userCount;
  if (policies) team.policies = policies;

  teams.set(team.id, team);
  res.json({ team });
});

// ==================== ALERTS ====================

// Get alerts
app.get('/api/alerts', (req: Request, res: Response) => {
  const { severity, acknowledged } = req.query;
  let alertList = Array.from(alerts.values());

  if (severity) {
    alertList = alertList.filter(a => a.severity === severity);
  }
  if (acknowledged !== undefined) {
    alertList = alertList.filter(a => a.acknowledged === (acknowledged === 'true'));
  }

  // Sort by date, newest first
  alertList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ alerts: alertList, count: alertList.length });
});

// Acknowledge alert
app.post('/api/alerts/:id/acknowledge', (req: Request, res: Response) => {
  const alert = alerts.get(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.acknowledged = true;
  alerts.set(alert.id, alert);
  res.json({ alert });
});

// ==================== DASHBOARD ====================

// Get dashboard summary
app.get('/api/dashboard', (_req: Request, res: Response) => {
  const records = Array.from(usageRecords.values());
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayRecords = records.filter(r => r.timestamp >= todayStart);

  res.json({
    overview: {
      totalTeams: teams.size,
      activePolicies: Array.from(policies.values()).filter(p => p.status === 'active').length,
      totalAlerts: alerts.size,
      unacknowledgedAlerts: Array.from(alerts.values()).filter(a => !a.acknowledged).length
    },
    today: {
      requests: todayRecords.length,
      tokens: todayRecords.reduce((sum, r) => sum + r.tokensUsed, 0),
      cost: todayRecords.reduce((sum, r) => sum + r.cost, 0)
    },
    topTeams: getTopTeams(5),
    recentAlerts: Array.from(alerts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5),
    budgetStatus: teams.size ? {
      totalBudget: Array.from(teams.values()).reduce((sum, t) => sum + t.monthlyBudget, 0),
      totalSpend: Array.from(teams.values()).reduce((sum, t) => sum + t.currentSpend, 0)
    } : { totalBudget: 0, totalSpend: 0 }
  });
});

// ==================== HELPER FUNCTIONS ====================

function groupBy(items: AIUsageRecord[], key: keyof AIUsageRecord): Record<string, { count: number; tokens: number; cost: number }> {
  return items.reduce((acc, item) => {
    const value = String(item[key] || 'unknown');
    if (!acc[value]) {
      acc[value] = { count: 0, tokens: 0, cost: 0 };
    }
    acc[value].count++;
    acc[value].tokens += item.tokensUsed;
    acc[value].cost += item.cost;
    return acc;
  }, {} as Record<string, { count: number; tokens: number; cost: number }>);
}

function groupByDate(items: AIUsageRecord[]): { date: string; count: number; cost: number }[] {
  const byDate: Record<string, { count: number; cost: number }> = {};

  for (const item of items) {
    const date = item.timestamp.toISOString().split('T')[0];
    if (!byDate[date]) {
      byDate[date] = { count: 0, cost: 0 };
    }
    byDate[date].count++;
    byDate[date].cost += item.cost;
  }

  return Object.entries(byDate)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getTopUsers(records: AIUsageRecord[], limit: number): { userId: string; count: number; cost: number }[] {
  const byUser = records.reduce((acc, r) => {
    if (!acc[r.userId]) acc[r.userId] = { count: 0, cost: 0 };
    acc[r.userId].count++;
    acc[r.userId].cost += r.cost;
    return acc;
  }, {} as Record<string, { count: number; cost: number }>);

  return Object.entries(byUser)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);
}

function getTopItems(records: AIUsageRecord[], key: keyof AIUsageRecord, limit: number): { item: string; count: number; cost: number }[] {
  const grouped = groupBy(records, key);
  return Object.entries(grouped)
    .map(([item, data]) => ({ item, ...data }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);
}

function getTopTeams(limit: number): { teamId: string; name: string; spend: number; budget: number }[] {
  return Array.from(teams.values())
    .sort((a, b) => b.currentSpend - a.currentSpend)
    .slice(0, limit)
    .map(t => ({ teamId: t.id, name: t.name, spend: t.currentSpend, budget: t.monthlyBudget }));
}

function createAlert(data: Omit<Alert, 'id' | 'acknowledged' | 'createdAt'>): Alert {
  const alert: Alert = {
    id: uuidv4(),
    ...data,
    acknowledged: false,
    createdAt: new Date()
  };
  alerts.set(alert.id, alert);
  return alert;
}

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`HOJAI Governance Dashboard running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Dashboard: http://localhost:${PORT}/api/dashboard`);
});

export default app;
