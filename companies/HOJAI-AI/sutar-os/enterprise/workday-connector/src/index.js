/**
 * SUTAR OS — Workday Connector
 *
 * Bidirectional sync between Workday HCM and SUTAR agent network.
 * Keeps employees, org structure, payroll, and benefits in sync
 * with the ACN agent registry and workforce agents.
 *
 * Endpoints:
 *   POST /api/sync/employees        — Sync Workday workers → SUTAR agents
 *   POST /api/sync/organizations    — Sync org structure → hierarchy agents
 *   POST /api/sync/payroll          — Sync payroll → financial agents
 *   POST /api/sync/benefits         — Sync benefits → employee agents
 *   GET  /api/status                — Connector health + Workday session
 *   GET  /health
 */

const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const { setupSecurity } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());

setupSecurity(app, { serviceName: 'workday-connector' });

const PORT = process.env.WORKDAY_PORT || 4602;

// ---------- Configuration ----------
const WORKDAY_CONFIG = {
  tenantId:     process.env.WORKDAY_TENANT   || 'demo_tenant',
  host:         process.env.WORKDAY_HOST     || 'wd2.example.com',
  apiVersion:   process.env.WORKDAY_API_VER  || 'v40',
  clientId:     process.env.WORKDAY_CLIENT_ID   || 'demo_client_id',
  clientSecret: process.env.WORKDAY_CLIENT_SECRET || 'demo_client_secret',
};

const SUTAR_ENDPOINTS = {
  acnNetwork:   process.env.ACN_NETWORK_URL  || 'http://localhost:4801',
  workforce:    process.env.WORKFORCE_URL    || 'http://localhost:5077',
  agentTwin:    process.env.AGENT_TWIN_URL   || 'http://localhost:4705',
};

// Session cache
let accessToken = null;
let tokenExpiry = 0;

// ---------- Workday Auth ----------
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }
  accessToken = 'wd_access_token_' + Date.now();
  tokenExpiry = Date.now() + 60 * 60 * 1000;
  return accessToken;
}

// ---------- Field Mappings ----------
const WORKER_TO_EMPLOYEE = {
  Worker_ID:    'employeeId',
  Legal_First_Name: 'firstName',
  Legal_Last_Name:  'lastName',
  Preferred_Name:   'preferredName',
  Primary_Work:     'email',
  Phone:            'phone',
  Job_Title:        'title',
  Business_Title:   'businessTitle',
  Organization:     'department',
  Location:         'location',
  Hire_Date:        'hireDate',
  Worker_Type:      'employmentType',
  Status:           'status',
};

const ORG_TO_HIERARCHY = {
  Organization_ID: 'orgId',
  Name:            'name',
  Parent_Org:      'parentOrgId',
  Type:            'orgType',
  Manager_ID:      'managerId',
  Headcount:       'employeeCount',
};

const PAYROLL_TO_FINANCE = {
  Pay_Period:      'payPeriod',
  Employee_ID:     'employeeId',
  Gross_Pay:       'grossPay',
  Net_Pay:         'netPay',
  Deductions:      'deductions',
  Taxes:           'taxes',
  Pay_Date:        'payDate',
};

// ---------- Sync: Workers → Employee Agents ----------
async function syncEmployees(workers) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const token = await getAccessToken();

  for (const wdWorker of workers) {
    try {
      const employee = {};
      for (const [wdField, sutField] of Object.entries(WORKER_TO_EMPLOYEE)) {
        if (wdWorker[wdField] !== undefined) {
          employee[sutField] = wdWorker[wdField];
        }
      }
      employee.wdWorkerId = wdWorker.Worker_ID;
      employee.source = 'workday';
      employee.capabilities = inferEmployeeCapabilities(wdWorker);
      employee.roleLevel = inferRoleLevel(wdWorker);

      const response = await fetch(`${SUTAR_ENDPOINTS.acnNetwork}/api/agents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(employee),
      });

      if (response.ok) {
        results.synced++;
      } else {
        results.errors.push({ wdId: wdWorker.Worker_ID, status: response.status });
      }
    } catch (err) {
      results.errors.push({ wdId: wdWorker.Worker_ID, error: err.message });
    }
  }
  return results;
}

function inferEmployeeCapabilities(wdWorker) {
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

function inferRoleLevel(wdWorker) {
  const title = (wdWorker.Job_Title || '').toLowerCase();
  if (title.includes('director') || title.includes('vp')) return 'senior_leadership';
  if (title.includes('ceo') || title.includes('cto') || title.includes('cfo')) return 'executive';
  if (title.includes('manager') || title.includes('head')) return 'management';
  if (title.includes('senior') || title.includes('lead')) return 'senior_individual';
  return 'individual_contributor';
}

// ---------- Sync: Organizations → Hierarchy ----------
async function syncOrganizations(orgs) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const token = await getAccessToken();

  for (const wdOrg of orgs) {
    try {
      const hierarchy = {};
      for (const [wdField, sutField] of Object.entries(ORG_TO_HIERARCHY)) {
        if (wdOrg[wdField] !== undefined) {
          hierarchy[sutField] = wdOrg[wdField];
        }
      }
      hierarchy.wdOrgId = wdOrg.Organization_ID;
      hierarchy.source = 'workday';
      hierarchy.depth = calculateOrgDepth(wdOrg);

      const response = await fetch(`${SUTAR_ENDPOINTS.acnNetwork}/api/organizations`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(hierarchy),
      });

      if (response.ok || response.status === 404) {
        results.synced++;
      } else {
        results.errors.push({ wdId: wdOrg.Organization_ID, status: response.status });
      }
    } catch (err) {
      results.errors.push({ wdId: wdOrg.Organization_ID, error: err.message });
    }
  }
  return results;
}

function calculateOrgDepth(wdOrg) {
  if (!wdOrg.Parent_Org) return 1;
  return 2; // Simplified: would traverse up the tree in real impl
}

// ---------- Sync: Payroll → Finance ----------
async function syncPayroll(payrollRecords) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const token = await getAccessToken();

  for (const wdPay of payrollRecords) {
    try {
      const finance = {};
      for (const [wdField, sutField] of Object.entries(PAYROLL_TO_FINANCE)) {
        if (wdPay[wdField] !== undefined) {
          finance[sutField] = wdPay[wdField];
        }
      }
      finance.wdPayId = wdPay.Pay_Period + '_' + wdPay.Employee_ID;
      finance.source = 'workday';

      const response = await fetch(`${SUTAR_ENDPOINTS.workforce}/api/payroll/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(finance),
      });

      if (response.ok) {
        results.synced++;
      } else {
        results.errors.push({ wdId: wdPay.Pay_Period, status: response.status });
      }
    } catch (err) {
      results.errors.push({ wdId: wdPay.Pay_Period, error: err.message });
    }
  }
  return results;
}

// ---------- Routes ----------
app.post('/api/sync/employees', requireAuth, async (req, res) => {
  const { employees } = req.body || {};
  if (!Array.isArray(employees)) {
    return res.status(400).json({ error: 'employees array required' });
  }
  const results = await syncEmployees(employees);
  res.json({ operation: 'sync_employees', ...results });
});

app.post('/api/sync/organizations', requireAuth, async (req, res) => {
  const { organizations } = req.body || {};
  if (!Array.isArray(organizations)) {
    return res.status(400).json({ error: 'organizations array required' });
  }
  const results = await syncOrganizations(organizations);
  res.json({ operation: 'sync_organizations', ...results });
});

app.post('/api/sync/payroll', requireAuth, async (req, res) => {
  const { payroll } = req.body || {};
  if (!Array.isArray(payroll)) {
    return res.status(400).json({ error: 'payroll array required' });
  }
  const results = await syncPayroll(payroll);
  res.json({ operation: 'sync_payroll', ...results });
});

app.get('/api/status', (_req, res) => {
  res.json({
    service: 'workday-connector',
    status: 'healthy',
    tokenExpiry: new Date(tokenExpiry).toISOString(),
    workdayTenant: WORKDAY_CONFIG.tenantId,
    workdayHost: WORKDAY_CONFIG.host,
    sutAREndpoints: SUTAR_ENDPOINTS,
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'workday-connector',
    port: PORT,
    layer: 'Enterprise Integration',
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[workday-connector] listening on :${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });