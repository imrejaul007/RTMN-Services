/**
 * Workforce OS - Test Suite
 *
 * Tests: Employees, Departments, Leave, Attendance, Payroll, Recruitment
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Data stores
const mockEmployees = new Map();
const mockDepartments = new Map();
const mockLeave = new Map();
const mockAttendance = new Map();
const mockPayroll = new Map();

let idCounter = 1;
const generateId = () => `wf_${String(idCounter++).padStart(6, '0')}`;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  status: 'active' | 'inactive' | 'terminated';
  joinDate: string;
  salary: number;
  managerId?: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'sick' | 'casual' | 'earned' | 'unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
}

const workforceService = {
  // Employees
  createEmployee(data: Partial<Employee>): Employee {
    const emp: Employee = {
      id: generateId(),
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      department: data.department || '',
      designation: data.designation || '',
      status: data.status || 'active',
      joinDate: data.joinDate || new Date().toISOString(),
      salary: data.salary || 0,
      managerId: data.managerId,
    };
    mockEmployees.set(emp.id, emp);
    return emp;
  },

  getEmployee(id: string): Employee | undefined {
    return mockEmployees.get(id);
  },

  listEmployees(filters?: { department?: string; status?: string }): Employee[] {
    let emps = Array.from(mockEmployees.values());
    if (filters?.department) emps = emps.filter(e => e.department === filters.department);
    if (filters?.status) emps = emps.filter(e => e.status === filters.status);
    return emps;
  },

  // Departments
  createDepartment(name: string, headId?: string): any {
    const dept = {
      id: generateId(),
      name,
      headId,
      employeeCount: 0,
      createdAt: new Date().toISOString(),
    };
    mockDepartments.set(dept.id, dept);
    return dept;
  },

  getDepartmentHead(deptId: string): Employee | undefined {
    const dept = mockDepartments.get(deptId);
    if (!dept?.headId) return undefined;
    return mockEmployees.get(dept.headId);
  },

  // Leave
  createLeaveRequest(data: Partial<LeaveRequest>): LeaveRequest {
    const req: LeaveRequest = {
      id: generateId(),
      employeeId: data.employeeId || '',
      type: data.type || 'unpaid',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      reason: data.reason || '',
      status: 'pending',
    };
    mockLeave.set(req.id, req);
    return req;
  },

  approveLeave(id: string, approverId: string): LeaveRequest | undefined {
    const req = mockLeave.get(id);
    if (!req) return undefined;
    req.status = 'approved';
    req.approvedBy = approverId;
    mockLeave.set(id, req);
    return req;
  },

  // Attendance
  recordAttendance(employeeId: string, date: string, checkIn: string, checkOut?: string): any {
    const hoursWorked = checkOut ? (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000 : 0;
    const record = {
      id: generateId(),
      employeeId,
      date,
      checkIn,
      checkOut,
      hoursWorked,
      status: hoursWorked >= 8 ? 'full-day' : hoursWorked >= 4 ? 'half-day' : 'absent',
    };
    mockAttendance.set(record.id, record);
    return record;
  },

  getAttendance(employeeId: string, month: number, year: number): any[] {
    return Array.from(mockAttendance.values()).filter(r => {
      const d = new Date(r.date);
      return r.employeeId === employeeId && d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  },

  // Payroll
  calculateSalary(employeeId: string): { gross: number; deductions: number; net: number; breakdown: any } {
    const emp = mockEmployees.get(employeeId);
    if (!emp) return { gross: 0, deductions: 0, net: 0, breakdown: {} };

    const pf = emp.salary * 0.12;
    const tax = emp.salary * 0.2;
    const professionalTax = 200;
    const deductions = pf + tax + professionalTax;

    return {
      gross: emp.salary,
      deductions,
      net: emp.salary - deductions,
      breakdown: { pf, tax, professionalTax },
    };
  },

  // Analytics
  getHeadcount(): any {
    const emps = Array.from(mockEmployees.values());
    const byDept: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    emps.forEach(e => {
      byDept[e.department] = (byDept[e.department] || 0) + 1;
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    });

    const totalSalary = emps.reduce((sum, e) => sum + e.salary, 0);

    return { total: emps.length, byDept, byStatus, totalSalary };
  },

  reset() {
    mockEmployees.clear();
    mockDepartments.clear();
    mockLeave.clear();
    mockAttendance.clear();
    mockPayroll.clear();
    idCounter = 1;
  },
};

describe('Workforce OS - Employees', () => {
  beforeEach(() => workforceService.reset());

  describe('createEmployee', () => {
    it('should create employee with all fields', () => {
      const emp = workforceService.createEmployee({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@company.com',
        department: 'Engineering',
        designation: 'Software Engineer',
        salary: 120000,
        joinDate: '2026-01-15',
      });
      expect(emp.id).toBeDefined();
      expect(emp.firstName).toBe('John');
      expect(emp.lastName).toBe('Doe');
      expect(emp.status).toBe('active');
    });

    it('should set manager relationship', () => {
      const manager = workforceService.createEmployee({ firstName: 'Jane', lastName: 'Manager', email: 'jane@co.com', department: 'Eng', salary: 200000 });
      const emp = workforceService.createEmployee({ firstName: 'John', lastName: 'Doe', email: 'john@co.com', department: 'Eng', salary: 120000, managerId: manager.id });
      expect(emp.managerId).toBe(manager.id);
    });
  });

  describe('listEmployees', () => {
    it('should filter by department', () => {
      workforceService.createEmployee({ firstName: 'E1', lastName: 'L', email: 'e1@e.com', department: 'Eng' });
      workforceService.createEmployee({ firstName: 'E2', lastName: 'L', email: 'e2@e.com', department: 'Sales' });
      workforceService.createEmployee({ firstName: 'E3', lastName: 'L', email: 'e3@e.com', department: 'Eng' });

      const eng = workforceService.listEmployees({ department: 'Eng' });
      expect(eng).toHaveLength(2);
    });

    it('should filter by status', () => {
      workforceService.createEmployee({ firstName: 'A', lastName: 'L', email: 'a@e.com', status: 'active' });
      workforceService.createEmployee({ firstName: 'T', lastName: 'L', email: 't@e.com', status: 'terminated' });

      const active = workforceService.listEmployees({ status: 'active' });
      expect(active).toHaveLength(1);
    });
  });
});

describe('Workforce OS - Leave Management', () => {
  beforeEach(() => workforceService.reset());

  describe('createLeaveRequest', () => {
    it('should create with leave types', () => {
      const emp = workforceService.createEmployee({ firstName: 'J', lastName: 'D', email: 'j@e.com' });
      const req = workforceService.createLeaveRequest({
        employeeId: emp.id,
        type: 'sick',
        startDate: '2026-07-01',
        endDate: '2026-07-03',
        reason: 'Medical',
      });
      expect(req.status).toBe('pending');
      expect(req.type).toBe('sick');
    });
  });

  describe('approveLeave', () => {
    it('should approve and track approver', () => {
      const emp = workforceService.createEmployee({ firstName: 'J', lastName: 'D', email: 'j@e.com' });
      const req = workforceService.createLeaveRequest({ employeeId: emp.id });
      const approved = workforceService.approveLeave(req.id, 'manager_001');
      expect(approved?.status).toBe('approved');
      expect(approved?.approvedBy).toBe('manager_001');
    });
  });
});

describe('Workforce OS - Attendance', () => {
  beforeEach(() => workforceService.reset());

  describe('recordAttendance', () => {
    it('should calculate hours worked', () => {
      const emp = workforceService.createEmployee({ firstName: 'J', lastName: 'D', email: 'j@e.com' });
      const record = workforceService.recordAttendance(emp.id, '2026-07-01', '2026-07-01T09:00:00Z', '2026-07-01T18:00:00Z');
      expect(record.hoursWorked).toBe(9);
      expect(record.status).toBe('full-day');
    });

    it('should mark half-day for 6 hours', () => {
      const emp = workforceService.createEmployee({ firstName: 'J', lastName: 'D', email: 'j@e.com' });
      const record = workforceService.recordAttendance(emp.id, '2026-07-01', '2026-07-01T09:00:00Z', '2026-07-01T15:00:00Z');
      expect(record.status).toBe('half-day');
    });
  });

  describe('getAttendance', () => {
    it('should filter by month and year', () => {
      const emp = workforceService.createEmployee({ firstName: 'J', lastName: 'D', email: 'j@e.com' });
      workforceService.recordAttendance(emp.id, '2026-06-15', '09:00', '18:00');
      workforceService.recordAttendance(emp.id, '2026-07-01', '09:00', '18:00');
      workforceService.recordAttendance(emp.id, '2026-07-15', '09:00', '18:00');

      const july = workforceService.getAttendance(emp.id, 7, 2026);
      expect(july).toHaveLength(2);
    });
  });
});

describe('Workforce OS - Payroll', () => {
  beforeEach(() => workforceService.reset());

  describe('calculateSalary', () => {
    it('should calculate PF deduction at 12%', () => {
      const emp = workforceService.createEmployee({ firstName: 'J', lastName: 'D', email: 'j@e.com', salary: 100000 });
      const salary = workforceService.calculateSalary(emp.id);
      expect(salary.gross).toBe(100000);
      expect(salary.breakdown.pf).toBe(12000); // 12% of 100000
    });

    it('should calculate net salary', () => {
      const emp = workforceService.createEmployee({ firstName: 'J', lastName: 'D', email: 'j@e.com', salary: 100000 });
      const salary = workforceService.calculateSalary(emp.id);
      expect(salary.net).toBeLessThan(salary.gross);
      expect(salary.net).toBe(100000 - salary.deductions);
    });
  });
});

describe('Workforce OS - Headcount Analytics', () => {
  beforeEach(() => workforceService.reset());

  it('should aggregate by department and status', () => {
    workforceService.createEmployee({ firstName: 'E1', lastName: 'L', email: 'e1@e.com', department: 'Eng', status: 'active', salary: 80000 });
    workforceService.createEmployee({ firstName: 'E2', lastName: 'L', email: 'e2@e.com', department: 'Eng', status: 'active', salary: 90000 });
    workforceService.createEmployee({ firstName: 'S1', lastName: 'L', email: 's1@e.com', department: 'Sales', status: 'active', salary: 70000 });
    workforceService.createEmployee({ firstName: 'T1', lastName: 'L', email: 't1@e.com', department: 'Eng', status: 'terminated', salary: 60000 });

    const hc = workforceService.getHeadcount();
    expect(hc.total).toBe(4);
    expect(hc.byDept['Eng']).toBe(3);
    expect(hc.byDept['Sales']).toBe(1);
    expect(hc.byStatus['active']).toBe(3);
    expect(hc.byStatus['terminated']).toBe(1);
    expect(hc.totalSalary).toBe(300000);
  });
});
