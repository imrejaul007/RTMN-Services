import { store } from './store.js';

export function listEmployees() { return store.employees; }
export function listDepartments() { return store.departments; }

export function createEmployee({ name, role, dept, salary }) {
  if (!name || !role) throw new Error('name and role required');
  const e = { id: crypto.randomUUID(), name, role, dept: dept || 'Unassigned', salary: Number(salary) || 0, joinedAt: new Date().toISOString().slice(0, 10) };
  store.employees.unshift(e);
  return e;
}

export function runPayroll({ month }) {
  const total = store.employees.reduce((sum, e) => sum + (e.salary || 0), 0);
  const entry = { id: crypto.randomUUID(), month: month || new Date().toISOString().slice(0, 7), employees: store.employees.length, total, createdAt: new Date().toISOString() };
  store.payrolls.unshift(entry);
  return entry;
}

export function listPayrolls() { return store.payrolls; }
