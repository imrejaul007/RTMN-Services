/**
 * HROS CorpPerks Integration
 *
 * Connects Employee Twin Platform to existing CorpPerks backend services:
 * - backend (4006) - Employees, Departments, Leave
 * - payroll-service (4738) - Indian Payroll
 * - meeting-service (4728) - 1:1 Meetings
 * - performance-service (4729) - Reviews, Goals
 * - okr-service (4749) - OKR Tracking
 * - onboarding-service (4732) - Employee Onboarding
 * - exit-service (4733) - Offboarding
 * - lms-service (4734) - Courses, Certificates
 * - shift-service (4739) - Shift Scheduling
 * - compensation-service (4740) - Salary, Benefits
 */

import { Router } from 'express';

const router = Router();

// CorpPerks Service URLs
const CORPPERKS_SERVICES = {
  backend: 'http://localhost:4006',
  payroll: 'http://localhost:4738',
  meeting: 'http://localhost:4728',
  performance: 'http://localhost:4729',
  okr: 'http://localhost:4749',
  onboarding: 'http://localhost:4732',
  exit: 'http://localhost:4733',
  lms: 'http://localhost:4734',
  shift: 'http://localhost:4739',
  compensation: 'http://localhost:4740',
};

// ============================================================
// EMPLOYEE SYNC
// ============================================================

/**
 * Sync employee from CorpPerks backend to Employee Twin
 */
router.post('/sync/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Fetch from CorpPerks backend
    const backendResponse = await fetch(`${CORPPERKS_SERVICES.backend}/api/employees/${employeeId}`);
    const employee = await backendResponse.json();

    // Sync to Employee Twin Platform
    const twinResponse = await fetch('http://localhost:4007/api/twin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: employee.employeeId || employee.id,
        identity: {
          employeeId: employee.employeeId || employee.id,
          personalInfo: {
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
          },
          contactInfo: {
            email: employee.email,
            phone: employee.phone,
          },
          employmentInfo: {
            employeeNumber: employee.employeeCode,
            joiningDate: employee.joiningDate,
            employmentType: employee.employmentType,
            department: employee.department?.name,
            designation: employee.designation,
            location: employee.location,
            manager: employee.managerId,
            status: employee.status,
          },
        },
        verificationStatus: 'pending',
      }),
    });

    const twin = await twinResponse.json();

    res.json({
      success: true,
      synced: {
        employee: employee.id,
        twin: twin.id,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Sync all employees from CorpPerks
 */
router.post('/sync/employees', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    // Fetch from CorpPerks backend
    const backendResponse = await fetch(
      `${CORPPERKS_SERVICES.backend}/api/employees?limit=${limit}&offset=${offset}`
    );
    const { employees = [] } = await backendResponse.json();

    // Sync each to Employee Twin
    const results = await Promise.allSettled(
      employees.map(async (employee: any) => {
        await fetch('http://localhost:4007/api/twin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: employee.id,
            identity: {
              employeeId: employee.id,
              personalInfo: {
                firstName: employee.firstName,
                lastName: employee.lastName,
              },
              employmentInfo: {
                department: employee.department?.name,
                designation: employee.designation,
                status: employee.status,
              },
            },
          }),
        });
        return employee.id;
      })
    );

    const synced = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      synced,
      failed,
      total: employees.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PAYROLL SYNC
// ============================================================

/**
 * Sync payroll data to Compensation Twin
 */
router.post('/sync/payroll/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Fetch from payroll service
    const payrollResponse = await fetch(
      `${CORPPERKS_SERVICES.payroll}/api/payroll/${employeeId}/current`
    );
    const payroll = await payrollResponse.json();

    // Update Employee Twin - Compensation layer
    await fetch(`http://localhost:4007/api/twin/${employeeId}/compensation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current: {
          baseSalary: payroll.baseSalary,
          currency: payroll.currency || 'INR',
          effectiveDate: payroll.effectiveDate,
          salaryBand: payroll.salaryBand,
        },
        components: {
          ctc: payroll.ctc,
          fixed: payroll.fixed,
          variable: payroll.variable,
          equity: payroll.equity,
          benefits: payroll.benefits,
        },
      }),
    });

    res.json({ success: true, payrollSynced: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PERFORMANCE SYNC
// ============================================================

/**
 * Sync performance data to Performance Twin
 */
router.post('/sync/performance/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Fetch from performance service
    const perfResponse = await fetch(
      `${CORPPERKS_SERVICES.performance}/api/employee/${employeeId}`
    );
    const performance = await perfResponse.json();

    // Update Employee Twin - Performance layer
    await fetch(`http://localhost:4007/api/twin/${employeeId}/performance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentCycle: {
          period: performance.currentCycle?.period,
          status: performance.currentCycle?.status,
          goals: performance.currentCycle?.goals || [],
        },
        history: {
          cycles: performance.history?.cycles || [],
          averageRating: performance.history?.averageRating || 0,
          trend: performance.history?.trend || 'stable',
        },
        competencies: performance.competencies || [],
      }),
    });

    res.json({ success: true, performanceSynced: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// LEARNING SYNC
// ============================================================

/**
 * Sync learning data to Learning Twin
 */
router.post('/sync/learning/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Fetch from LMS service
    const lmsResponse = await fetch(
      `${CORPPERKS_SERVICES.lms}/api/employee/${employeeId}/progress`
    );
    const learning = await lmsResponse.json();

    // Update Employee Twin - Learning layer
    await fetch(`http://localhost:4007/api/twin/${employeeId}/learning`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollments: learning.enrollments || [],
        learningHistory: {
          totalCourses: learning.totalCourses || 0,
          completedCourses: learning.completedCourses || 0,
          inProgress: learning.inProgress || 0,
          totalHours: learning.totalHours || 0,
          certifications: learning.certifications || 0,
          lastActivity: learning.lastActivity,
        },
      }),
    });

    // Also update Skills Twin with certifications
    if (learning.certifications?.length > 0) {
      await fetch(`http://localhost:4008/api/profiles/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addCertifications: learning.certifications,
        }),
      });
    }

    res.json({ success: true, learningSynced: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// MEETINGS SYNC
// ============================================================

/**
 * Sync meetings to Relationship Twin
 */
router.post('/sync/meetings/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 10 } = req.query;

    // Fetch from meeting service
    const meetingResponse = await fetch(
      `${CORPPERKS_SERVICES.meeting}/api/employee/${employeeId}/recent?limit=${limit}`
    );
    const meetings = await meetingResponse.json();

    // Update Employee Twin - Relationships
    await fetch(`http://localhost:4007/api/twin/${employeeId}/relationships`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: {
          manager: meetings.manager,
          skipLevelManager: meetings.skipLevelManager,
          peers: meetings.recentPeers || [],
          directReports: meetings.directReports || [],
        },
      }),
    });

    res.json({ success: true, meetingsSynced: meetings.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// SHIFTS SYNC
// ============================================================

/**
 * Sync shifts to Productivity Twin
 */
router.post('/sync/shifts/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Fetch from shift service
    const shiftResponse = await fetch(
      `${CORPPERKS_SERVICES.shift}/api/employee/${employeeId}/schedule`
    );
    const shifts = await shiftResponse.json();

    // Update Employee Twin - Productivity
    await fetch(`http://localhost:4007/api/twin/${employeeId}/productivity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patterns: {
          workStyle: shifts.workStyle || 'flexible',
          meetingLoad: shifts.meetingLoad || 'moderate',
        },
      }),
    });

    res.json({ success: true, shiftsSynced: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// FULL EMPLOYEE SYNC
// ============================================================

/**
 * Full sync all data for an employee
 */
router.post('/sync/full/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Run all syncs in parallel
    const results = await Promise.allSettled([
      // Employee identity
      fetch(`${process.env.HROS_URL || 'http://localhost:4007'}/api/sync/employee/${employeeId}`),
      // Payroll
      fetch(`${process.env.HROS_URL || 'http://localhost:4007'}/api/sync/payroll/${employeeId}`),
      // Performance
      fetch(`${process.env.HROS_URL || 'http://localhost:4007'}/api/sync/performance/${employeeId}`),
      // Learning
      fetch(`${process.env.HROS_URL || 'http://localhost:4007'}/api/sync/learning/${employeeId}`),
      // Meetings
      fetch(`${process.env.HROS_URL || 'http://localhost:4007'}/api/sync/meetings/${employeeId}`),
      // Shifts
      fetch(`${process.env.HROS_URL || 'http://localhost:4007'}/api/sync/shifts/${employeeId}`),
    ]);

    const summary = results.map((r, i) => ({
      sync: ['employee', 'payroll', 'performance', 'learning', 'meetings', 'shifts'][i],
      status: r.status === 'fulfilled' ? 'success' : 'failed',
    }));

    res.json({
      success: true,
      employeeId,
      syncs: summary,
      completedAt: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// BATCH SYNC
// ============================================================

/**
 * Batch sync for department
 */
router.post('/sync/department/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Get employees in department
    const deptResponse = await fetch(
      `${CORPPERKS_SERVICES.backend}/api/departments/${departmentId}/employees`
    );
    const { employees = [] } = await deptResponse.json();

    // Sync each employee
    const results = await Promise.allSettled(
      employees.map(async (emp: any) =>
        fetch(`${process.env.HROS_URL || 'http://localhost:4007'}/api/sync/full/${emp.id}`, {
          method: 'POST',
        })
      )
    );

    const synced = results.filter(r => r.status === 'fulfilled').length;

    res.json({
      success: true,
      departmentId,
      employees: employees.length,
      synced,
      failed: employees.length - synced,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// CORPPERKS SERVICE STATUS
// ============================================================

/**
 * Check CorpPerks services health
 */
router.get('/services/status', async (req, res) => {
  try {
    const services = Object.entries(CORPPERKS_SERVICES);

    const results = await Promise.all(
      services.map(async ([name, url]) => {
        try {
          const response = await fetch(`${url}/health`);
          return {
            name,
            status: response.ok ? 'healthy' : 'degraded',
            url,
          };
        } catch {
          return {
            name,
            status: 'unreachable',
            url,
          };
        }
      })
    );

    res.json({ success: true, services: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
