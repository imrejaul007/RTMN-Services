/**
 * SUTAR OS — Workday Connector Tests
 */
import { describe, it, expect } from 'vitest';

describe('Workday Connector — Field Mappings', () => {
  const WORKER_TO_EMPLOYEE: Record<string, string> = {
    Worker_ID: 'employeeId', Legal_First_Name: 'firstName', Legal_Last_Name: 'lastName',
    Preferred_Name: 'preferredName', Primary_Work: 'email', Phone: 'phone',
    Job_Title: 'title', Business_Title: 'businessTitle', Organization: 'department',
    Location: 'location', Hire_Date: 'hireDate', Worker_Type: 'employmentType', Status: 'status',
  };

  const ORG_TO_HIERARCHY: Record<string, string> = {
    Organization_ID: 'orgId', Name: 'name', Parent_Org: 'parentOrgId',
    Type: 'orgType', Manager_ID: 'managerId', Headcount: 'employeeCount',
  };

  const PAYROLL_TO_FINANCE: Record<string, string> = {
    Pay_Period: 'payPeriod', Employee_ID: 'employeeId', Gross_Pay: 'grossPay',
    Net_Pay: 'netPay', Deductions: 'deductions', Taxes: 'taxes', Pay_Date: 'payDate',
  };

  function applyMapping(data: any, mapping: Record<string, string>) {
    const result: any = {};
    for (const [src, dst] of Object.entries(mapping)) {
      if (data[src] !== undefined) result[dst] = data[src];
    }
    return result;
  }

  it('maps Workday worker fields to SUTAR employee fields', () => {
    const worker = {
      Worker_ID: 'WD001', Legal_First_Name: 'Alice', Legal_Last_Name: 'Johnson',
      Preferred_Name: 'Ali', Primary_Work: 'alice@company.com', Phone: '+1-555-0300',
      Job_Title: 'Senior Engineer', Business_Title: 'Staff Software Engineer',
      Organization: 'Engineering', Location: 'Bangalore', Hire_Date: '2024-03-15',
      Worker_Type: 'Regular', Status: 'Active',
    };
    const emp = applyMapping(worker, WORKER_TO_EMPLOYEE);
    expect(emp.employeeId).toBe('WD001');
    expect(emp.firstName).toBe('Alice');
    expect(emp.lastName).toBe('Johnson');
    expect(emp.preferredName).toBe('Ali');
    expect(emp.email).toBe('alice@company.com');
    expect(emp.phone).toBe('+1-555-0300');
    expect(emp.title).toBe('Senior Engineer');
    expect(emp.businessTitle).toBe('Staff Software Engineer');
    expect(emp.department).toBe('Engineering');
    expect(emp.location).toBe('Bangalore');
    expect(emp.hireDate).toBe('2024-03-15');
    expect(emp.employmentType).toBe('Regular');
    expect(emp.status).toBe('Active');
  });

  it('skips undefined worker fields', () => {
    const worker = { Worker_ID: 'WD002', Legal_First_Name: 'Bob', Legal_Last_Name: 'Smith' };
    const emp = applyMapping(worker, WORKER_TO_EMPLOYEE);
    expect(emp.employeeId).toBe('WD002');
    expect(emp.email).toBeUndefined();
  });

  it('maps Workday org fields to hierarchy fields', () => {
    const org = { Organization_ID: 'ORG001', Name: 'Engineering', Parent_Org: 'ORG000', Type: 'Division', Manager_ID: 'WD001', Headcount: 50 };
    const hier = applyMapping(org, ORG_TO_HIERARCHY);
    expect(hier.orgId).toBe('ORG001');
    expect(hier.name).toBe('Engineering');
    expect(hier.parentOrgId).toBe('ORG000');
    expect(hier.orgType).toBe('Division');
    expect(hier.managerId).toBe('WD001');
    expect(hier.employeeCount).toBe(50);
  });

  it('maps Workday payroll fields to finance fields', () => {
    const payroll = { Pay_Period: '2026-06', Employee_ID: 'WD001', Gross_Pay: 100000, Net_Pay: 75000, Deductions: 15000, Taxes: 10000, Pay_Date: '2026-06-30' };
    const finance = applyMapping(payroll, PAYROLL_TO_FINANCE);
    expect(finance.payPeriod).toBe('2026-06');
    expect(finance.employeeId).toBe('WD001');
    expect(finance.grossPay).toBe(100000);
    expect(finance.netPay).toBe(75000);
    expect(finance.deductions).toBe(15000);
    expect(finance.taxes).toBe(10000);
    expect(finance.payDate).toBe('2026-06-30');
  });
});

describe('Workday Connector — Capability Inference', () => {
  function inferEmployeeCapabilities(wdWorker: any) {
    const caps = [];
    const title = (wdWorker.Job_Title || '').toLowerCase();
    const dept = (wdWorker.Organization || '').toLowerCase();
    caps.push('communication', 'task_execution', 'reporting');
    if (title.includes('manager') || title.includes('director')) caps.push('team_management', 'budget_control');
    if (title.includes('engineer') || title.includes('developer')) caps.push('code_review', 'technical_planning');
    if (title.includes('sales')) caps.push('lead_generation', 'negotiation');
    if (dept.includes('finance')) caps.push('budget_management', 'expense_tracking');
    if (dept.includes('hr') || dept.includes('people') || dept.includes('talent') || dept.includes('human')) caps.push('recruitment', 'onboarding');
    return caps;
  }

  it('has base capabilities', () => {
    const caps = inferEmployeeCapabilities({});
    expect(caps).toContain('communication');
    expect(caps).toContain('task_execution');
    expect(caps).toContain('reporting');
  });

  it('infers management capabilities for managers', () => {
    const caps = inferEmployeeCapabilities({ Job_Title: 'Engineering Manager' });
    expect(caps).toContain('team_management');
    expect(caps).toContain('budget_control');
  });

  it('infers management capabilities for directors', () => {
    const caps = inferEmployeeCapabilities({ Job_Title: 'Director of Sales' });
    expect(caps).toContain('team_management');
    expect(caps).toContain('budget_control');
  });

  it('infers technical capabilities for engineers', () => {
    const caps = inferEmployeeCapabilities({ Job_Title: 'Senior Software Engineer' });
    expect(caps).toContain('code_review');
    expect(caps).toContain('technical_planning');
  });

  it('infers sales capabilities', () => {
    const caps = inferEmployeeCapabilities({ Job_Title: 'Sales Executive' });
    expect(caps).toContain('lead_generation');
    expect(caps).toContain('negotiation');
  });

  it('infers finance capabilities for finance dept', () => {
    const caps = inferEmployeeCapabilities({ Organization: 'Finance' });
    expect(caps).toContain('budget_management');
    expect(caps).toContain('expense_tracking');
  });

  it('infers HR capabilities for HR dept', () => {
    const caps = inferEmployeeCapabilities({ Organization: 'Human Resources' });
    expect(caps).toContain('recruitment');
    expect(caps).toContain('onboarding');
  });
});

describe('Workday Connector — Role Level Inference', () => {
  function inferRoleLevel(wdWorker: any) {
    const title = (wdWorker.Job_Title || '').toLowerCase();
    if (title.includes('director') || title.includes('vp')) return 'senior_leadership';
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo')) return 'executive';
    if (title.includes('manager') || title.includes('head')) return 'management';
    if (title.includes('senior') || title.includes('lead')) return 'senior_individual';
    return 'individual_contributor';
  }

  it('maps executive titles', () => {
    expect(inferRoleLevel({ Job_Title: 'CEO' })).toBe('executive');
    expect(inferRoleLevel({ Job_Title: 'CTO' })).toBe('executive');
    expect(inferRoleLevel({ Job_Title: 'CFO' })).toBe('executive');
  });

  it('maps VP and director', () => {
    expect(inferRoleLevel({ Job_Title: 'VP of Engineering' })).toBe('senior_leadership');
    expect(inferRoleLevel({ Job_Title: 'Director of Sales' })).toBe('senior_leadership');
  });

  it('maps manager and head', () => {
    expect(inferRoleLevel({ Job_Title: 'Engineering Manager' })).toBe('management');
    expect(inferRoleLevel({ Job_Title: 'Head of Product' })).toBe('management');
  });

  it('maps senior and lead', () => {
    expect(inferRoleLevel({ Job_Title: 'Senior Engineer' })).toBe('senior_individual');
    expect(inferRoleLevel({ Job_Title: 'Tech Lead' })).toBe('senior_individual');
  });

  it('defaults to individual contributor', () => {
    expect(inferRoleLevel({ Job_Title: 'Software Engineer' })).toBe('individual_contributor');
    expect(inferRoleLevel({})).toBe('individual_contributor');
  });
});

describe('Workday Connector — Org Depth', () => {
  function calculateOrgDepth(wdOrg: any) {
    if (!wdOrg.Parent_Org) return 1;
    return 2;
  }

  it('returns 1 for top-level orgs', () => {
    expect(calculateOrgDepth({ Organization_ID: 'ORG000' })).toBe(1);
  });

  it('returns 2 for child orgs', () => {
    expect(calculateOrgDepth({ Organization_ID: 'ORG001', Parent_Org: 'ORG000' })).toBe(2);
  });
});

describe('Workday Connector — Configuration', () => {
  it('has correct Workday config defaults', () => {
    const WORKDAY_CONFIG = {
      tenantId: process.env.WORKDAY_TENANT || 'demo_tenant',
      host: process.env.WORKDAY_HOST || 'wd2.example.com',
      apiVersion: process.env.WORKDAY_API_VER || 'v40',
      clientId: process.env.WORKDAY_CLIENT_ID || 'demo_client_id',
      clientSecret: process.env.WORKDAY_CLIENT_SECRET || 'demo_client_secret',
    };
    expect(WORKDAY_CONFIG.tenantId).toBe('demo_tenant');
    expect(WORKDAY_CONFIG.apiVersion).toBe('v40');
    expect(WORKDAY_CONFIG.host).toBe('wd2.example.com');
  });

  it('has correct SUTAR endpoint defaults', () => {
    const SUTAR_ENDPOINTS = {
      acnNetwork: process.env.ACN_NETWORK_URL || 'http://localhost:4801',
      workforce: process.env.WORKFORCE_URL || 'http://localhost:5077',
      agentTwin: process.env.AGENT_TWIN_URL || 'http://localhost:4705',
    };
    expect(SUTAR_ENDPOINTS.acnNetwork).toBe('http://localhost:4801');
    expect(SUTAR_ENDPOINTS.workforce).toBe('http://localhost:5077');
    expect(SUTAR_ENDPOINTS.agentTwin).toBe('http://localhost:4705');
  });
});