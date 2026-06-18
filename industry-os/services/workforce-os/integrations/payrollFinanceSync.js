/**
 * Workforce OS - Payroll Finance Sync
 * Port: 5077
 */

const FINANCE_URL = 'http://localhost:4801';

// Payroll runs → Journal Entries in Finance
app.post('/api/payroll/process/:month', async (req, res) => {
  const { month } = req.params;
  const employees = Array.from(db.employees.values());
  const payrollMonth = month || new Date().toISOString().slice(0, 7);

  const results = {
    payroll: [],
    financeSync: [],
    totalSalary: 0,
    errors: []
  };

  for (const emp of employees) {
    // Calculate payroll
    const basic = emp.salary || 50000;
    const hra = basic * 0.4;
    const allowances = basic * 0.2;
    const deductions = basic * 0.2;
    const netSalary = basic + hra + allowances - deductions;

    // Save payroll locally
    const payroll = {
      id: `PAY-${emp.id}-${payrollMonth}`,
      employeeId: emp.id,
      month: payrollMonth,
      basic,
      hra,
      allowances,
      deductions,
      netSalary,
      status: 'processed'
    };
    db.payroll.set(payroll.id, payroll);
    results.payroll.push(payroll);
    results.totalSalary += netSalary;

    // SYNC TO FINANCE
    try {
      const journalEntry = {
        date: `${payrollMonth}-01`,
        description: `Salary - ${emp.name}`,
        entries: [
          { account: 'SALARY_EXP', debit: basic + allowances, credit: 0 },
          { account: 'DEDUCTIONS', debit: deductions, credit: 0 },
          { account: 'BANK', debit: 0, credit: netSalary }
        ]
      };

      const financeRes = await fetch(`${FINANCE_URL}/api/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journalEntry)
      });

      results.financeSync.push({
        employee: emp.id,
        financeSynced: financeRes.ok
      });
    } catch (e) {
      results.errors.push({ employee: emp.id, error: e.message });
    }
  }

  res.json(results);
});

// Get payroll summary
app.get('/api/payroll/summary', (req, res) => {
  const payroll = Array.from(db.payroll.values());
  const summary = {
    totalEmployees: payroll.length,
    totalSalary: payroll.reduce((s, p) => s + (p.netSalary || 0), 0),
    totalDeductions: payroll.reduce((s, p) => s + (p.deductions || 0), 0),
    departments: {}
  };

  // By department
  payroll.forEach(p => {
    const emp = db.employees.get(p.employeeId);
    if (emp) {
      if (!summary.departments[emp.department]) {
        summary.departments[emp.department] = { count: 0, salary: 0 };
      }
      summary.departments[emp.department].count++;
      summary.departments[emp.department].salary += p.netSalary || 0;
    }
  });

  res.json(summary);
});

// Attendance → Finance
app.post('/api/attendance/:id/process', async (req, res) => {
  const { employeeId } = req.params;
  const attendance = db.attendance.get(employeeId);
  if (!attendance) return res.status(404).json({ error: 'Employee not found' });

  // Sync attendance data
  const summary = {
    employeeId,
    present: attendance.present || 0,
    absent: attendance.absent || 0,
    overtime: attendance.overtime || 0,
    lateArrivals: attendance.late || 0
  };

  // Sync to Finance for compliance
  try {
    await fetch(`${FINANCE_URL}/api/compliance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'attendance',
        employeeId,
        month: new Date().toISOString().slice(0, 7),
        summary
      })
    });
    summary.financeSynced = true;
  } catch (e) {
    summary.financeSynced = false;
  }

  res.json(summary);
});

// Benefits → Finance
app.post('/api/benefits/enroll', async (req, res) => {
  const { employeeId, planId } = req.body;

  const enrollment = {
    id: `BEN-${employeeId}-${planId}`,
    employeeId,
    planId,
    enrolledAt: new Date().toISOString()
  };
  db.benefits.set(enrollment.id, enrollment);

  // Sync to Finance
  try {
    await fetch(`${FINANCE_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId,
        category: 'benefits',
        amount: 0,
        description: `Benefits enrollment: ${planId}`
      })
    });
  } catch (e) {}

  res.json(enrollment);
});

// Training → Finance (Learning Investment)
app.post('/api/training/enroll', async (req, res) => {
  const { employeeId, courseId } = req.body;
  const enrollment = {
    id: `TR-${employeeId}-${courseId}`,
    employeeId,
    courseId,
    status: 'enrolled'
  };
  db.training.set(enrollment.id, enrollment);

  // Sync to Finance
  try {
    await fetch(`${FINANCE_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId,
        category: 'training',
        amount: 0,
        description: `Training: ${courseId}`
      });
  } catch (e) {}

  res.json(enrollment);
});

// Onboarding → Finance
app.post('/api/onboarding/costs', async (req, res) => {
  const { employeeId, costs } = req.body;

  // Sync onboarding costs to Finance
  try {
    costs.forEach(cost => {
      fetch(`${FINANCE_URL}/api/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          description: `Onboarding - ${employeeId}`,
          entries: [
            { account: 'TRAINING_EXP', debit: cost.amount, credit: 0 },
            { account: 'BANK', debit: 0, credit: cost.amount }
          ]
        })
      });
    });
  } catch (e) {}

  res.json({ synced: true, costs: costs.length });
});
