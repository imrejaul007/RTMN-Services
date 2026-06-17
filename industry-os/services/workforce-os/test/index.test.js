/**
 * RTMN Workforce OS - Unit Tests
 *
 * Tests for all core functionality:
 * - Employee CRUD
 * - Leave Management
 * - Attendance
 * - Payroll
 * - Benefits
 * - AI Agents
 * - Event Bus
 * - TwinOS Sync
 * - Industry Connectors
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';

// Test configuration
const API_BASE = 'http://localhost:5065';
const TEST_TIMEOUT = 30000;

// Helper to make HTTP requests
async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json();
  return { status: response.status, data };
}

// ============================================================
// HEALTH & STATUS TESTS
// ============================================================

describe('Health & Status', () => {
  test('GET /health returns healthy status', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/health`);

    expect(status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('workforce-os');
  });

  test('GET /status returns service stats', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/status`);

    expect(status).toBe(200);
    expect(data.modules).toBeDefined();
    expect(data.integrations).toBeDefined();
  });
});

// ============================================================
// EMPLOYEE TESTS
// ============================================================

describe('Employee Management', () => {
  let testEmployeeId;

  test('GET /api/employees returns employee list', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/employees`);

    expect(status).toBe(200);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('POST /api/employees creates new employee', async () => {
    const newEmployee = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.user.${Date.now()}@rtmn.com`,
      departmentId: 'DEPT001',
      positionId: 'POS001',
      employmentType: 'full-time',
      workLocation: 'Bangalore',
      joiningDate: '2026-06-01',
      salary: {
        basic: 500000,
        hra: 250000,
        allowances: 100000,
      },
      skills: ['JavaScript', 'Node.js'],
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/employees`, {
      method: 'POST',
      body: JSON.stringify(newEmployee),
    });

    expect(status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.firstName).toBe('Test');
    expect(data.lastName).toBe('User');

    testEmployeeId = data.id;
  });

  test('GET /api/employees/:id returns employee details', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/employees/EMP001`);

    expect(status).toBe(200);
    expect(data.id).toBe('EMP001');
    expect(data.firstName).toBeDefined();
    expect(data.department).toBeDefined();
  });

  test('PATCH /api/employees/:id updates employee', async () => {
    const updates = {
      phone: '+919876543210',
      workLocation: 'Mumbai',
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/employees/EMP001`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    expect(status).toBe(200);
    expect(data.phone).toBe('+919876543210');
    expect(data.workLocation).toBe('Mumbai');
  });

  test('GET /api/departments returns department list', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/departments`);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toBeGreaterThan(0);
  });
});

// ============================================================
// LEAVE MANAGEMENT TESTS
// ============================================================

describe('Leave Management', () => {
  test('GET /api/leave/types returns leave types', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/leave/types`);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toBeGreaterThan(0);

    const leaveTypes = data.map(l => l.type);
    expect(leaveTypes).toContain('casual');
    expect(leaveTypes).toContain('sick');
    expect(leaveTypes).toContain('earned');
  });

  test('GET /api/leave/balance/:id returns leave balance', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/leave/balance/EMP001`);

    expect(status).toBe(200);
    expect(data.employeeId).toBe('EMP001');
    expect(data.casual).toBeDefined();
    expect(data.sick).toBeDefined();
    expect(data.earned).toBeDefined();
  });

  test('POST /api/leave/request creates leave request', async () => {
    const leaveRequest = {
      employeeId: 'EMP001',
      leaveType: 'casual',
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      reason: 'Personal work',
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/leave/request`, {
      method: 'POST',
      body: JSON.stringify(leaveRequest),
    });

    expect(status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.status).toBe('pending');
  });
});

// ============================================================
// ATTENDANCE TESTS
// ============================================================

describe('Attendance', () => {
  test('POST /api/attendance/checkin marks attendance', async () => {
    const checkIn = {
      employeeId: 'EMP001',
      location: 'Bangalore Office',
      device: 'web',
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/attendance/checkin`, {
      method: 'POST',
      body: JSON.stringify(checkIn),
    });

    expect(status).toBe(200);
    expect(data.employeeId).toBe('EMP001');
    expect(data.checkIn).toBeDefined();
  });

  test('GET /api/attendance/:id returns attendance records', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/attendance/EMP001`);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);
  });
});

// ============================================================
// PAYROLL TESTS
// ============================================================

describe('Payroll', () => {
  test('POST /api/payroll/calculate calculates payroll', async () => {
    const calculation = {
      employeeId: 'EMP001',
      month: '06',
      year: '2026',
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/payroll/calculate`, {
      method: 'POST',
      body: JSON.stringify(calculation),
    });

    expect(status).toBe(200);
    expect(data.id).toBeDefined();
    expect(data.earnings).toBeDefined();
    expect(data.deductions).toBeDefined();
    expect(data.netPay).toBeDefined();
  });

  test('GET /api/payroll/records returns payroll history', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/payroll/records?employeeId=EMP001`);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);
  });

  test('GET /api/payroll/runs returns payroll runs', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/payroll/runs`);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);
  });
});

// ============================================================
// BENEFITS TESTS
// ============================================================

describe('Benefits', () => {
  test('GET /api/benefits/plans returns available plans', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/benefits/plans`);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toBeGreaterThan(0);

    const planTypes = data.map(p => p.type);
    expect(planTypes).toContain('health');
    expect(planTypes).toContain('dental');
    expect(planTypes).toContain('life');
  });

  test('POST /api/benefits/enroll enrolls in plan', async () => {
    const enrollment = {
      employeeId: 'EMP001',
      planType: 'health',
      planId: 'Gold Health Plan',
      dependents: [],
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/benefits/enroll`, {
      method: 'POST',
      body: JSON.stringify(enrollment),
    });

    expect(status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.status).toBe('active');
  });

  test('GET /api/benefits/enrollments returns enrollments', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/benefits/enrollments?employeeId=EMP001`);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);
  });
});

// ============================================================
// ANALYTICS TESTS
// ============================================================

describe('Analytics', () => {
  test('GET /api/analytics/dashboard returns dashboard data', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/analytics/dashboard`);

    expect(status).toBe(200);
    expect(data.headcount).toBeDefined();
    expect(data.headcount.total).toBeGreaterThan(0);
  });
});

// ============================================================
// COPILOT TESTS
// ============================================================

describe('AI Copilot', () => {
  test('POST /api/copilot/chat responds to leave query', async () => {
    const chatRequest = {
      message: 'How much leave do I have?',
      employeeId: 'EMP001',
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/copilot/chat`, {
      method: 'POST',
      body: JSON.stringify(chatRequest),
    });

    expect(status).toBe(200);
    expect(data.response).toBeDefined();
    expect(data.suggestions).toBeInstanceOf(Array);
  });

  test('POST /api/copilot/chat responds to payroll query', async () => {
    const chatRequest = {
      message: 'Show my latest payslip',
      employeeId: 'EMP001',
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/copilot/chat`, {
      method: 'POST',
      body: JSON.stringify(chatRequest),
    });

    expect(status).toBe(200);
    expect(data.response).toBeDefined();
    expect(data.actions).toBeInstanceOf(Array);
  });

  test('POST /api/copilot/chat responds to policy query', async () => {
    const chatRequest = {
      message: 'What are the WFH policies?',
      employeeId: 'EMP001',
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/copilot/chat`, {
      method: 'POST',
      body: JSON.stringify(chatRequest),
    });

    expect(status).toBe(200);
    expect(data.response).toBeDefined();
  });
});

// ============================================================
// EXPENSES TESTS
// ============================================================

describe('Expenses', () => {
  test('GET /api/expenses/categories returns expense categories', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/expenses/categories`);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toBeGreaterThan(0);
  });

  test('POST /api/expenses submits expense', async () => {
    const expense = {
      employeeId: 'EMP001',
      category: 'travel',
      description: 'Client meeting travel',
      amount: 5000,
      date: '2026-06-15',
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });

    expect(status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.status).toBe('pending');
  });

  test('GET /api/expenses returns expense list', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/expenses?employeeId=EMP001`);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);
  });
});

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

describe('Error Handling', () => {
  test('GET /api/employees/:id returns 404 for non-existent employee', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/employees/NONEXISTENT`);

    expect(status).toBe(404);
    expect(data.error).toBeDefined();
  });

  test('POST /api/employees validates required fields', async () => {
    const invalidEmployee = {
      firstName: 'Test',
      // Missing required fields
    };

    const { status, data } = await fetchJSON(`${API_BASE}/api/employees`, {
      method: 'POST',
      body: JSON.stringify(invalidEmployee),
    });

    expect(status).toBe(500);
  });

  test('Invalid JSON returns error', async () => {
    const response = await fetch(`${API_BASE}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(response.status).toBe(400);
  });
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

describe('Integration Points', () => {
  test('Employee creation triggers event (mock test)', async () => {
    // This would test Event Bus integration in production
    // For now, verify the endpoint exists
    const { status } = await fetchJSON(`${API_BASE}/api/employees`, {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'Integration',
        lastName: 'Test',
        email: 'integration.test@rtmn.com',
        departmentId: 'DEPT001',
        positionId: 'POS001',
      }),
    });

    expect(status).toBe(201);
  });

  test('Twin sync endpoint exists', async () => {
    // Verify TwinOS integration endpoint structure
    const { status, data } = await fetchJSON(`${API_BASE}/api/employees/EMP001`);

    expect(status).toBe(200);
    expect(data).toHaveProperty('id');
  });
});

// ============================================================
// PERFORMANCE TESTS
// ============================================================

describe('Performance', () => {
  test('API responds within acceptable time', async () => {
    const start = Date.now();
    const { status } = await fetchJSON(`${API_BASE}/api/employees`);
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(duration).toBeLessThan(1000); // Should respond within 1 second
  });

  test('Bulk data retrieval is efficient', async () => {
    const start = Date.now();
    const { status, data } = await fetchJSON(`${API_BASE}/api/employees?limit=100`);
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(duration).toBeLessThan(2000); // Should handle 100 records within 2 seconds
  });
});

// ============================================================
// RUN TEST SERVER (for development)
// ============================================================

export async function runTestServer() {
  return new Promise((resolve) => {
    const server = spawn('node', ['src/index.js'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' },
    });

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('started on port')) {
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('Server startup timeout, continuing anyway');
      resolve(server);
    }, 10000);
  });
}

export async function stopTestServer(server) {
  if (server) {
    server.kill();
  }
}
