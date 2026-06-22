import { SERVICES, API_CONFIG } from "./constants";

/**
 * API Response types
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Revenue types
 */
export interface RevenueMetrics {
  arr: number;
  mrr: number;
  arrGrowth: number;
  mrrGrowth: number;
  cac: number;
  ltv: number;
  ltvToCacRatio: number;
  arrPerCustomer: number;
}

export interface RevenuePipeline {
  stage: string;
  value: number;
  count: number;
}

export interface RevenueData {
  metrics: RevenueMetrics;
  pipeline: RevenuePipeline[];
  historical: { month: string; arr: number; mrr: number; newMrr: number; churnedMrr: number }[];
  forecast: { month: string; predicted: number; target: number }[];
  alerts: Alert[];
}

/**
 * Customer types
 */
export interface CustomerMetrics {
  total: number;
  active: number;
  newThisMonth: number;
  churnedThisMonth: number;
  churnRate: number;
  nrr: number;
  avgHealthScore: number;
}

export interface Customer {
  id: string;
  name: string;
  industry: string;
  tier: "enterprise" | "mid-market" | "smb";
  arr: number;
  healthScore: number;
  lastActivity: Date;
  accountManager: string;
  status: "active" | "at-risk" | "churned";
}

export interface CustomerData {
  metrics: CustomerMetrics;
  customers: Customer[];
  segments: { name: string; count: number; arr: number }[];
  healthDistribution: { score: number; count: number }[];
  alerts: Alert[];
}

/**
 * Product types
 */
export interface ProductMetrics {
  total: number;
  active: number;
  inDevelopment: number;
  avgPmfScore: number;
  feedbackSentiment: number;
}

export interface Product {
  id: string;
  name: string;
  status: "active" | "beta" | "planned" | "deprecated";
  version: string;
  pmfScore: number;
  usage: number;
  revenue: number;
  feedbackCount: number;
  feedbackPositive: number;
}

export interface ProductData {
  metrics: ProductMetrics;
  products: Product[];
  pipeline: { stage: string; count: number }[];
  sentimentTrend: { week: string; positive: number; negative: number; neutral: number }[];
  topFeatures: { name: string; votes: number; status: string }[];
  alerts: Alert[];
}

/**
 * Project types
 */
export interface ProjectMetrics {
  total: number;
  active: number;
  onTrack: number;
  atRisk: number;
  delayed: number;
  completedThisMonth: number;
  avgCompletionRate: number;
}

export interface Project {
  id: string;
  name: string;
  status: "on-track" | "at-risk" | "delayed" | "completed";
  progress: number;
  startDate: Date;
  endDate: Date;
  budget: number;
  spent: number;
  team: string[];
  milestones: { name: string; dueDate: Date; completed: boolean }[];
}

export interface ProjectData {
  metrics: ProjectMetrics;
  projects: Project[];
  alerts: Alert[];
}

/**
 * Team types
 */
export interface TeamMetrics {
  total: number;
  aiEmployees: number;
  humanEmployees: number;
  avgPerformance: number;
  avgWorkload: number;
  openRoles: number;
  avgTenure: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  type: "human" | "ai";
  performance: number;
  workload: number;
  department: string;
  status: "active" | "on-leave" | "inactive";
}

export interface TeamData {
  metrics: TeamMetrics;
  members: TeamMember[];
  performanceDistribution: { score: number; count: number }[];
  workloadDistribution: { level: string; count: number }[];
  skills: { name: string; demand: number; supply: number }[];
  alerts: Alert[];
}

/**
 * Goal types
 */
export interface GoalMetrics {
  total: number;
  active: number;
  completed: number;
  atRisk: number;
  avgProgress: number;
  onTrack: number;
}

export interface Goal {
  id: string;
  title: string;
  type: "okr" | "project" | "initiative";
  progress: number;
  status: "on-track" | "at-risk" | "behind" | "completed";
  owner: string;
  dueDate: Date;
  keyResults: { name: string; progress: number; target: number }[];
  dependencies: string[];
}

export interface GoalData {
  metrics: GoalMetrics;
  goals: Goal[];
  timeline: { date: string; milestones: string[] }[];
  alerts: Alert[];
}

/**
 * Meeting types
 */
export interface MeetingMetrics {
  total: number;
  upcoming: number;
  completedThisWeek: number;
  avgDuration: number;
  actionItemsOpen: number;
  decisionsMade: number;
}

export interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number;
  attendees: string[];
  type: "one-on-one" | "team" | "all-hands" | "external";
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  actionItems: { id: string; title: string; assignee: string; dueDate: Date; completed: boolean }[];
  decisions: { id: string; description: string; madeBy: string; date: Date }[];
}

export interface MeetingData {
  metrics: MeetingMetrics;
  meetings: Meeting[];
  alerts: Alert[];
}

/**
 * Competitor types
 */
export interface CompetitorMetrics {
  total: number;
  threats: number;
  opportunities: number;
  recentNews: number;
}

export interface Competitor {
  id: string;
  name: string;
  marketShare: number;
  threatLevel: "high" | "medium" | "low";
  strengths: string[];
  weaknesses: string[];
  recentNews: { title: string; date: Date; url: string }[];
  funding: { amount: number; date: Date; round: string } | null;
}

export interface CompetitorData {
  metrics: CompetitorMetrics;
  competitors: Competitor[];
  comparisonMatrix: { feature: string; us: number; competitors: { name: string; score: number }[] }[];
  alerts: Alert[];
}

/**
 * Decision types
 */
export interface DecisionMetrics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  avgImpact: number;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "deferred";
  impact: "high" | "medium" | "low";
  madeBy: string;
  date: Date;
  outcome?: string;
  rationale?: string;
}

export interface DecisionData {
  metrics: DecisionMetrics;
  decisions: Decision[];
  alerts: Alert[];
}

/**
 * Agent types
 */
export interface AgentMetrics {
  total: number;
  active: number;
  avgPerformance: number;
  avgUptime: number;
  totalTasks: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  team: string;
  status: "active" | "idle" | "error";
  performance: number;
  tasksCompleted: number;
  permissions: string[];
  skills: string[];
}

export interface AgentData {
  metrics: AgentMetrics;
  agents: Agent[];
  teams: { name: string; memberCount: number; avgPerformance: number }[];
  permissionMatrix: { role: string; permissions: { name: string; granted: boolean }[] }[];
  alerts: Alert[];
}

/**
 * Workflow types
 */
export interface WorkflowMetrics {
  total: number;
  active: number;
  avgRunTime: number;
  successRate: number;
  bottlenecks: number;
  automationsEnabled: number;
}

export interface Workflow {
  id: string;
  name: string;
  status: "active" | "paused" | "error";
  lastRun: Date;
  avgRunTime: number;
  successRate: number;
  trigger: string;
  runs: { date: Date; status: "success" | "failed" | "running"; duration: number }[];
}

export interface WorkflowData {
  metrics: WorkflowMetrics;
  workflows: Workflow[];
  suggestions: { title: string; description: string; potentialSavings: string }[];
  alerts: Alert[];
}

/**
 * Alert type
 */
export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  type: "revenue" | "customer" | "product" | "project" | "team" | "goal" | "general";
  timestamp: Date;
  read?: boolean;
}

/**
 * Unified dashboard data
 */
export interface DashboardData {
  revenue: RevenueData | null;
  customers: CustomerData | null;
  products: ProductData | null;
  projects: ProjectData | null;
  team: TeamData | null;
  goals: GoalData | null;
  meetings: MeetingData | null;
  competitors: CompetitorData | null;
  decisions: DecisionData | null;
  agents: AgentData | null;
  workflows: WorkflowData | null;
  alerts: Alert[];
  lastUpdated: Date;
}

/**
 * API Client
 */
class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  // Revenue API
  async getRevenueData(): Promise<RevenueData> {
    try {
      return await this.request<RevenueData>("/api/revenue");
    } catch {
      // Return mock data if API is not available
      return getMockRevenueData();
    }
  }

  // Customer API
  async getCustomerData(): Promise<CustomerData> {
    try {
      return await this.request<CustomerData>("/api/customers");
    } catch {
      return getMockCustomerData();
    }
  }

  // Product API
  async getProductData(): Promise<ProductData> {
    try {
      return await this.request<ProductData>("/api/products");
    } catch {
      return getMockProductData();
    }
  }

  // Project API
  async getProjectData(): Promise<ProjectData> {
    try {
      return await this.request<ProjectData>("/api/projects");
    } catch {
      return getMockProjectData();
    }
  }

  // Team API
  async getTeamData(): Promise<TeamData> {
    try {
      return await this.request<TeamData>("/api/team");
    } catch {
      return getMockTeamData();
    }
  }

  // Goal API
  async getGoalData(): Promise<GoalData> {
    try {
      return await this.request<GoalData>("/api/goals");
    } catch {
      return getMockGoalData();
    }
  }

  // Meeting API
  async getMeetingData(): Promise<MeetingData> {
    try {
      return await this.request<MeetingData>("/api/meetings");
    } catch {
      return getMockMeetingData();
    }
  }

  // Competitor API
  async getCompetitorData(): Promise<CompetitorData> {
    try {
      return await this.request<CompetitorData>("/api/competitors");
    } catch {
      return getMockCompetitorData();
    }
  }

  // Decision API
  async getDecisionData(): Promise<DecisionData> {
    try {
      return await this.request<DecisionData>("/api/decisions");
    } catch {
      return getMockDecisionData();
    }
  }

  // Agent API
  async getAgentData(): Promise<AgentData> {
    try {
      return await this.request<AgentData>("/api/agents");
    } catch {
      return getMockAgentData();
    }
  }

  // Workflow API
  async getWorkflowData(): Promise<WorkflowData> {
    try {
      return await this.request<WorkflowData>("/api/workflows");
    } catch {
      return getMockWorkflowData();
    }
  }

  // Unified dashboard API
  async getDashboardData(): Promise<DashboardData> {
    const [revenue, customers, products, projects, team, goals, meetings, competitors, decisions, agents, workflows] =
      await Promise.all([
        this.getRevenueData().catch(() => null),
        this.getCustomerData().catch(() => null),
        this.getProductData().catch(() => null),
        this.getProjectData().catch(() => null),
        this.getTeamData().catch(() => null),
        this.getGoalData().catch(() => null),
        this.getMeetingData().catch(() => null),
        this.getCompetitorData().catch(() => null),
        this.getDecisionData().catch(() => null),
        this.getAgentData().catch(() => null),
        this.getWorkflowData().catch(() => null),
      ]);

    const allAlerts: Alert[] = [];
    [revenue, customers, products, projects, team, goals, meetings, competitors, decisions, agents, workflows].forEach(
      (data) => {
        if (data?.alerts) {
          allAlerts.push(...data.alerts);
        }
      }
    );

    return {
      revenue,
      customers,
      products,
      projects,
      team,
      goals,
      meetings,
      competitors,
      decisions,
      agents,
      workflows,
      alerts: allAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      lastUpdated: new Date(),
    };
  }

  // Natural language query
  async query(query: string): Promise<{ answer: string; sources: string[]; confidence: number }> {
    try {
      return await this.request<{ answer: string; sources: string[]; confidence: number }>("/api/query", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
    } catch {
      // Return mock response
      return {
        answer: `Based on my analysis of your business data, here's what I found for: "${query}". The data shows several important patterns. Revenue trends indicate a positive trajectory with some seasonal variations. Customer acquisition has been steady with a slight uptick in enterprise segments.`,
        sources: ["Revenue Intelligence", "Customer Intelligence", "Product Intelligence"],
        confidence: 0.92,
      };
    }
  }
}

// Create API clients for each service
export const revenueApi = new ApiClient(SERVICES.REVENUE);
export const customerApi = new ApiClient(SERVICES.CUSTOMER);
export const productApi = new ApiClient(SERVICES.PRODUCT);
export const projectApi = new ApiClient(SERVICES.PROJECT);
export const workforceApi = new ApiClient(SERVICES.WORKFORCE);
export const goalApi = new ApiClient(SERVICES.GOAL);
export const meetingApi = new ApiClient(SERVICES.MEETING);
export const competitorApi = new ApiClient(SERVICES.COMPETITOR);
export const boardApi = new ApiClient(SERVICES.BOARD);
export const agentApi = new ApiClient(SERVICES.AGENT);
export const workflowApi = new ApiClient(SERVICES.WORKFLOW);

// Unified API client
export const api = new ApiClient("");

// Mock data generators
function getMockRevenueData(): RevenueData {
  return {
    metrics: {
      arr: 2450000,
      mrr: 204167,
      arrGrowth: 18.5,
      mrrGrowth: 15.2,
      cac: 4500,
      ltv: 45000,
      ltvToCacRatio: 10,
      arrPerCustomer: 24500,
    },
    pipeline: [
      { stage: "Discovery", value: 500000, count: 25 },
      { stage: "Qualified", value: 750000, count: 15 },
      { stage: "Proposal", value: 600000, count: 8 },
      { stage: "Negotiation", value: 400000, count: 4 },
      { stage: "Closed", value: 300000, count: 3 },
    ],
    historical: [
      { month: "Jan", arr: 1800000, mrr: 150000, newMrr: 15000, churnedMrr: 5000 },
      { month: "Feb", arr: 1900000, mrr: 158333, newMrr: 12000, churnedMrr: 4000 },
      { month: "Mar", arr: 2000000, mrr: 166667, newMrr: 18000, churnedMrr: 6000 },
      { month: "Apr", arr: 2100000, mrr: 175000, newMrr: 14000, churnedMrr: 3000 },
      { month: "May", arr: 2200000, mrr: 183333, newMrr: 16000, churnedMrr: 4500 },
      { month: "Jun", arr: 2450000, mrr: 204167, newMrr: 25000, churnedMrr: 5000 },
    ],
    forecast: [
      { month: "Jul", predicted: 220000, target: 210000 },
      { month: "Aug", predicted: 235000, target: 225000 },
      { month: "Sep", predicted: 250000, target: 240000 },
      { month: "Oct", predicted: 265000, target: 255000 },
      { month: "Nov", predicted: 280000, target: 270000 },
      { month: "Dec", predicted: 300000, target: 290000 },
    ],
    alerts: [
      {
        id: "rev-1",
        title: "MRR Growth Slowing",
        message: "MRR growth rate has decreased from 20% to 15% over the last month",
        severity: "medium",
        type: "revenue",
        timestamp: new Date(Date.now() - 3600000),
      },
    ],
  };
}

function getMockCustomerData(): CustomerData {
  return {
    metrics: {
      total: 100,
      active: 85,
      newThisMonth: 8,
      churnedThisMonth: 3,
      churnRate: 3.5,
      nrr: 108,
      avgHealthScore: 72,
    },
    customers: [
      { id: "1", name: "Acme Corporation", industry: "Technology", tier: "enterprise", arr: 120000, healthScore: 85, lastActivity: new Date(), accountManager: "John Smith", status: "active" },
      { id: "2", name: "TechStart Inc", industry: "SaaS", tier: "mid-market", arr: 48000, healthScore: 72, lastActivity: new Date(Date.now() - 86400000), accountManager: "Jane Doe", status: "active" },
      { id: "3", name: "Global Solutions", industry: "Finance", tier: "enterprise", arr: 150000, healthScore: 45, lastActivity: new Date(Date.now() - 172800000), accountManager: "John Smith", status: "at-risk" },
      { id: "4", name: "SmallBiz Co", industry: "Retail", tier: "smb", arr: 12000, healthScore: 90, lastActivity: new Date(), accountManager: "Sarah Wilson", status: "active" },
      { id: "5", name: "Innovate Labs", industry: "Healthcare", tier: "mid-market", arr: 36000, healthScore: 68, lastActivity: new Date(Date.now() - 259200000), accountManager: "Jane Doe", status: "active" },
    ],
    segments: [
      { name: "Enterprise", count: 15, arr: 1200000 },
      { name: "Mid-Market", count: 35, arr: 840000 },
      { name: "SMB", count: 50, arr: 410000 },
    ],
    healthDistribution: [
      { score: 10, count: 2 },
      { score: 30, count: 5 },
      { score: 50, count: 10 },
      { score: 70, count: 25 },
      { score: 90, count: 58 },
    ],
    alerts: [
      {
        id: "cust-1",
        title: "Customer at Risk",
        message: "Global Solutions health score dropped to 45%",
        severity: "high",
        type: "customer",
        timestamp: new Date(Date.now() - 7200000),
      },
    ],
  };
}

function getMockProductData(): ProductData {
  return {
    metrics: {
      total: 12,
      active: 8,
      inDevelopment: 4,
      avgPmfScore: 72,
      feedbackSentiment: 78,
    },
    products: [
      { id: "1", name: "Core Platform", status: "active", version: "3.2.1", pmfScore: 85, usage: 10000, revenue: 1800000, feedbackCount: 450, feedbackPositive: 380 },
      { id: "2", name: "Analytics Suite", status: "active", version: "2.1.0", pmfScore: 78, usage: 5000, revenue: 400000, feedbackCount: 280, feedbackPositive: 218 },
      { id: "3", name: "Mobile App", status: "beta", version: "1.5.0", pmfScore: 65, usage: 1200, revenue: 0, feedbackCount: 150, feedbackPositive: 98 },
      { id: "4", name: "API Gateway", status: "active", version: "1.8.0", pmfScore: 82, usage: 8000, revenue: 250000, feedbackCount: 320, feedbackPositive: 262 },
      { id: "5", name: "AI Assistant", status: "planned", version: "0.1.0", pmfScore: 0, usage: 0, revenue: 0, feedbackCount: 0, feedbackPositive: 0 },
    ],
    pipeline: [
      { stage: "Research", count: 5 },
      { stage: "Design", count: 3 },
      { stage: "Development", count: 4 },
      { stage: "Testing", count: 2 },
      { stage: "Launch", count: 1 },
    ],
    sentimentTrend: [
      { week: "Week 1", positive: 65, negative: 15, neutral: 20 },
      { week: "Week 2", positive: 68, negative: 12, neutral: 20 },
      { week: "Week 3", positive: 72, negative: 10, neutral: 18 },
      { week: "Week 4", positive: 75, negative: 8, neutral: 17 },
    ],
    topFeatures: [
      { name: "Automated Reporting", votes: 245, status: "planned" },
      { name: "Custom Dashboards", votes: 198, status: "in-progress" },
      { name: "API Integrations", votes: 176, status: "completed" },
      { name: "Mobile Support", votes: 165, status: "beta" },
      { name: "Advanced Analytics", votes: 142, status: "completed" },
    ],
    alerts: [],
  };
}

function getMockProjectData(): ProjectData {
  return {
    metrics: {
      total: 15,
      active: 12,
      onTrack: 8,
      atRisk: 3,
      delayed: 1,
      completedThisMonth: 2,
      avgCompletionRate: 68,
    },
    projects: [
      { id: "1", name: "Platform Redesign", status: "on-track", progress: 75, startDate: new Date("2024-01-15"), endDate: new Date("2024-06-30"), budget: 250000, spent: 180000, team: ["Alice", "Bob", "Charlie"], milestones: [{ name: "Design Phase", dueDate: new Date("2024-02-28"), completed: true }, { name: "Development", dueDate: new Date("2024-05-15"), completed: false }, { name: "Launch", dueDate: new Date("2024-06-30"), completed: false }] },
      { id: "2", name: "Mobile App v2", status: "at-risk", progress: 45, startDate: new Date("2024-03-01"), endDate: new Date("2024-08-01"), budget: 180000, spent: 120000, team: ["David", "Eve"], milestones: [{ name: "Beta Release", dueDate: new Date("2024-05-01"), completed: true }, { name: "Testing", dueDate: new Date("2024-07-01"), completed: false }] },
      { id: "3", name: "API v3 Migration", status: "delayed", progress: 30, startDate: new Date("2024-02-01"), endDate: new Date("2024-05-01"), budget: 100000, spent: 45000, team: ["Frank", "Grace"], milestones: [{ name: "Phase 1", dueDate: new Date("2024-03-15"), completed: true }, { name: "Phase 2", dueDate: new Date("2024-04-15"), completed: false }] },
    ],
    alerts: [
      {
        id: "proj-1",
        title: "Project Delay Warning",
        message: "API v3 Migration is 2 weeks behind schedule",
        severity: "high",
        type: "project",
        timestamp: new Date(Date.now() - 10800000),
      },
    ],
  };
}

function getMockTeamData(): TeamData {
  return {
    metrics: {
      total: 25,
      aiEmployees: 8,
      humanEmployees: 17,
      avgPerformance: 78,
      avgWorkload: 65,
      openRoles: 4,
      avgTenure: 2.5,
    },
    members: [
      { id: "1", name: "Alice Chen", role: "Engineering Lead", type: "human", performance: 92, workload: 75, department: "Engineering", status: "active" },
      { id: "2", name: "DataBot Alpha", role: "Data Analyst", type: "ai", performance: 88, workload: 60, department: "Analytics", status: "active" },
      { id: "3", name: "Bob Johnson", role: "Product Manager", type: "human", performance: 85, workload: 80, department: "Product", status: "active" },
      { id: "4", name: "SupportBot Beta", role: "Customer Support", type: "ai", performance: 82, workload: 55, department: "Support", status: "active" },
      { id: "5", name: "Carol Smith", role: "Sales Representative", type: "human", performance: 78, workload: 70, department: "Sales", status: "active" },
    ],
    performanceDistribution: [
      { score: 10, count: 1 },
      { score: 30, count: 2 },
      { score: 50, count: 4 },
      { score: 70, count: 8 },
      { score: 90, count: 10 },
    ],
    workloadDistribution: [
      { level: "Underutilized", count: 5 },
      { level: "Normal", count: 12 },
      { level: "High", count: 6 },
      { level: "Overloaded", count: 2 },
    ],
    skills: [
      { name: "React", demand: 85, supply: 60 },
      { name: "Python", demand: 80, supply: 75 },
      { name: "Machine Learning", demand: 70, supply: 40 },
      { name: "Sales", demand: 65, supply: 70 },
    ],
    alerts: [],
  };
}

function getMockGoalData(): GoalData {
  return {
    metrics: {
      total: 20,
      active: 15,
      completed: 5,
      atRisk: 3,
      avgProgress: 65,
      onTrack: 12,
    },
    goals: [
      { id: "1", title: "Increase ARR to $3M", type: "okr", progress: 82, status: "on-track", owner: "CEO", dueDate: new Date("2024-12-31"), keyResults: [{ name: "Reach $2.5M ARR", progress: 98, target: 100 }, { name: "Reduce Churn to 3%", progress: 75, target: 100 }], dependencies: [] },
      { id: "2", title: "Launch Mobile App", type: "project", progress: 45, status: "at-risk", owner: "Product", dueDate: new Date("2024-08-01"), keyResults: [{ name: "Beta Release", progress: 60, target: 100 }, { name: "GA Release", progress: 30, target: 100 }], dependencies: ["1"] },
      { id: "3", title: "Improve NPS to 50", type: "okr", progress: 68, status: "on-track", owner: "Support", dueDate: new Date("2024-06-30"), keyResults: [{ name: "NPS Score 45+", progress: 72, target: 100 }], dependencies: [] },
    ],
    timeline: [
      { date: "2024-06-15", milestones: ["Q2 Review", "Mobile Beta"] },
      { date: "2024-06-30", milestones: ["NPS Goal Check", "Platform v3.2"] },
      { date: "2024-09-30", milestones: ["Q3 Goals", "Mobile GA"] },
    ],
    alerts: [
      {
        id: "goal-1",
        title: "Goal At Risk",
        message: "Mobile App launch is behind schedule",
        severity: "medium",
        type: "goal",
        timestamp: new Date(Date.now() - 14400000),
      },
    ],
  };
}

function getMockMeetingData(): MeetingData {
  return {
    metrics: {
      total: 24,
      upcoming: 5,
      completedThisWeek: 8,
      avgDuration: 45,
      actionItemsOpen: 12,
      decisionsMade: 4,
    },
    meetings: [
      { id: "1", title: "Weekly Leadership Sync", date: new Date(Date.now() + 86400000), duration: 60, attendees: ["CEO", "CTO", "CFO"], type: "team", status: "scheduled", actionItems: [{ id: "a1", title: "Review Q2 targets", assignee: "CEO", dueDate: new Date("2024-06-20"), completed: false }], decisions: [] },
      { id: "2", title: "Product Roadmap Review", date: new Date(Date.now() + 172800000), duration: 90, attendees: ["Product", "Engineering", "Design"], type: "team", status: "scheduled", actionItems: [], decisions: [{ id: "d1", description: "Prioritize mobile app for Q3", madeBy: "Product Lead", date: new Date() }] },
    ],
    alerts: [],
  };
}

function getMockCompetitorData(): CompetitorData {
  return {
    metrics: {
      total: 5,
      threats: 2,
      opportunities: 3,
      recentNews: 8,
    },
    competitors: [
      { id: "1", name: "Competitor A", marketShare: 25, threatLevel: "high", strengths: ["Strong brand", "Large sales team"], weaknesses: ["Outdated tech", "High prices"], recentNews: [{ title: "Raised $50M Series C", date: new Date(), url: "#" }], funding: { amount: 50000000, date: new Date(), round: "Series C" } },
      { id: "2", name: "Competitor B", marketShare: 15, threatLevel: "medium", strengths: ["Innovative features"], weaknesses: ["Limited integrations"], recentNews: [], funding: null },
    ],
    comparisonMatrix: [
      { feature: "Features", us: 85, competitors: [{ name: "Competitor A", score: 80 }, { name: "Competitor B", score: 75 }] },
      { feature: "Pricing", us: 70, competitors: [{ name: "Competitor A", score: 60 }, { name: "Competitor B", score: 85 }] },
      { feature: "Support", us: 90, competitors: [{ name: "Competitor A", score: 75 }, { name: "Competitor B", score: 70 }] },
    ],
    alerts: [
      {
        id: "comp-1",
        title: "Competitor Funding",
        message: "Competitor A raised $50M in Series C",
        severity: "high",
        type: "general",
        timestamp: new Date(Date.now() - 43200000),
      },
    ],
  };
}

function getMockDecisionData(): DecisionData {
  return {
    metrics: {
      total: 15,
      pending: 3,
      approved: 10,
      rejected: 2,
      avgImpact: 72,
    },
    decisions: [
      { id: "1", title: "Approve Q3 Budget", description: "Allocate $500K for marketing initiatives", status: "approved", impact: "high", madeBy: "Board", date: new Date("2024-06-01"), outcome: "Approved", rationale: "Aligned with growth strategy" },
      { id: "2", title: "Launch Mobile App Beta", description: "Release mobile app beta to select customers", status: "pending", impact: "medium", madeBy: "Product Lead", date: new Date() },
      { id: "3", title: "Hire Additional Engineers", description: "Add 3 senior engineers to the team", status: "approved", impact: "high", madeBy: "CTO", date: new Date("2024-05-15"), outcome: "Approved", rationale: "Critical for platform redesign" },
    ],
    alerts: [],
  };
}

function getMockAgentData(): AgentData {
  return {
    metrics: {
      total: 8,
      active: 7,
      avgPerformance: 85,
      avgUptime: 99.5,
      totalTasks: 15420,
    },
    agents: [
      { id: "1", name: "DataBot Alpha", role: "Data Analyst", team: "Analytics", status: "active", performance: 88, tasksCompleted: 2450, permissions: ["read:data", "write:reports"], skills: ["python", "sql", "visualization"] },
      { id: "2", name: "SupportBot Beta", role: "Customer Support", team: "Support", status: "active", performance: 82, tasksCompleted: 3890, permissions: ["read:tickets", "write:responses"], skills: ["communication", "troubleshooting"] },
      { id: "3", name: "SalesBot Gamma", role: "Sales Assistant", team: "Sales", status: "active", performance: 78, tasksCompleted: 1560, permissions: ["read:leads", "write:notes"], skills: ["crm", "communication"] },
    ],
    teams: [
      { name: "Analytics", memberCount: 2, avgPerformance: 86 },
      { name: "Support", memberCount: 3, avgPerformance: 84 },
      { name: "Sales", memberCount: 2, avgPerformance: 80 },
      { name: "Operations", memberCount: 1, avgPerformance: 90 },
    ],
    permissionMatrix: [
      { role: "Data Analyst", permissions: [{ name: "read:data", granted: true }, { name: "write:reports", granted: true }, { name: "admin:users", granted: false }] },
      { role: "Support Agent", permissions: [{ name: "read:data", granted: true }, { name: "write:reports", granted: false }, { name: "admin:users", granted: false }] },
    ],
    alerts: [],
  };
}

function getMockWorkflowData(): WorkflowData {
  return {
    metrics: {
      total: 12,
      active: 10,
      avgRunTime: 45,
      successRate: 94,
      bottlenecks: 2,
      automationsEnabled: 45,
    },
    workflows: [
      { id: "1", name: "Customer Onboarding", status: "active", lastRun: new Date(Date.now() - 3600000), avgRunTime: 120, successRate: 98, trigger: "New Customer", runs: [{ date: new Date(), status: "success", duration: 115 }] },
      { id: "2", name: "Invoice Generation", status: "active", lastRun: new Date(Date.now() - 7200000), avgRunTime: 30, successRate: 99, trigger: "Monthly Schedule", runs: [{ date: new Date(), status: "success", duration: 28 }] },
      { id: "3", name: "Lead Scoring", status: "error", lastRun: new Date(Date.now() - 1800000), avgRunTime: 15, successRate: 65, trigger: "New Lead", runs: [{ date: new Date(), status: "failed", duration: 8 }] },
    ],
    suggestions: [
      { title: "Automate Report Generation", description: "Schedule weekly reports to be sent to stakeholders", potentialSavings: "4 hours/week" },
      { title: "Lead Nurturing Workflow", description: "Create automated follow-up sequence for leads", potentialSavings: "8 hours/week" },
    ],
    alerts: [
      {
        id: "wf-1",
        title: "Workflow Error",
        message: "Lead Scoring workflow failed 3 times in the last hour",
        severity: "high",
        type: "general",
        timestamp: new Date(Date.now() - 1800000),
      },
    ],
  };
}

export type {
  RevenueData,
  CustomerData,
  ProductData,
  ProjectData,
  TeamData,
  GoalData,
  MeetingData,
  CompetitorData,
  DecisionData,
  AgentData,
  WorkflowData,
  Alert,
};
