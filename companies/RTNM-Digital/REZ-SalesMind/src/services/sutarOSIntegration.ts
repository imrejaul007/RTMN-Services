/**
 * REZ SalesMind - SUTAR OS Integration Service
 * Integration with SUTAR OS for autonomous goals, karma economy, agents, and decisions
 * SUTAR OS is typically available at port 4140 or via service discovery
 */

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Goal {
  id: string;
  name: string;
  description?: string;
  category: 'sales' | 'marketing' | 'outreach' | 'follow_up' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  assignedTo?: string;
  metadata?: Record<string, any>;
}

export interface KarmaAccount {
  id: string;
  score: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalEarned: number;
  totalSpent: number;
  transactions: KarmaTransaction[];
  rank?: number;
  percentile?: number;
}

export interface KarmaTransaction {
  id: string;
  action: string;
  points: number;
  reason: string;
  timestamp: Date;
  source: string;
}

export interface KarmaReward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'badge' | 'feature' | 'credit' | 'recognition';
  available: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  status: 'idle' | 'working' | 'paused' | 'error';
  currentTask?: string;
  createdAt: Date;
  lastActive?: Date;
  ownerId?: string;
  performance?: AgentPerformance;
}

export interface AgentPerformance {
  tasksCompleted: number;
  avgTaskTime: number;
  successRate: number;
  karmaEarned: number;
}

export interface Task {
  id: string;
  agentId: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface Decision {
  id: string;
  context: string;
  options: DecisionOption[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  estimatedOutcome?: string;
  confidence?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  deployedAt?: Date;
  lastRun?: Date;
  runs?: WorkflowRun[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  action: string;
  params: Record<string, any>;
  nextStep?: string;
  onError?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  currentStep: string;
  startedAt: Date;
  completedAt?: Date;
  results: Record<string, any>;
}

export interface SUTARConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

// In-memory storage (for mock mode)
const goals = new Map<string, Goal>();
const karmaAccounts = new Map<string, KarmaAccount>();
const agents = new Map<string, Agent>();
const tasks = new Map<string, Task>();
const decisions = new Map<string, Decision>();
const workflows = new Map<string, Workflow>();

// Initialize mock data
initializeMockData();

function initializeMockData() {
  // Sample goals
  const sampleGoals: Goal[] = [
    {
      id: 'goal_001',
      name: 'Monthly Revenue Target',
      description: 'Achieve monthly sales revenue target',
      category: 'sales',
      targetValue: 100000,
      currentValue: 67500,
      unit: 'USD',
      status: 'active',
      priority: 'high',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: 'goal_002',
      name: 'New Leads This Month',
      description: 'Generate 50 new qualified leads',
      category: 'outreach',
      targetValue: 50,
      currentValue: 32,
      unit: 'leads',
      status: 'active',
      priority: 'medium',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: 'goal_003',
      name: 'Demo Conversion Rate',
      description: 'Achieve 25% demo to close rate',
      category: 'sales',
      targetValue: 25,
      currentValue: 18,
      unit: 'percent',
      status: 'active',
      priority: 'high',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  ];

  sampleGoals.forEach(g => goals.set(g.id, g));

  // Sample karma account
  const sampleKarma: KarmaAccount = {
    id: 'karma_001',
    score: 2450,
    tier: 'gold',
    totalEarned: 3200,
    totalSpent: 750,
    rank: 15,
    percentile: 92,
    transactions: [
      { id: 'tx_001', action: 'goal_completed', points: 500, reason: 'Completed Monthly Revenue Target', timestamp: new Date(Date.now() - 86400000), source: 'GoalOS' },
      { id: 'tx_002', action: 'deal_closed', points: 1000, reason: 'Closed enterprise deal worth $50K', timestamp: new Date(Date.now() - 172800000), source: 'Sales' },
      { id: 'tx_003', action: 'lead_quality', points: 200, reason: 'Generated high-quality leads', timestamp: new Date(Date.now() - 259200000), source: 'Outreach' },
    ],
  };

  karmaAccounts.set('default', sampleKarma);

  // Sample agents
  const sampleAgents: Agent[] = [
    {
      id: 'agent_001',
      name: 'OutreachBot',
      role: 'Sales Outreach Specialist',
      capabilities: ['email_outreach', 'linkedin_connect', 'follow_up', 'lead_qualification'],
      status: 'working',
      currentTask: 'Qualifying leads in tech industry',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastActive: new Date(),
      performance: { tasksCompleted: 156, avgTaskTime: 45, successRate: 87, karmaEarned: 320 },
    },
    {
      id: 'agent_002',
      name: 'FollowUpBot',
      role: 'Follow-up Coordinator',
      capabilities: ['email_followup', 'call_reminder', 'meeting_schedule'],
      status: 'idle',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      lastActive: new Date(Date.now() - 3600000),
      performance: { tasksCompleted: 423, avgTaskTime: 12, successRate: 94, karmaEarned: 580 },
    },
  ];

  sampleAgents.forEach(a => agents.set(a.id, a));

  // Sample workflows
  const sampleWorkflows: Workflow[] = [
    {
      id: 'wf_001',
      name: 'Lead Qualification Pipeline',
      description: 'Automatically qualify and route new leads',
      steps: [
        { id: 's1', name: 'Score Lead', action: 'score_lead', params: { source: 'any' } },
        { id: 's2', name: 'Route to Queue', action: 'route_queue', params: { queue: 'sales' } },
        { id: 's3', name: 'Send Welcome', action: 'send_email', params: { template: 'welcome' } },
      ],
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      deployedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      lastRun: new Date(Date.now() - 3600000),
    },
  ];

  sampleWorkflows.forEach(w => workflows.set(w.id, w));
}

// SUTAR OS Integration
export class SUTAROSIntegration {
  private client: AxiosInstance;
  private baseUrl: string;
  private useMock: boolean = true;

  constructor() {
    this.baseUrl = process.env.SUTAR_OS_URL || 'http://localhost:4140';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.SUTAR_API_KEY || '',
      },
    });

    // Check if SUTAR OS is available
    this.checkConnection();
  }

  private async checkConnection(): Promise<void> {
    try {
      await this.client.get('/health');
      this.useMock = false;
      console.log('[SUTAR OS] Connected to production service');
    } catch {
      this.useMock = true;
      console.log('[SUTAR OS] Running in mock mode');
    }
  }

  // ==================== Goals & Karma ====================

  /**
   * Create a new autonomous goal
   */
  async createGoal(goalData: Partial<Goal>): Promise<Goal> {
    if (this.useMock) {
      const goal: Goal = {
        id: `goal_${uuidv4()}`,
        name: goalData.name || 'New Goal',
        description: goalData.description,
        category: goalData.category || 'custom',
        targetValue: goalData.targetValue || 100,
        currentValue: goalData.currentValue || 0,
        unit: goalData.unit || 'items',
        status: 'active',
        priority: goalData.priority || 'medium',
        deadline: goalData.deadline,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: goalData.assignedTo,
        metadata: goalData.metadata,
      };
      goals.set(goal.id, goal);
      return goal;
    }

    const response = await this.client.post('/api/goals', goalData);
    return response.data;
  }

  /**
   * Update goal progress
   */
  async updateGoal(goalId: string, progress: number): Promise<Goal> {
    if (this.useMock) {
      const goal = goals.get(goalId);
      if (!goal) throw new Error(`Goal ${goalId} not found`);

      goal.currentValue = progress;
      goal.updatedAt = new Date();

      if (goal.currentValue >= goal.targetValue) {
        goal.status = 'completed';
        goal.completedAt = new Date();
        // Earn karma for completing goal
        await this.earnKarma('goal_completed', Math.floor(goal.targetValue / 10), `Completed goal: ${goal.name}`);
      }

      return goal;
    }

    const response = await this.client.put(`/api/goals/${goalId}`, { currentValue: progress });
    return response.data;
  }

  /**
   * Complete a goal manually
   */
  async completeGoal(goalId: string): Promise<Goal> {
    if (this.useMock) {
      const goal = goals.get(goalId);
      if (!goal) throw new Error(`Goal ${goalId} not found`);

      goal.status = 'completed';
      goal.completedAt = new Date();
      goal.updatedAt = new Date();
      goal.currentValue = goal.targetValue;

      await this.earnKarma('goal_completed', Math.floor(goal.targetValue / 10), `Completed goal: ${goal.name}`);

      return goal;
    }

    const response = await this.client.post(`/api/goals/${goalId}/complete`);
    return response.data;
  }

  /**
   * Get goals by status
   */
  async getGoals(status?: Goal['status']): Promise<Goal[]> {
    if (this.useMock) {
      const allGoals = Array.from(goals.values());
      if (status) {
        return allGoals.filter(g => g.status === status);
      }
      return allGoals;
    }

    const params = status ? { status } : {};
    const response = await this.client.get('/api/goals', { params });
    return response.data;
  }

  /**
   * Get a specific goal
   */
  async getGoal(goalId: string): Promise<Goal | null> {
    if (this.useMock) {
      return goals.get(goalId) || null;
    }

    const response = await this.client.get(`/api/goals/${goalId}`);
    return response.data;
  }

  /**
   * Pause a goal
   */
  async pauseGoal(goalId: string): Promise<Goal> {
    if (this.useMock) {
      const goal = goals.get(goalId);
      if (!goal) throw new Error(`Goal ${goalId} not found`);
      goal.status = 'paused';
      goal.updatedAt = new Date();
      return goal;
    }

    const response = await this.client.post(`/api/goals/${goalId}/pause`);
    return response.data;
  }

  /**
   * Resume a goal
   */
  async resumeGoal(goalId: string): Promise<Goal> {
    if (this.useMock) {
      const goal = goals.get(goalId);
      if (!goal) throw new Error(`Goal ${goalId} not found`);
      goal.status = 'active';
      goal.updatedAt = new Date();
      return goal;
    }

    const response = await this.client.post(`/api/goals/${goalId}/resume`);
    return response.data;
  }

  // ==================== Karma System ====================

  /**
   * Get karma score
   */
  async getKarmaScore(accountId?: string): Promise<KarmaAccount> {
    if (this.useMock) {
      return karmaAccounts.get(accountId || 'default') || karmaAccounts.get('default')!;
    }

    const id = accountId || 'default';
    const response = await this.client.get(`/api/karma/${id}`);
    return response.data;
  }

  /**
   * Earn karma points
   */
  async earnKarma(action: string, points: number, reason: string): Promise<KarmaAccount> {
    if (this.useMock) {
      const account = karmaAccounts.get('default')!;

      const transaction: KarmaTransaction = {
        id: `tx_${uuidv4()}`,
        action,
        points,
        reason,
        timestamp: new Date(),
        source: 'SalesMind',
      };

      account.transactions.unshift(transaction);
      account.totalEarned += points;
      account.score += points;

      // Update tier
      if (account.score >= 10000) account.tier = 'platinum';
      else if (account.score >= 5000) account.tier = 'gold';
      else if (account.score >= 2500) account.tier = 'silver';

      return account;
    }

    const response = await this.client.post('/api/karma/earn', { action, points, reason });
    return response.data;
  }

  /**
   * Spend karma points
   */
  async spendKarma(rewardId: string): Promise<{ success: boolean; reward: KarmaReward; newBalance: number }> {
    const availableRewards = this.getAvailableRewards();
    const reward = availableRewards.find(r => r.id === rewardId);

    if (!reward) throw new Error('Reward not found');
    if (!reward.available) throw new Error('Reward not available');
    if (reward.cost > (karmaAccounts.get('default')?.score || 0)) {
      throw new Error('Insufficient karma balance');
    }

    if (this.useMock) {
      const account = karmaAccounts.get('default')!;
      account.score -= reward.cost;
      account.totalSpent += reward.cost;

      return {
        success: true,
        reward,
        newBalance: account.score,
      };
    }

    const response = await this.client.post('/api/karma/spend', { rewardId });
    return response.data;
  }

  /**
   * Get available rewards
   */
  getAvailableRewards(): KarmaReward[] {
    return [
      { id: 'reward_001', name: 'Premium Feature Unlock', description: 'Unlock advanced analytics features', cost: 500, type: 'feature', available: true },
      { id: 'reward_002', name: 'Top Performer Badge', description: 'Display top performer badge on profile', cost: 300, type: 'badge', available: true },
      { id: 'reward_003', name: 'Extra Outreach Quota', description: '+100 outreach messages this month', cost: 200, type: 'credit', available: true },
      { id: 'reward_004', name: 'Team Shoutout', description: 'Get recognized in team meeting', cost: 100, type: 'recognition', available: true },
      { id: 'reward_005', name: 'Priority Support', description: '24/7 priority support access', cost: 750, type: 'feature', available: false },
    ];
  }

  // ==================== Autonomous Agents ====================

  /**
   * Create an autonomous agent
   */
  async createAgent(name: string, role: string, capabilities: string[]): Promise<Agent> {
    if (this.useMock) {
      const agent: Agent = {
        id: `agent_${uuidv4()}`,
        name,
        role,
        capabilities,
        status: 'idle',
        createdAt: new Date(),
        performance: { tasksCompleted: 0, avgTaskTime: 0, successRate: 0, karmaEarned: 0 },
      };
      agents.set(agent.id, agent);
      return agent;
    }

    const response = await this.client.post('/api/agents', { name, role, capabilities });
    return response.data;
  }

  /**
   * Deploy an agent to perform a task
   */
  async deployAgent(agentId: string, task: string): Promise<Task> {
    if (this.useMock) {
      const agent = agents.get(agentId);
      if (!agent) throw new Error(`Agent ${agentId} not found`);

      agent.status = 'working';
      agent.currentTask = task;
      agent.lastActive = new Date();

      const taskObj: Task = {
        id: `task_${uuidv4()}`,
        agentId,
        description: task,
        status: 'running',
        createdAt: new Date(),
        startedAt: new Date(),
      };
      tasks.set(taskObj.id, taskObj);

      // Simulate task completion
      setTimeout(() => {
        taskObj.status = 'completed';
        taskObj.completedAt = new Date();
        taskObj.result = { success: true, output: `Task "${task}" completed successfully` };

        agent.status = 'idle';
        agent.currentTask = undefined;
        agent.performance!.tasksCompleted++;

        this.earnKarma('agent_task_completed', 50, `Agent ${agent.name} completed task`);
      }, 5000);

      return taskObj;
    }

    const response = await this.client.post(`/api/agents/${agentId}/deploy`, { task });
    return response.data;
  }

  /**
   * Get agent status
   */
  async getAgentStatus(agentId: string): Promise<Agent | null> {
    if (this.useMock) {
      return agents.get(agentId) || null;
    }

    const response = await this.client.get(`/api/agents/${agentId}`);
    return response.data;
  }

  /**
   * Get agent results
   */
  async getAgentResults(agentId: string): Promise<Task[]> {
    if (this.useMock) {
      return Array.from(tasks.values()).filter(t => t.agentId === agentId);
    }

    const response = await this.client.get(`/api/agents/${agentId}/results`);
    return response.data;
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<Agent> {
    if (this.useMock) {
      const agent = agents.get(agentId);
      if (!agent) throw new Error(`Agent ${agentId} not found`);

      agent.status = 'paused';
      agent.currentTask = undefined;

      return agent;
    }

    const response = await this.client.post(`/api/agents/${agentId}/stop`);
    return response.data;
  }

  /**
   * Get all agents
   */
  async getAllAgents(): Promise<Agent[]> {
    if (this.useMock) {
      return Array.from(agents.values());
    }

    const response = await this.client.get('/api/agents');
    return response.data;
  }

  // ==================== Decisions ====================

  /**
   * Request a decision from autonomous decision engine
   */
  async requestDecision(context: string, options: DecisionOption[]): Promise<Decision> {
    if (this.useMock) {
      const decision: Decision = {
        id: `dec_${uuidv4()}`,
        context,
        options: options.map(o => ({ ...o, id: o.id || `opt_${uuidv4()}` })),
        status: 'pending',
        requestedAt: new Date(),
      };
      decisions.set(decision.id, decision);
      return decision;
    }

    const response = await this.client.post('/api/decisions/request', { context, options });
    return response.data;
  }

  /**
   * Get a decision
   */
  async getDecision(decisionId: string): Promise<Decision | null> {
    if (this.useMock) {
      return decisions.get(decisionId) || null;
    }

    const response = await this.client.get(`/api/decisions/${decisionId}`);
    return response.data;
  }

  /**
   * Approve a decision
   */
  async approveDecision(decisionId: string, optionId?: string): Promise<Decision> {
    if (this.useMock) {
      const decision = decisions.get(decisionId);
      if (!decision) throw new Error(`Decision ${decisionId} not found`);

      decision.status = 'approved';
      decision.resolvedAt = new Date();
      decision.resolvedBy = 'user';
      decision.resolution = optionId ? `Approved option ${optionId}` : 'Approved';

      return decision;
    }

    const response = await this.client.post(`/api/decisions/${decisionId}/approve`, { optionId });
    return response.data;
  }

  /**
   * Reject a decision
   */
  async rejectDecision(decisionId: string, reason: string): Promise<Decision> {
    if (this.useMock) {
      const decision = decisions.get(decisionId);
      if (!decision) throw new Error(`Decision ${decisionId} not found`);

      decision.status = 'rejected';
      decision.resolvedAt = new Date();
      decision.resolvedBy = 'user';
      decision.resolution = reason;

      return decision;
    }

    const response = await this.client.post(`/api/decisions/${decisionId}/reject`, { reason });
    return response.data;
  }

  // ==================== Autonomous Workflows ====================

  /**
   * Create an autonomous workflow
   */
  async createAutonomousWorkflow(workflowData: Partial<Workflow>): Promise<Workflow> {
    if (this.useMock) {
      const workflow: Workflow = {
        id: `wf_${uuidv4()}`,
        name: workflowData.name || 'New Workflow',
        description: workflowData.description || '',
        steps: workflowData.steps || [],
        status: 'draft',
        createdAt: new Date(),
      };
      workflows.set(workflow.id, workflow);
      return workflow;
    }

    const response = await this.client.post('/api/workflows', workflowData);
    return response.data;
  }

  /**
   * Deploy a workflow
   */
  async deployWorkflow(workflowId: string, params?: Record<string, any>): Promise<WorkflowRun> {
    if (this.useMock) {
      const workflow = workflows.get(workflowId);
      if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

      workflow.status = 'active';
      workflow.deployedAt = new Date();

      const run: WorkflowRun = {
        id: `run_${uuidv4()}`,
        workflowId,
        status: 'running',
        currentStep: workflow.steps[0]?.id || '',
        startedAt: new Date(),
        results: {},
      };

      if (!workflow.runs) workflow.runs = [];
      workflow.runs.push(run);
      workflow.lastRun = new Date();

      // Simulate workflow execution
      setTimeout(() => {
        run.status = 'completed';
        run.completedAt = new Date();
        run.results = { success: true, stepsCompleted: workflow.steps.length };
        workflow.status = 'active';

        this.earnKarma('workflow_completed', 100, `Completed workflow: ${workflow.name}`);
      }, 8000);

      return run;
    }

    const response = await this.client.post(`/api/workflows/${workflowId}/deploy`, { params });
    return response.data;
  }

  /**
   * Monitor workflow execution
   */
  async monitorWorkflow(workflowId: string): Promise<Workflow | null> {
    if (this.useMock) {
      return workflows.get(workflowId) || null;
    }

    const response = await this.client.get(`/api/workflows/${workflowId}/monitor`);
    return response.data;
  }

  /**
   * Stop a workflow
   */
  async stopWorkflow(workflowId: string): Promise<Workflow> {
    if (this.useMock) {
      const workflow = workflows.get(workflowId);
      if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

      workflow.status = 'paused';

      return workflow;
    }

    const response = await this.client.post(`/api/workflows/${workflowId}/stop`);
    return response.data;
  }

  /**
   * Get all workflows
   */
  async getAllWorkflows(): Promise<Workflow[]> {
    if (this.useMock) {
      return Array.from(workflows.values());
    }

    const response = await this.client.get('/api/workflows');
    return response.data;
  }

  // ==================== Dashboard Data ====================

  /**
   * Get SUTAR OS dashboard data
   */
  async getDashboard(): Promise<any> {
    const allGoals = await this.getGoals();
    const karma = await this.getKarmaScore();
    const allAgents = await this.getAllAgents();
    const allWorkflows = await this.getAllWorkflows();

    return {
      goals: {
        total: allGoals.length,
        active: allGoals.filter(g => g.status === 'active').length,
        completed: allGoals.filter(g => g.status === 'completed').length,
        byPriority: {
          critical: allGoals.filter(g => g.priority === 'critical').length,
          high: allGoals.filter(g => g.priority === 'high').length,
          medium: allGoals.filter(g => g.priority === 'medium').length,
          low: allGoals.filter(g => g.priority === 'low').length,
        },
      },
      karma: {
        score: karma.score,
        tier: karma.tier,
        rank: karma.rank,
        recentTransactions: karma.transactions.slice(0, 5),
      },
      agents: {
        total: allAgents.length,
        working: allAgents.filter(a => a.status === 'working').length,
        idle: allAgents.filter(a => a.status === 'idle').length,
        performance: {
          avgSuccessRate: allAgents.reduce((sum, a) => sum + (a.performance?.successRate || 0), 0) / allAgents.length,
          totalTasksCompleted: allAgents.reduce((sum, a) => sum + (a.performance?.tasksCompleted || 0), 0),
        },
      },
      workflows: {
        total: allWorkflows.length,
        active: allWorkflows.filter(w => w.status === 'active').length,
      },
    };
  }
}

export const sutarOS = new SUTAROSIntegration();
export default sutarOS;
