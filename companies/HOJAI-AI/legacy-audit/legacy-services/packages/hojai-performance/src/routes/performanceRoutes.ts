/**
 * HOJAI Performance Dashboard - API Routes
 *
 * REST endpoints for KPI tracking, evaluations, compensation, and reports.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import {
  KPIUpdateSchema,
  CompensationCalculateSchema,
  LeaderboardQuerySchema,
  ReportGenerateSchema,
} from '../types/index.js';
import { LeaderboardMetric, LeaderboardPeriod } from '../services/leaderboard.js';
import { kpiTracker } from '../services/kpiTracker.js';
import { evaluationEngine } from '../services/evaluationEngine.js';
import { compensationCalculator } from '../services/compensationCalculator.js';
import { leaderboardService } from '../services/leaderboard.js';
import { reportGenerator } from '../services/reportGenerator.js';
import { EmployeeProfile } from '../models/performanceModel.js';

const router = Router();

// ============================================
// HEALTH
// ============================================

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'hojai-performance',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// EMPLOYEE PROFILE ROUTES
// ============================================

// Register Employee Profile
router.post('/api/employees', async (req: Request, res: Response) => {
  try {
    const { employeeId, name, email, role, department, level, baseSalary, tenantId } = req.body;

    if (!employeeId || !name || !email || !role || !department || !tenantId) {
      return res.status(400).json({ error: 'MISSING_REQUIRED_FIELDS' });
    }

    const hourlyRate = baseSalary / (22 * 8); // Assuming 22 work days, 8 hours

    const employee = new EmployeeProfile({
      employeeId,
      name,
      email,
      role,
      department,
      level: level || 1,
      baseSalary: baseSalary || 50000,
      hourlyRate: hourlyRate || 300,
      tenantId,
      hireDate: new Date(),
      status: 'active',
    });

    await employee.save();
    res.status(201).json({ success: true, data: employee });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Employee Profile
router.get('/api/employees/:employeeId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const employee = await EmployeeProfile.findOne({
      employeeId: req.params.employeeId,
      tenantId: tenantId as string,
    });

    if (!employee) {
      return res.status(404).json({ error: 'EMPLOYEE_NOT_FOUND' });
    }

    res.json({ success: true, data: employee });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List Employees
router.get('/api/employees', async (req: Request, res: Response) => {
  try {
    const { tenantId, department, status } = req.query;
    const query: any = { tenantId: tenantId as string };

    if (department) query.department = department;
    if (status) query.status = status;

    const employees = await EmployeeProfile.find(query);
    res.json({ success: true, data: employees, total: employees.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// KPI ROUTES
// ============================================

// Get Employee KPIs
router.get('/api/employee/:id/kpis', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, period, startDate, endDate } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    let kpi;
    if (period) {
      kpi = await kpiTracker.getKPI(id, tenantId as string, period as string);
    } else {
      kpi = await kpiTracker.getKPI(id, tenantId as string);
    }

    if (!kpi) {
      // Initialize KPI if not exists
      kpi = await kpiTracker.initializeKPI(id, tenantId as string);
    }

    // Get trends if requested
    if (req.query.trends === 'true') {
      const trends = await kpiTracker.getKPITrends(id, tenantId as string, 6);
      return res.json({ success: true, data: { ...kpi.toObject(), trends } });
    }

    res.json({ success: true, data: kpi });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Employee KPIs
router.patch('/api/employee/:id/kpis', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const validatedData = KPIUpdateSchema.parse(req.body);
    const kpi = await kpiTracker.updateKPI(
      id,
      tenantId as string,
      validatedData,
      period as string
    );

    res.json({ success: true, data: kpi });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Increment Task Completed
router.post('/api/employee/:id/kpis/task-completed', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, responseTime, customerSatisfaction } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const kpi = await kpiTracker.incrementTaskCompleted(
      id,
      tenantId,
      responseTime,
      customerSatisfaction
    );

    res.json({ success: true, data: kpi });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record Error
router.post('/api/employee/:id/kpis/error', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const kpi = await kpiTracker.recordError(id, tenantId);
    res.json({ success: true, data: kpi });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record Escalation
router.post('/api/employee/:id/kpis/escalation', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const kpi = await kpiTracker.recordEscalation(id, tenantId);
    res.json({ success: true, data: kpi });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record Customer Satisfaction
router.post('/api/employee/:id/kpis/satisfaction', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, rating } = req.body;

    if (!tenantId || rating === undefined) {
      return res.status(400).json({ error: 'TENANT_ID_AND_RATING_REQUIRED' });
    }

    if (rating < 0 || rating > 100) {
      return res.status(400).json({ error: 'RATING_MUST_BE_0_TO_100' });
    }

    const kpi = await kpiTracker.recordCustomerSatisfaction(id, tenantId, rating);
    res.json({ success: true, data: kpi });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record Revenue
router.post('/api/employee/:id/kpis/revenue', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, amount } = req.body;

    if (!tenantId || amount === undefined) {
      return res.status(400).json({ error: 'TENANT_ID_AND_AMOUNT_REQUIRED' });
    }

    const kpi = await kpiTracker.recordRevenue(id, tenantId, amount);
    res.json({ success: true, data: kpi });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Team KPIs
router.get('/api/team/kpis', async (req: Request, res: Response) => {
  try {
    const { tenantId, department, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const kpis = await kpiTracker.getTeamKPIs(
      tenantId as string,
      department as string,
      period as string
    );

    const summary = await kpiTracker.getKPISummary(tenantId as string, period as string);

    res.json({ success: true, data: kpis, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EVALUATION ROUTES
// ============================================

// Get Employee Evaluation
router.get('/api/employee/:id/evaluation', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, period, periodType } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const evaluation = await evaluationEngine.getEvaluation(
      id,
      tenantId as string,
      period as string,
      periodType as any
    );

    if (!evaluation) {
      return res.status(404).json({ error: 'EVALUATION_NOT_FOUND' });
    }

    // Add grade info
    const grade = evaluationEngine.getEvaluationGrade(evaluation.overallScore);

    res.json({
      success: true,
      data: {
        ...evaluation.toObject(),
        grade,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Evaluation History
router.get('/api/employee/:id/evaluations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, limit } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const evaluations = await evaluationEngine.getEvaluationHistory(
      id,
      tenantId as string,
      parseInt(limit as string) || 12
    );

    res.json({ success: true, data: evaluations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run Evaluation
router.post('/api/employee/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, periodType, evaluatorId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const evaluation = await evaluationEngine.evaluateEmployee(
      id,
      tenantId,
      periodType || 'monthly',
      evaluatorId || 'system'
    );

    const grade = evaluationEngine.getEvaluationGrade(evaluation.overallScore);

    res.json({
      success: true,
      data: {
        ...evaluation.toObject(),
        grade,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Batch Evaluate
router.post('/api/evaluate/batch', async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeIds, periodType } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const result = await evaluationEngine.batchEvaluate(
      tenantId,
      employeeIds,
      periodType || 'monthly'
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Evaluation Stats
router.get('/api/evaluations/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const stats = await evaluationEngine.getEvaluationStats(tenantId as string, period as string);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// COMPENSATION ROUTES
// ============================================

// Calculate Compensation
router.post('/api/compensation/calculate', async (req: Request, res: Response) => {
  try {
    const validatedData = CompensationCalculateSchema.parse(req.body);
    const { employeeId, period, overrideBase } = validatedData;
    const tenantId = req.query.tenantId as string || req.body.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const compensation = await compensationCalculator.calculateCompensation(
      employeeId,
      tenantId,
      period,
      overrideBase
    );

    res.json({ success: true, data: compensation });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get Compensation
router.get('/api/compensation/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const compensation = await compensationCalculator.getCompensation(
      employeeId,
      tenantId as string,
      period as string
    );

    if (!compensation) {
      return res.status(404).json({ error: 'COMPENSATION_NOT_FOUND' });
    }

    res.json({ success: true, data: compensation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Compensation History
router.get('/api/compensation/:employeeId/history', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, limit } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const compensations = await compensationCalculator.getCompensationHistory(
      employeeId,
      tenantId as string,
      parseInt(limit as string) || 12
    );

    res.json({ success: true, data: compensations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve Compensation
router.post('/api/compensation/:compensationId/approve', async (req: Request, res: Response) => {
  try {
    const { compensationId } = req.params;
    const { approverId } = req.body;

    const compensation = await compensationCalculator.approveCompensation(
      compensationId,
      approverId || 'system'
    );

    res.json({ success: true, data: compensation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark Compensation as Paid
router.post('/api/compensation/:compensationId/paid', async (req: Request, res: Response) => {
  try {
    const { compensationId } = req.params;

    const compensation = await compensationCalculator.markAsPaid(compensationId);
    res.json({ success: true, data: compensation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Process Payment via Billing
router.post('/api/compensation/:compensationId/process-payment', async (req: Request, res: Response) => {
  try {
    const { compensationId } = req.params;

    const result = await compensationCalculator.processPayment(compensationId);
    res.json({ success: result.success, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Payroll Summary
router.get('/api/payroll/summary', async (req: Request, res: Response) => {
  try {
    const { tenantId, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const summary = await compensationCalculator.getPayrollSummary(
      tenantId as string,
      period as string || format(new Date(), 'yyyy-MM')
    );

    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Bonus Breakdown
router.get('/api/compensation/:employeeId/bonus-breakdown', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const breakdown = await compensationCalculator.getBonusBreakdown(
      employeeId,
      tenantId as string,
      period as string || format(new Date(), 'yyyy-MM')
    );

    res.json({ success: true, data: breakdown });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LEADERBOARD ROUTES
// ============================================

// Get Leaderboard
router.get('/api/leaderboard', async (req: Request, res: Response) => {
  try {
    const { tenantId, metric, period, limit, department } = req.query;
    const offsetValue = parseInt(req.query.offset as string) || 0;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    // Validate query params
    const validatedParams = LeaderboardQuerySchema.parse({
      metric: metric || 'overall',
      period: period || 'monthly',
      limit: limit ? parseInt(limit as string) : 10,
      department: department as string,
    });

    // Try to get existing leaderboard
    let leaderboard = await leaderboardService.getLeaderboard(
      tenantId as string,
      (validatedParams.metric || 'overall') as LeaderboardMetric,
      (validatedParams.period || 'monthly') as LeaderboardPeriod,
      validatedParams.limit || 10,
      offsetValue
    );

    // Generate if not exists
    if (!leaderboard) {
      leaderboard = await leaderboardService.generateLeaderboard(
        tenantId as string,
        (validatedParams.metric || 'overall') as LeaderboardMetric,
        (validatedParams.period || 'monthly') as LeaderboardPeriod,
        validatedParams.department as string
      );
    }

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get Employee Rank
router.get('/api/leaderboard/rank/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, metric, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const rankData = await leaderboardService.getEmployeeRank(
      employeeId,
      tenantId as string,
      (metric as LeaderboardMetric) || 'overall',
      (period as LeaderboardPeriod) || 'monthly'
    );

    res.json({ success: true, data: rankData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Top Performers
router.get('/api/leaderboard/top-performers', async (req: Request, res: Response) => {
  try {
    const { tenantId, period, limit } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const topPerformers = await leaderboardService.getTopPerformers(
      tenantId as string,
      (period as LeaderboardPeriod) || 'monthly',
      parseInt(limit as string) || 5
    );

    res.json({ success: true, data: topPerformers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Most Improved
router.get('/api/leaderboard/most-improved', async (req: Request, res: Response) => {
  try {
    const { tenantId, period, limit } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const mostImproved = await leaderboardService.getMostImproved(
      tenantId as string,
      (period as LeaderboardPeriod) || 'monthly',
      parseInt(limit as string) || 5
    );

    res.json({ success: true, data: mostImproved });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Employee Leaderboard History
router.get('/api/leaderboard/history/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, metric, limit } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const history = await leaderboardService.getEmployeeLeaderboardHistory(
      employeeId,
      tenantId as string,
      (metric as LeaderboardMetric) || 'overall',
      parseInt(limit as string) || 6
    );

    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Compare Two Employees
router.get('/api/leaderboard/compare', async (req: Request, res: Response) => {
  try {
    const { employee1, employee2, tenantId, period } = req.query;

    if (!tenantId || !employee1 || !employee2) {
      return res.status(400).json({ error: 'EMPLOYEE1_EMPLOYEE2_AND_TENANT_REQUIRED' });
    }

    const comparison = await leaderboardService.compareEmployees(
      employee1 as string,
      employee2 as string,
      tenantId as string,
      (period as LeaderboardPeriod) || 'monthly'
    );

    res.json({ success: true, data: comparison });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Department Leaderboard
router.get('/api/leaderboard/departments', async (req: Request, res: Response) => {
  try {
    const { tenantId, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const departmentLeaderboard = await leaderboardService.getDepartmentLeaderboard(
      tenantId as string,
      (period as LeaderboardPeriod) || 'monthly'
    );

    res.json({ success: true, data: departmentLeaderboard });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Regenerate Leaderboard
router.post('/api/leaderboard/regenerate', async (req: Request, res: Response) => {
  try {
    const { tenantId, metric, period, department } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const leaderboard = await leaderboardService.generateLeaderboard(
      tenantId,
      (metric as LeaderboardMetric) || 'overall',
      (period as LeaderboardPeriod) || 'monthly',
      department
    );

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORT ROUTES
// ============================================

// Generate Report
router.post('/api/report/generate', async (req: Request, res: Response) => {
  try {
    const validatedData = ReportGenerateSchema.parse(req.body);
    const { employeeId, reportType, periodStart, periodEnd, format } = validatedData;
    const tenantId = req.query.tenantId as string || req.body.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const startDate = parseISO(periodStart);
    const endDate = parseISO(periodEnd);

    const report = await reportGenerator.generateReport(
      employeeId,
      tenantId,
      startDate,
      endDate,
      reportType || 'individual',
      'api'
    );

    res.json({ success: true, data: report });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get Report
router.get('/api/report/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const report = await reportGenerator.getReport(
      employeeId,
      tenantId as string,
      period as string
    );

    if (!report) {
      return res.status(404).json({ error: 'REPORT_NOT_FOUND' });
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Report History
router.get('/api/report/:employeeId/history', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, limit } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const reports = await reportGenerator.getReportHistory(
      employeeId,
      tenantId as string,
      parseInt(limit as string) || 12
    );

    res.json({ success: true, data: reports });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export Report
router.get('/api/report/:employeeId/export', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, period, format: exportFormat } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const result = await reportGenerator.exportReport(
      employeeId,
      tenantId as string,
      (exportFormat as any) || 'json',
      period as string
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Team Report
router.post('/api/report/team/generate', async (req: Request, res: Response) => {
  try {
    const { tenantId, department, periodStart, periodEnd } = req.body;

    if (!tenantId || !department) {
      return res.status(400).json({ error: 'TENANT_ID_AND_DEPARTMENT_REQUIRED' });
    }

    const reports = await reportGenerator.generateTeamReport(
      tenantId,
      department,
      parseISO(periodStart),
      parseISO(periodEnd),
      'api'
    );

    res.json({ success: true, data: reports, total: reports.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Department Report
router.post('/api/report/department/generate', async (req: Request, res: Response) => {
  try {
    const { tenantId, department, periodStart, periodEnd } = req.body;

    if (!tenantId || !department) {
      return res.status(400).json({ error: 'TENANT_ID_AND_DEPARTMENT_REQUIRED' });
    }

    const report = await reportGenerator.generateDepartmentReport(
      tenantId,
      department,
      parseISO(periodStart),
      parseISO(periodEnd),
      'api'
    );

    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Organization Report
router.post('/api/report/organization/generate', async (req: Request, res: Response) => {
  try {
    const { tenantId, periodStart, periodEnd } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }

    const report = await reportGenerator.generateOrganizationReport(
      tenantId,
      parseISO(periodStart),
      parseISO(periodEnd),
      'api'
    );

    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
