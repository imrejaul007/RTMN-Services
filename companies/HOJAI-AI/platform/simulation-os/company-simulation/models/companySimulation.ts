import { z } from 'zod';

// ============================================================================
// Company Simulation Models - Data structures for company-level simulations
// ============================================================================

/**
 * Organization structure types
 */
export enum OrgStructureType {
  HIERARCHICAL = 'hierarchical',
  FLAT = 'flat',
  MATRIX = 'matrix',
  NETWORK = 'network',
  HOLACRACY = 'holacracy'
}

/**
 * Department types in an organization
 */
export enum DepartmentType {
  ENGINEERING = 'engineering',
  SALES = 'sales',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  FINANCE = 'finance',
  HR = 'hr',
  PRODUCT = 'product',
  CUSTOMER_SUCCESS = 'customer_success',
  EXECUTIVE = 'executive'
}

/**
 * Employee role levels
 */
export enum RoleLevel {
  INTERN = 1,
  JUNIOR = 2,
  MID = 3,
  SENIOR = 4,
  LEAD = 5,
  MANAGER = 6,
  DIRECTOR = 7,
  VP = 8,
  C_LEVEL = 9
}

/**
 * Employee model
 */
export interface Employee {
  id: string;
  name: string;
  email: string;
  department: DepartmentType;
  roleLevel: RoleLevel;
  salary: number;
  managerId?: string;
  directReports: string[];
  skills: string[];
  performance: number; // 0-100
  utilization: number; // 0-100 percentage
  hireDate: Date;
  isActive: boolean;
}

/**
 * Department model
 */
export interface Department {
  id: string;
  name: string;
  type: DepartmentType;
  headCount: number;
  budget: number;
  actualSpend: number;
  revenue: number;
  costPerEmployee: number;
  revenuePerEmployee: number;
  efficiency: number; // 0-100
  employeeIds: string[];
}

/**
 * Organization model
 */
export interface Organization {
  id: string;
  name: string;
  structure: OrgStructureType;
  totalEmployees: number;
  totalBudget: number;
  totalRevenue: number;
  departments: Map<string, Department>;
  employees: Map<string, Employee>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Simulation scenario types
 */
export enum SimulationType {
  ORG_RESTUCTURE = 'org_restructure',
  HIRING_PLAN = 'hiring_plan',
  PROCESS_CHANGE = 'process_change',
  TECH_ADOPTION = 'tech_adoption',
  COST_CUTTING = 'cost_cutting',
  EXPANSION = 'expansion'
}

/**
 * Change impact levels
 */
export enum ImpactLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Restructuring scenario input
 */
export interface OrgRestructureScenario {
  type: SimulationType.ORG_RESTUCTURE;
  targetStructure: OrgStructureType;
  departmentsAffected: DepartmentType[];
  layoffs?: number;
  newRoles?: Array<{
    department: DepartmentType;
    roleLevel: RoleLevel;
    count: number;
    avgSalary: number;
  }>;
  consolidation?: Array<{
    from: DepartmentType;
    to: DepartmentType;
  }>;
  timeline: number; // months
}

/**
 * Hiring plan scenario input
 */
export interface HiringPlanScenario {
  type: SimulationType.HIRING_PLAN;
  hires: Array<{
    department: DepartmentType;
    roleLevel: RoleLevel;
    count: number;
    avgSalary: number;
    productivityGain: number; // percentage
    rampUpTime: number; // months
  }>;
  timeline: number; // months
  benefits?: {
    revenueIncrease?: number;
    costReduction?: number;
    timeToProductivity: number; // months
  };
}

/**
 * Process change scenario input
 */
export interface ProcessChangeScenario {
  type: SimulationType.PROCESS_CHANGE;
  processName: string;
  department: DepartmentType;
  currentEfficiency: number;
  targetEfficiency: number;
  implementationCost: number;
  trainingCost: number;
  affectedEmployees: number;
  expectedBenefits: {
    timeSavings: number; // hours per week
    errorReduction: number; // percentage
    costSavings: number; // annual
  };
  timeline: number; // months
}

/**
 * Technology adoption scenario input
 */
export interface TechAdoptionScenario {
  type: SimulationType.TECH_ADOPTION;
  technology: string;
  category: 'automation' | 'ai_ml' | 'collaboration' | 'infrastructure' | 'security';
  implementationCost: number;
  annualMaintenanceCost: number;
  productivityGain: number; // percentage
  replacementFactor: number; // how many FTE this replaces
  departments: DepartmentType[];
  adoptionRate: number; // 0-100 percentage
  timeline: number; // months
}

/**
 * Union type for all scenarios
 */
export type CompanyScenario =
  | OrgRestructureScenario
  | HiringPlanScenario
  | ProcessChangeScenario
  | TechAdoptionScenario;

/**
 * Simulation run request
 */
export interface CompanySimulationRequest {
  companyId: string;
  scenario: CompanyScenario;
  baseline: {
    employees: Employee[];
    departments: Department[];
    currentRevenue: number;
    currentCosts: number;
  };
  parameters?: {
    iterations?: number; // Monte Carlo iterations
    confidenceLevel?: number; // 0-9
    timeHorizon?: number; // months to simulate
  };
}

/**
 * Financial impact projection
 */
export interface FinancialImpact {
  revenue: {
    baseline: number;
    projected: number;
    change: number;
    changePercent: number;
    confidenceInterval: [number, number];
  };
  costs: {
    baseline: number;
    projected: number;
    change: number;
    changePercent: number;
    confidenceInterval: [number, number];
  };
  profit: {
    baseline: number;
    projected: number;
    change: number;
    changePercent: number;
  };
  breakEven: number; // months
}

/**
 * Operational impact
 */
export interface OperationalImpact {
  productivity: {
    baseline: number;
    projected: number;
    change: number;
    changePercent: number;
  };
  efficiency: {
    baseline: number;
    projected: number;
    change: number;
    changePercent: number;
  };
  employeeImpact: {
    affected: number;
    displaced: number;
    newHires: number;
    retrained: number;
  };
  timeline: {
    implementation: number; // months
    fullAdoption: number; // months
    stabilization: number; // months
  };
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  risks: Array<{
    category: string;
    impact: ImpactLevel;
    probability: number; // 0-1
    description: string;
    mitigation: string[];
  }>;
  overallRiskScore: number; // 0-100
  riskLevel: ImpactLevel;
}

/**
 * Monte Carlo result
 */
export interface MonteCarloResult {
  metric: string;
  iterations: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentile5: number;
  percentile25: number;
  percentile75: number;
  percentile95: number;
  distribution: Array<{ value: number; frequency: number }>;
  confidenceInterval: [number, number];
}

/**
 * Simulation result
 */
export interface CompanySimulationResult {
  id: string;
  companyId: string;
  scenarioType: SimulationType;
  status: 'running' | 'completed' | 'failed';

  // Impact analysis
  financial: FinancialImpact;
  operational: OperationalImpact;
  risks: RiskAssessment;

  // Monte Carlo analysis
  monteCarlo: MonteCarloResult[];

  // Timeline projections
  timeline: Array<{
    month: number;
    revenue: number;
    costs: number;
    profit: number;
    headcount: number;
    efficiency: number;
  }>;

  // Recommendations
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }>;

  metadata: {
    createdAt: Date;
    completedAt?: Date;
    executionTimeMs: number;
    iterations: number;
  };
}

/**
 * Scenario comparison
 */
export interface ScenarioComparison {
  scenarios: CompanySimulationResult[];
  metrics: Array<{
    name: string;
    values: Map<string, number>;
    bestValue: string;
    bestScenario: string;
  }>;
  winner: string;
  analysis: string;
}

/**
 * Zod validation schemas
 */
export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  department: z.nativeEnum(DepartmentType),
  roleLevel: z.nativeEnum(RoleLevel),
  salary: z.number().positive(),
  skills: z.array(z.string()),
  performance: z.number().min(0).max(100),
  utilization: z.number().min(0).max(100),
  hireDate: z.string().datetime(),
  isActive: z.boolean()
});

export const DepartmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(DepartmentType),
  headCount: z.number().int().nonnegative(),
  budget: z.number().nonnegative(),
  actualSpend: z.number().nonnegative(),
  revenue: z.number().nonnegative(),
  costPerEmployee: z.number().nonnegative(),
  revenuePerEmployee: z.number().nonnegative(),
  efficiency: z.number().min(0).max(100)
});

export const CompanySimulationRequestSchema = z.object({
  companyId: z.string(),
  scenario: z.object({
    type: z.nativeEnum(SimulationType)
  }),
  baseline: z.object({
    employees: z.array(EmployeeSchema),
    departments: z.array(DepartmentSchema),
    currentRevenue: z.number().nonnegative(),
    currentCosts: z.number().nonnegative()
  }),
  parameters: z.object({
    iterations: z.number().int().min(100).max(10000).default(1000),
    confidenceLevel: z.number().min(0).max(9).default(0.95),
    timeHorizon: z.number().int().min(1).max(120).default(12)
  }).optional()
});

export const HiringPlanScenarioSchema = z.object({
  type: z.literal(SimulationType.HIRING_PLAN),
  hires: z.array(z.object({
    department: z.nativeEnum(DepartmentType),
    roleLevel: z.nativeEnum(RoleLevel),
    count: z.number().int().positive(),
    avgSalary: z.number().positive(),
    productivityGain: z.number().min(0).max(100),
    rampUpTime: z.number().int().nonnegative()
  })),
  timeline: z.number().int().positive(),
  benefits: z.object({
    revenueIncrease: z.number().optional(),
    costReduction: z.number().optional(),
    timeToProductivity: z.number().int().nonnegative()
  }).optional()
});

export const OrgRestructureScenarioSchema = z.object({
  type: z.literal(SimulationType.ORG_RESTUCTURE),
  targetStructure: z.nativeEnum(OrgStructureType),
  departmentsAffected: z.array(z.nativeEnum(DepartmentType)),
  layoffs: z.number().int().nonnegative().optional(),
  newRoles: z.array(z.object({
    department: z.nativeEnum(DepartmentType),
    roleLevel: z.nativeEnum(RoleLevel),
    count: z.number().int().positive(),
    avgSalary: z.number().positive()
  })).optional(),
  consolidation: z.array(z.object({
    from: z.nativeEnum(DepartmentType),
    to: z.nativeEnum(DepartmentType)
  })).optional(),
  timeline: z.number().int().positive()
});

export const ProcessChangeScenarioSchema = z.object({
  type: z.literal(SimulationType.PROCESS_CHANGE),
  processName: z.string(),
  department: z.nativeEnum(DepartmentType),
  currentEfficiency: z.number().min(0).max(100),
  targetEfficiency: z.number().min(0).max(100),
  implementationCost: z.number().nonnegative(),
  trainingCost: z.number().nonnegative(),
  affectedEmployees: z.number().int().nonnegative(),
  expectedBenefits: z.object({
    timeSavings: z.number().nonnegative(),
    errorReduction: z.number().min(0).max(100),
    costSavings: z.number().nonnegative()
  }),
  timeline: z.number().int().positive()
});

export const TechAdoptionScenarioSchema = z.object({
  type: z.literal(SimulationType.TECH_ADOPTION),
  technology: z.string(),
  category: z.enum(['automation', 'ai_ml', 'collaboration', 'infrastructure', 'security']),
  implementationCost: z.number().nonnegative(),
  annualMaintenanceCost: z.number().nonnegative(),
  productivityGain: z.number().min(0).max(100),
  replacementFactor: z.number().nonnegative(),
  departments: z.array(z.nativeEnum(DepartmentType)),
  adoptionRate: z.number().min(0).max(100),
  timeline: z.number().int().positive()
});
