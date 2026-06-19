/**
 * CorpID Cloud - Employee Identity Model
 * Deep employee identity for CorpPerks and Workforce OS
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const employees = new Map();      // employeeId -> Employee
export const employeeSkills = new Map(); // employeeId -> [Skill]
export const employeeDocuments = new Map(); // employeeId -> [Document]
export const employeeLeave = new Map();  // employeeId -> LeaveBalance

// ============ MODEL FACTORY ============

/**
 * Create or get employee record
 */
export function getOrCreateEmployee(userId) {
  let employee = employees.get(userId);

  if (!employee) {
    const now = new Date().toISOString();
    const employeeId = `emp-${uuidv4().slice(0, 8)}`;

    employee = {
      id: employeeId,
      userId,

      // Employment
      employeeId: employeeId,
      title: null,
      department: null,
      teamIds: [],
      managerId: null,
      directReports: [],

      // Employment Details
      employmentType: 'full-time', // full-time, part-time, contract, intern
      employmentStatus: 'active', // active, on-leave, terminated
      startDate: now,
      endDate: null,
      probationEndDate: null,

      // Work
      workEmail: null,
      workPhone: null,
      workLocation: 'office', // office, remote, hybrid
      officeLocation: null,

      // Compensation
      payrollId: null,
      costCenter: null,
      band: null,
      level: null,

      // Skills
      skills: [],

      // Benefits
      benefits: [],

      // Documents
      documents: [],

      // Leave
      leaveBalance: {
        cl: 0,   // Casual Leave
        sl: 0,   // Sick Leave
        el: 0,   // Earned Leave
        other: {}
      },

      // Performance
      performance: {
        lastReviewAt: null,
        nextReviewAt: null,
        rating: null
      },

      // Organization
      organizationId: null,

      // Timestamps
      createdAt: now,
      updatedAt: now
    };

    employees.set(userId, employee);
  }

  return employee;
}

/**
 * Update employee
 */
export function updateEmployee(userId, data) {
  const employee = getOrCreateEmployee(userId);

  const allowedFields = [
    'title', 'department', 'teamIds', 'managerId', 'employmentType',
    'workEmail', 'workPhone', 'workLocation', 'officeLocation',
    'payrollId', 'costCenter', 'band', 'level', 'organizationId',
    'probationEndDate', 'endDate'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      employee[field] = data[field];
    }
  }

  employee.updatedAt = new Date().toISOString();
  employees.set(userId, employee);
  return employee;
}

/**
 * Add skill
 */
export function addSkill(userId, skill) {
  const employee = getOrCreateEmployee(userId);

  const skillEntry = {
    id: `skill-${uuidv4().slice(0, 8)}`,
    name: skill.name,
    level: skill.level || 'beginner', // beginner, intermediate, expert
    certified: skill.certified || false,
    certifiedAt: skill.certifiedAt || null,
    addedAt: new Date().toISOString()
  };

  employee.skills.push(skillEntry);
  employee.updatedAt = new Date().toISOString();
  employees.set(userId, employee);
  return skillEntry;
}

/**
 * Add document
 */
export function addDocument(userId, document) {
  const employee = getOrCreateEmployee(userId);

  const doc = {
    id: `doc-${uuidv4().slice(0, 8)}`,
    type: document.type,
    name: document.name,
    url: document.url,
    uploadedAt: new Date().toISOString(),
    expiryDate: document.expiryDate || null
  };

  employee.documents.push(doc);
  employee.updatedAt = new Date().toISOString();
  employees.set(userId, employee);
  return doc;
}

/**
 * Update leave balance
 */
export function updateLeaveBalance(userId, balance) {
  const employee = getOrCreateEmployee(userId);
  employee.leaveBalance = { ...employee.leaveBalance, ...balance };
  employee.updatedAt = new Date().toISOString();
  employees.set(userId, employee);
  return employee;
}

/**
 * Terminate employment
 */
export function terminateEmployment(userId, endDate, reason) {
  const employee = getOrCreateEmployee(userId);
  employee.employmentStatus = 'terminated';
  employee.endDate = endDate || new Date().toISOString();
  employee.terminationReason = reason;
  employee.updatedAt = new Date().toISOString();
  employees.set(userId, employee);
  return employee;
}

/**
 * Get employee stats
 */
export function getEmployeeStats() {
  const all = Array.from(employees.values());

  const byType = {};
  const byStatus = {};
  const byDepartment = {};

  for (const emp of all) {
    byType[emp.employmentType] = (byType[emp.employmentType] || 0) + 1;
    byStatus[emp.employmentStatus] = (byStatus[emp.employmentStatus] || 0) + 1;
    if (emp.department) {
      byDepartment[emp.department] = (byDepartment[emp.department] || 0) + 1;
    }
  }

  return {
    total: all.length,
    byType,
    byStatus,
    byDepartment
  };
}
