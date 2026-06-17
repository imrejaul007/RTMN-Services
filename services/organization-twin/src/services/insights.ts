import { Organization } from '../models/Organization';
import { Department } from '../models/Department';
import { Branch } from '../models/Branch';
import { Employee } from '../models/Employee';
import { Policy } from '../models/Policy';
import { SLAPolicy } from '../models/SLAPolicy';

interface InsightsParams {
  tenantId?: string;
  organizationId?: string;
}

interface OrganizationInsights {
  overview: {
    totalOrganizations: number;
    activeOrganizations: number;
    industries: Record<string, number>;
    organizationTypes: Record<string, number>;
  };
  departments: {
    total: number;
    byType: Record<string, number>;
    avgHeadcount: number;
    totalBudget: number;
    departmentUtilization: Array<{
      department: string;
      code: string;
      currentHeadcount: number;
      targetHeadcount: number;
      utilizationPercent: number;
    }>;
  };
  branches: {
    total: number;
    byType: Record<string, number>;
    byCity: Record<string, number>;
    headquarters: number;
    activeBranches: number;
  };
  employees: {
    total: number;
    active: number;
    byEmploymentType: Record<string, number>;
    byStatus: Record<string, number>;
    avgTenure: number; // in months
    newHiresLast30Days: number;
  };
  policies: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    activePolicies: number;
  };
  sla: {
    total: number;
    byPriority: Record<string, number>;
    avgResponseTime: number; // in minutes
    avgResolutionTime: number; // in minutes
  };
}

export const generateInsights = async (params: InsightsParams): Promise<OrganizationInsights> => {
  const { tenantId, organizationId } = params;

  const baseQuery = tenantId ? { tenantId } : {};
  const orgFilter = organizationId ? { ...baseQuery, _id: organizationId } : baseQuery;
  const deptFilter = organizationId
    ? { ...baseQuery, organizationId }
    : baseQuery;
  const branchFilter = organizationId
    ? { ...baseQuery, organizationId }
    : baseQuery;
  const empFilter = organizationId
    ? { ...baseQuery, organizationId }
    : baseQuery;
  const policyFilter = organizationId
    ? { ...baseQuery, organizationId }
    : baseQuery;
  const slaFilter = organizationId
    ? { ...baseQuery, organizationId }
    : baseQuery;

  // Fetch all data in parallel
  const [
    organizations,
    departments,
    branches,
    employees,
    policies,
    slaPolicies,
  ] = await Promise.all([
    Organization.find(orgFilter).lean(),
    Department.find(deptFilter).lean(),
    Branch.find(branchFilter).lean(),
    Employee.find(empFilter).lean(),
    Policy.find(policyFilter).lean(),
    SLAPolicy.find(slaFilter).lean(),
  ]);

  // Calculate organization insights
  const industries: Record<string, number> = {};
  const organizationTypes: Record<string, number> = {};
  let activeOrganizations = 0;

  organizations.forEach((org) => {
    industries[org.industry] = (industries[org.industry] || 0) + 1;
    organizationTypes[org.type] = (organizationTypes[org.type] || 0) + 1;
    if (org.status === 'active') activeOrganizations++;
  });

  // Calculate department insights
  const deptByType: Record<string, number> = {};
  let totalBudget = 0;
  let totalCurrentHeadcount = 0;
  let totalTargetHeadcount = 0;

  const departmentUtilization: OrganizationInsights['departments']['departmentUtilization'] = [];

  departments.forEach((dept) => {
    deptByType[dept.type] = (deptByType[dept.type] || 0) + 1;
    if (dept.budget) {
      totalBudget += dept.budget.allocated;
    }
    totalCurrentHeadcount += dept.headcount.current;
    totalTargetHeadcount += dept.headcount.target;

    const utilization = dept.headcount.target > 0
      ? Math.round((dept.headcount.current / dept.headcount.target) * 100)
      : 0;

    departmentUtilization.push({
      department: dept.name,
      code: dept.code,
      currentHeadcount: dept.headcount.current,
      targetHeadcount: dept.headcount.target,
      utilizationPercent: utilization,
    });
  });

  // Sort by utilization percentage (highest first)
  departmentUtilization.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  // Calculate branch insights
  const branchByType: Record<string, number> = {};
  const branchByCity: Record<string, number> = {};
  let headquartersCount = 0;
  let activeBranches = 0;

  branches.forEach((branch) => {
    branchByType[branch.type] = (branchByType[branch.type] || 0) + 1;
    branchByCity[branch.address.city] = (branchByCity[branch.address.city] || 0) + 1;
    if (branch.isHeadquarters) headquartersCount++;
    if (branch.status === 'active') activeBranches++;
  });

  // Calculate employee insights
  const empByEmploymentType: Record<string, number> = {};
  const empByStatus: Record<string, number> = {};
  let activeEmployees = 0;
  let totalTenure = 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  let newHiresLast30Days = 0;

  employees.forEach((emp) => {
    empByEmploymentType[emp.employmentType] = (empByEmploymentType[emp.employmentType] || 0) + 1;
    empByStatus[emp.status] = (empByStatus[emp.status] || 0) + 1;
    if (emp.status === 'active') activeEmployees++;

    const hireDate = new Date(emp.hireDate);
    const tenureMonths = (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    totalTenure += tenureMonths;

    if (hireDate >= thirtyDaysAgo) {
      newHiresLast30Days++;
    }
  });

  // Calculate policy insights
  const policyByType: Record<string, number> = {};
  const policyByStatus: Record<string, number> = {};
  let activePolicies = 0;
  const now = new Date();

  policies.forEach((policy) => {
    policyByType[policy.type] = (policyByType[policy.type] || 0) + 1;
    policyByStatus[policy.status] = (policyByStatus[policy.status] || 0) + 1;
    if (
      policy.status === 'active' &&
      policy.effectiveFrom <= now &&
      (!policy.effectiveTo || policy.effectiveTo >= now)
    ) {
      activePolicies++;
    }
  });

  // Calculate SLA insights
  const slaByPriority: Record<string, number> = {};
  let totalResponseTime = 0;
  let totalResolutionTime = 0;

  slaPolicies.forEach((sla) => {
    slaByPriority[sla.priority] = (slaByPriority[sla.priority] || 0) + 1;

    // Convert response time to minutes
    const responseMinutes = convertToMinutes(sla.responseTime.value, sla.responseTime.unit);
    const resolutionMinutes = convertToMinutes(sla.resolutionTime.value, sla.resolutionTime.unit);

    totalResponseTime += responseMinutes;
    totalResolutionTime += resolutionMinutes;
  });

  const avgResponseTime = slaPolicies.length > 0 ? totalResponseTime / slaPolicies.length : 0;
  const avgResolutionTime = slaPolicies.length > 0 ? totalResolutionTime / slaPolicies.length : 0;

  return {
    overview: {
      totalOrganizations: organizations.length,
      activeOrganizations,
      industries,
      organizationTypes,
    },
    departments: {
      total: departments.length,
      byType: deptByType,
      avgHeadcount: departments.length > 0 ? Math.round(totalCurrentHeadcount / departments.length) : 0,
      totalBudget,
      departmentUtilization: departmentUtilization.slice(0, 10), // Top 10
    },
    branches: {
      total: branches.length,
      byType: branchByType,
      byCity: branchByCity,
      headquarters: headquartersCount,
      activeBranches,
    },
    employees: {
      total: employees.length,
      active: activeEmployees,
      byEmploymentType: empByEmploymentType,
      byStatus: empByStatus,
      avgTenure: employees.length > 0 ? Math.round(totalTenure / employees.length) : 0,
      newHiresLast30Days,
    },
    policies: {
      total: policies.length,
      byType: policyByType,
      byStatus: policyByStatus,
      activePolicies,
    },
    sla: {
      total: slaPolicies.length,
      byPriority: slaByPriority,
      avgResponseTime: Math.round(avgResponseTime),
      avgResolutionTime: Math.round(avgResolutionTime),
    },
  };
};

// Helper function to convert time to minutes
function convertToMinutes(value: number, unit: string): number {
  switch (unit) {
    case 'minutes':
      return value;
    case 'hours':
      return value * 60;
    case 'days':
      return value * 60 * 24;
    default:
      return value;
  }
}
