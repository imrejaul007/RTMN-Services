/**
 * CorpID Cloud - Employee Identity Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../../shared/utils/logger.js';
import {
  employees,
  getOrCreateEmployee,
  updateEmployee,
  addSkill,
  addDocument,
  updateLeaveBalance,
  terminateEmployment,
  getEmployeeStats
} from '../models/employee.model.js';

const router = express.Router();

/**
 * Get my employee profile
 * GET /api/employee/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const employee = getOrCreateEmployee(req.user.id);
    res.json({ success: true, employee });
  })
);

/**
 * Update my employee profile
 * PUT /api/employee/me
 */
router.put('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const employee = updateEmployee(req.user.id, req.body);
    dataAudit('employee.profile_updated', req, 'employee', employee.id);
    res.json({ success: true, employee });
  })
);

/**
 * Add skill
 * POST /api/employee/me/skills
 */
router.post('/me/skills',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { name, level, certified, certifiedAt } = req.body;
    if (!name) {
      throw new AppError('Skill name is required', 400, 'VALIDATION_ERROR');
    }

    const skill = addSkill(req.user.id, { name, level, certified, certifiedAt });
    dataAudit('employee.skill_added', req, 'employee_skill', skill.id);

    res.status(201).json({ success: true, skill });
  })
);

/**
 * Add document
 * POST /api/employee/me/documents
 */
router.post('/me/documents',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type, name, url, expiryDate } = req.body;
    if (!type || !name) {
      throw new AppError('Document type and name are required', 400, 'VALIDATION_ERROR');
    }

    const doc = addDocument(req.user.id, { type, name, url, expiryDate });
    dataAudit('employee.document_added', req, 'employee_document', doc.id);

    res.status(201).json({ success: true, document: doc });
  })
);

/**
 * Update leave balance
 * PUT /api/employee/me/leave
 */
router.put('/me/leave',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const employee = updateLeaveBalance(req.user.id, req.body);
    dataAudit('employee.leave_updated', req, 'employee', employee.id);
    res.json({ success: true, leaveBalance: employee.leaveBalance });
  })
);

// ============ ADMIN ROUTES ============

/**
 * Get employee by user ID
 * GET /api/employee/user/:userId
 */
router.get('/user/:userId',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const employee = employees.get(req.params.userId);
    if (!employee) {
      throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
    }
    res.json({ success: true, employee });
  })
);

/**
 * Terminate employment
 * POST /api/employee/user/:userId/terminate
 */
router.post('/user/:userId/terminate',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { endDate, reason } = req.body;
    const employee = terminateEmployment(req.params.userId, endDate, reason);
    dataAudit('employee.terminated', req, 'employee', employee.id, { reason });
    res.json({ success: true, message: 'Employment terminated', employee });
  })
);

/**
 * Get employee statistics
 * GET /api/employee/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const stats = getEmployeeStats();
    res.json({ success: true, stats });
  })
);

export default router;
