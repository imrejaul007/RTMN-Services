/**
 * /api/hr/* — HR routes
 * Wraps the hr service. Mirrors `@hojai/department.workforce` shape.
 */

import express from 'express';
import * as hr from '../services/hr.service.js';

const router = express.Router();

router.use(express.json());

router.get('/employees', (req, res) => {
  res.json({ employees: hr.listEmployees({
    status: req.query.status,
    departmentId: req.query.departmentId
  })});
});

router.get('/employees/:id', (req, res) => {
  const e = hr.getEmployee(req.params.id);
  if (!e) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'employee not found' } });
  res.json(e);
});

router.post('/employees', (req, res, next) => {
  try { res.status(201).json(hr.createEmployee(req.body || {})); }
  catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.patch('/employees/:id', (req, res, next) => {
  try {
    const e = hr.updateEmployee(req.params.id, req.body || {});
    if (!e) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'employee not found' } });
    res.json(e);
  } catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.get('/departments', (_req, res) => res.json({ departments: hr.listDepartments() }));

router.get('/leave', (req, res) => {
  res.json({ leaveRequests: hr.listLeaveRequests({
    employeeId: req.query.employeeId,
    status: req.query.status
  })});
});

router.post('/leave', (req, res, next) => {
  try { res.status(201).json(hr.requestLeave(req.body || {})); }
  catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.post('/leave/:id/approve', (req, res, next) => {
  try {
    const l = hr.approveLeave(req.params.id, req.body?.approverId || 'system');
    if (!l) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'leave request not found' } });
    res.json(l);
  } catch (e) { next(Object.assign(e, { status: 400 })); }
});

export default router;
