/**
 * HR service — employees, departments, leave.
 *
 * Mirrors the surface of `@hojai/department.workforce` so swapping
 * in the real SDK is a one-import change.
 */

import { randomUUID } from 'node:crypto';
import store from './store.js';

export function listEmployees(filter = {}) {
  return [...store.employees.values()].filter(e => {
    if (filter.status && e.status !== filter.status) return false;
    if (filter.departmentId && e.departmentId !== filter.departmentId) return false;
    return true;
  });
}

export function getEmployee(id) {
  return store.employees.get(id) || null;
}

export function createEmployee({ name, email, role, departmentId, managerId, hireDate, salary }) {
  if (!name || !email || !role) throw new Error('name, email, role required');
  const id = randomUUID();
  const employee = {
    id, name, email, role,
    departmentId: departmentId || 'dept-eng',
    managerId: managerId || null,
    hireDate: hireDate || new Date().toISOString().slice(0, 10),
    status: 'active',
    salary: salary || null,
    performanceRating: null,
    createdAt: new Date().toISOString()
  };
  store.employees.set(id, employee);
  store.log('hr', 'employee.created', { id, name, role });
  return employee;
}

export function updateEmployee(id, patch) {
  const e = store.employees.get(id);
  if (!e) return null;
  const updated = { ...e, ...patch, updatedAt: new Date().toISOString() };
  store.employees.set(id, updated);
  store.log('hr', 'employee.updated', { id, patch });
  return updated;
}

export function listDepartments() {
  return [...store.departments.values()];
}

export function requestLeave({ employeeId, type, from, to, reason }) {
  if (!employeeId || !type || !from || !to) throw new Error('employeeId, type, from, to required');
  const id = randomUUID();
  const days = Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 86400000));
  const leave = {
    id, employeeId, type, from, to, days, reason: reason || '',
    status: 'pending', createdAt: new Date().toISOString()
  };
  store.leaveRequests.set(id, leave);
  store.log('hr', 'leave.requested', { id, employeeId, days });
  return leave;
}

export function listLeaveRequests(filter = {}) {
  return [...store.leaveRequests.values()].filter(l => {
    if (filter.employeeId && l.employeeId !== filter.employeeId) return false;
    if (filter.status && l.status !== filter.status) return false;
    return true;
  });
}

export function approveLeave(id, approverId) {
  const l = store.leaveRequests.get(id);
  if (!l) return null;
  const updated = { ...l, status: 'approved', approverId, approvedAt: new Date().toISOString() };
  store.leaveRequests.set(id, updated);
  store.log('hr', 'leave.approved', { id, approverId });
  return updated;
}
