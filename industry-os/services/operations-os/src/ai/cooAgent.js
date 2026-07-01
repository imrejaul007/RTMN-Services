/**
 * Operations OS - COO Intelligence & AI Agent Suite
 * Strategic AI agents with LLM integration
 */

const { db } = require('../db/database');
const { twinSync } = require('../integrations/twinos-sync');
const { memoryOS } = require('../integrations/memoryos');

// LLM Client for AI agents
class LLMClient {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'openai';
    this.apiKey = process.env.LLM_API_KEY;
    this.model = process.env.LLM_MODEL || 'gpt-4';
    this.baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  }

  async complete(prompt, system = '') {
    if (!this.apiKey) {
      return this.mockComplete(prompt, system);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (err) {
      console.error('LLM error:', err.message);
      return this.mockComplete(prompt, system);
    }
  }

  mockComplete(prompt, system) {
    return `Based on the ${system ? 'context' : 'query'}, here are insights and recommendations. This is a mock response from the COO Agent system.`;
  }
}

// COO Agent
class COOAgent {
  constructor() {
    this.llm = new LLMClient();
    this.name = 'Chief Operations Officer AI';
    this.role = 'Strategic Operations';
    this.systemPrompt = `You are an expert Chief Operations Officer with deep knowledge of:
- Business operations and process optimization
- Strategic planning and execution
- Resource allocation and capacity planning
- Risk management and mitigation
- Performance metrics and KPIs
- Cross-functional coordination

Provide actionable, data-driven recommendations. Format responses clearly with headers, bullet points, and specific action items when appropriate.`;
  }

  async analyze(query, context) {
    const prompt = `Analyze the following operations query and provide strategic recommendations:

Query: ${query}

Current Context:
- Projects: ${context.projects?.length || 0} active
- Tasks: ${context.tasks?.length || 0} pending
- Incidents: ${context.incidents?.filter(i => i.status !== 'resolved').length || 0} open
- Risks: ${context.risks?.length || 0} identified

Provide:
1. Situation Assessment
2. Key Issues
3. Strategic Recommendations
4. Immediate Actions (next 24 hours)
5. Medium-term Actions (next week)`;

    const response = await this.llm.complete(prompt, this.systemPrompt);

    return {
      agent: this.name,
      query,
      analysis: response,
      timestamp: new Date().toISOString(),
    };
  }

  async generatePlan(objective, constraints) {
    const prompt = `Generate a comprehensive operations plan for the following objective:

Objective: ${objective}

Constraints:
${Object.entries(constraints).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Create a structured plan with:
1. Executive Summary
2. Key Milestones
3. Resource Requirements
4. Risk Mitigation
5. Success Metrics`;

    const response = await this.llm.complete(prompt, this.systemPrompt);

    return {
      objective,
      plan: response,
      generatedAt: new Date().toISOString(),
    };
  }
}

// Operations Intelligence
class OperationsIntelligence {
  constructor() {
    this.db = db;
    this.agents = {
      coo: new COOAgent(),
    };
  }

  /**
   * Get company health score
   */
  async getCompanyHealth() {
    const projects = this.db.getAll('projects');
    const tasks = this.db.getAll('tasks');
    const incidents = this.db.getAll('incidents');
    const risks = this.db.getAll('risks');
    const resources = this.db.getAll('resources');

    // Calculate component scores
    const projectScore = this.scoreProjects(projects);
    const taskScore = this.scoreTasks(tasks);
    const incidentScore = this.scoreIncidents(incidents);
    const riskScore = this.scoreRisks(risks);
    const resourceScore = this.scoreResources(resources);

    // Weighted average
    const weights = { project: 0.3, task: 0.2, incident: 0.2, risk: 0.15, resource: 0.15 };
    const overall = Math.round(
      projectScore * weights.project +
      taskScore * weights.task +
      incidentScore * weights.incident +
      riskScore * weights.risk +
      resourceScore * weights.resource
    );

    return {
      overall,
      grade: this.getGrade(overall),
      components: {
        projects: { score: projectScore, weight: weights.project },
        tasks: { score: taskScore, weight: weights.task },
        incidents: { score: incidentScore, weight: weights.incident },
        risks: { score: riskScore, weight: weights.risk },
        resources: { score: resourceScore, weight: weights.resource },
      },
      trend: this.getTrend(),
      recommendations: this.generateRecommendations({
        projects, tasks, incidents, risks, resources
      }),
      calculatedAt: new Date().toISOString(),
    };
  }

  scoreProjects(projects) {
    if (projects.length === 0) return 100;

    const onTrack = projects.filter(p => p.progress >= 50).length;
    const atRisk = projects.filter(p => p.progress < 50 && p.progress > 20).length;
    const critical = projects.filter(p => p.progress <= 20).length;

    return Math.round(
      (onTrack * 100 + atRisk * 60 + critical * 30) / projects.length
    );
  }

  scoreTasks(tasks) {
    if (tasks.length === 0) return 100;

    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t =>
      t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
    ).length;

    return Math.round(
      ((completed + tasks.length - overdue) / (2 * tasks.length)) * 100
    );
  }

  scoreIncidents(incidents) {
    const open = incidents.filter(i => i.status !== 'resolved').length;
    const critical = incidents.filter(i =>
      i.severity === 'critical' && i.status !== 'resolved'
    ).length;

    if (open === 0) return 100;
    if (critical > 0) return 30;
    if (open <= 3) return 80;
    return 60;
  }

  scoreRisks(risks) {
    if (risks.length === 0) return 100;

    const high = risks.filter(r =>
      (r.impact === 'high' || r.impact === 'critical') &&
      r.status !== 'mitigated'
    ).length;

    return Math.max(0, 100 - high * 15);
  }

  scoreResources(resources) {
    if (resources.length === 0) return 100;

    const avgUtilization = resources.reduce((sum, r) => sum + (r.utilization || 0), 0) / resources.length;
    const underUtilized = resources.filter(r => r.utilization < 30).length;

    let score = 100;
    if (avgUtilization > 90) score = 70;
    if (avgUtilization > 95) score = 50;
    if (underUtilized > resources.length * 0.3) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'C+';
    if (score >= 65) return 'C';
    return 'F';
  }

  getTrend() {
    // This would compare with historical data
    return 'stable';
  }

  generateRecommendations(context) {
    const recommendations = [];

    // Project recommendations
    if (context.projects.some(p => p.progress < 30)) {
      recommendations.push({
        area: 'Projects',
        priority: 'high',
        message: 'Some projects are significantly behind schedule',
        action: 'Review critical path and resource allocation',
      });
    }

    // Task recommendations
    const overdueTasks = context.tasks.filter(t =>
      t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
    );
    if (overdueTasks.length > 5) {
      recommendations.push({
        area: 'Tasks',
        priority: 'high',
        message: `${overdueTasks.length} tasks are overdue`,
        action: 'Prioritize overdue tasks and consider delegation',
      });
    }

    // Incident recommendations
    const criticalIncidents = context.incidents.filter(i =>
      i.severity === 'critical' && i.status !== 'resolved'
    );
    if (criticalIncidents.length > 0) {
      recommendations.push({
        area: 'Incidents',
        priority: 'critical',
        message: `${criticalIncidents.length} critical incidents unresolved`,
        action: 'Immediate escalation required',
      });
    }

    // Risk recommendations
    const unmitigatedRisks = context.risks.filter(r =>
      (r.impact === 'high' || r.impact === 'critical') && r.status !== 'mitigated'
    );
    if (unmitigatedRisks.length > 3) {
      recommendations.push({
        area: 'Risks',
        priority: 'medium',
        message: `${unmitigatedRisks.length} high-impact risks need mitigation`,
        action: 'Develop mitigation plans for top risks',
      });
    }

    return recommendations;
  }

  /**
   * Query with natural language
   */
  async query(question) {
    const context = {
      projects: this.db.getAll('projects'),
      tasks: this.db.getAll('tasks'),
      incidents: this.db.getAll('incidents'),
      risks: this.db.getAll('risks'),
      resources: this.db.getAll('resources'),
    };

    const health = await this.getCompanyHealth();

    const analysis = await this.agents.coo.analyze(question, {
      ...context,
      health,
    });

    return {
      question,
      answer: analysis,
      context: {
        activeProjects: context.projects.filter(p => p.status === 'in_progress').length,
        pendingTasks: context.tasks.filter(t => t.status !== 'completed').length,
        openIncidents: context.incidents.filter(i => i.status !== 'resolved').length,
        healthScore: health.overall,
      },
    };
  }

  /**
   * Sync all twins to TwinOS
   */
  async syncTwins() {
    const health = await this.getCompanyHealth();

    // Create/update company twin
    const companyTwin = {
      id: 'COMPANY-OPERATIONS',
      name: 'Company Operations Twin',
      type: 'company',
      data: health,
      health: { score: health.overall, status: health.overall >= 70 ? 'healthy' : 'at_risk' },
      sync: {
        source: 'operations-os',
        timestamp: new Date().toISOString(),
      },
    };

    await twinSync.syncTwin(companyTwin);
    await memoryOS.storeTwinState(companyTwin);

    return companyTwin;
  }
}

// Digital Twin Manager
class TwinManager {
  constructor() {
    this.db = db;
  }

  /**
   * Create/update twin
   */
  syncTwin(type, data) {
    const twin = {
      id: `TWIN-${type.toUpperCase()}`,
      name: `${type} Digital Twin`,
      type,
      lastUpdated: new Date().toISOString(),
      data,
      health: this.calculateTwinHealth(type, data),
      sync: {
        source: 'operations-os',
        timestamp: new Date().toISOString(),
      },
    };

    this.db.set('twins', twin.id, twin);
    return twin;
  }

  calculateTwinHealth(type, data) {
    const scores = {
      project: () => data.progress || 50,
      task: () => data.completionRate || 70,
      incident: () => data.resolvedRate || 80,
      risk: () => 100 - (data.highRisks || 0) * 10,
      resource: () => 100 - Math.abs((data.avgUtilization || 70) - 80),
      quality: () => data.auditScore || 80,
    };

    const score = scores[type]?.() || 50;

    return {
      score: Math.max(0, Math.min(100, score)),
      status: score >= 70 ? 'healthy' : score >= 50 ? 'at_risk' : 'critical',
    };
  }

  /**
   * Get all twins
   */
  getAllTwins() {
    return Array.from(this.db.getAll('twins'));
  }

  /**
   * Get twin by type
   */
  getTwin(type) {
    return this.db.get('twins', `TWIN-${type.toUpperCase()}`);
  }

  /**
   * Update all twins
   */
  updateAllTwins() {
    const projects = this.db.getAll('projects');
    const tasks = this.db.getAll('tasks');
    const incidents = this.db.getAll('incidents');
    const risks = this.db.getAll('risks');
    const resources = this.db.getAll('resources');

    const twins = [
      this.syncTwin('project', {
        count: projects.length,
        active: projects.filter(p => p.status === 'in_progress').length,
        progress: projects.reduce((sum, p) => sum + (p.progress || 0), 0) / Math.max(projects.length, 1),
      }),
      this.syncTwin('task', {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        completionRate: tasks.length > 0
          ? tasks.filter(t => t.status === 'completed').length / tasks.length * 100
          : 100,
      }),
      this.syncTwin('incident', {
        total: incidents.length,
        open: incidents.filter(i => i.status !== 'resolved').length,
        critical: incidents.filter(i => i.severity === 'critical').length,
        resolvedRate: incidents.length > 0
          ? incidents.filter(i => i.status === 'resolved').length / incidents.length * 100
          : 100,
      }),
      this.syncTwin('risk', {
        total: risks.length,
        highRisks: risks.filter(r => r.impact === 'high' || r.impact === 'critical').length,
        mitigated: risks.filter(r => r.status === 'mitigated').length,
      }),
      this.syncTwin('resource', {
        count: resources.length,
        avgUtilization: resources.length > 0
          ? resources.reduce((sum, r) => sum + (r.utilization || 0), 0) / resources.length
          : 0,
      }),
    ];

    return twins;
  }
}

// Express routes
function registerIntelligenceRoutes(app) {
  const intelligence = new OperationsIntelligence();
  const twins = new TwinManager();

  // ============ COO AGENT ============

  // Query with natural language
  app.post('/api/intelligence/query', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const result = await intelligence.query(question);
    res.json(result);
  });

  // Get company health
  app.get('/api/intelligence/health', async (req, res) => {
    const health = await intelligence.getCompanyHealth();
    res.json(health);
  });

  // Generate plan
  app.post('/api/intelligence/plan', async (req, res) => {
    const { objective, constraints } = req.body;
    if (!objective) return res.status(400).json({ error: 'objective required' });

    const plan = await intelligence.agents.coo.generatePlan(objective, constraints || {});
    res.json(plan);
  });

  // ============ TWINS ============

  // Get all twins
  app.get('/api/intelligence/twins', (req, res) => {
    const allTwins = twins.getAllTwins();
    res.json({ twins: allTwins, total: allTwins.length });
  });

  // Get twin by type
  app.get('/api/intelligence/twins/:type', (req, res) => {
    const twin = twins.getTwin(req.params.type);
    if (!twin) return res.status(404).json({ error: 'Twin not found' });
    res.json(twin);
  });

  // Update all twins
  app.post('/api/intelligence/twins/sync', async (req, res) => {
    const updatedTwins = twins.updateAllTwins();

    // Also sync to TwinOS
    await intelligence.syncTwins();

    res.json({ twins: updatedTwins, synced: true });
  });

  // Sync to TwinOS
  app.post('/api/intelligence/twins/twinos-sync', async (req, res) => {
    const twin = await intelligence.syncTwins();
    res.json(twin);
  });

  // ============ AGENTS ============

  // List agents
  app.get('/api/intelligence/agents', (req, res) => {
    const agents = [
      {
        id: 'coo',
        name: 'Chief Operations Officer AI',
        role: 'Strategic Operations',
        status: 'active',
        capabilities: ['Analysis', 'Planning', 'Health Assessment', 'Recommendations'],
      },
    ];
    res.json({ agents });
  });

  // Get agent status
  app.get('/api/intelligence/agents/:id', (req, res) => {
    const agent = intelligence.agents[req.params.id];
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    res.json({
      name: agent.name,
      role: agent.role,
      status: 'active',
    });
  });
}

module.exports = {
  COOAgent,
  OperationsIntelligence,
  TwinManager,
  LLMClient,
  registerIntelligenceRoutes,
};
