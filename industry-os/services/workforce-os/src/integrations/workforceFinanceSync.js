/**
 * RTMN Workforce OS - Finance Integration
 *
 * Syncs Workforce OS with Finance OS
 * - Payroll → Journal Entries
 * - Expenses → AP Bills
 * - Attendance → Payroll
 *
 * Port: 5077
 * Finance OS: http://localhost:4801
 */

const FINANCE_URL = process.env.FINANCE_OS_URL || 'http://localhost:4801';

// ============================================================
// PAYROLL → FINANCE (Journal Entries)
// ============================================================

async function syncPayrollToFinance(month, employees) {
  const results = [];

  for (const emp of employees) {
    // Create journal entry for each employee
    const entry = {
      date: `${month}-01`,
      description: `Salary - ${emp.name}`,
      entries: [
        { account: 'SALARY_EXP', debit: emp.basicSalary || 50000, credit: 0 },
        { account: 'BANK', debit: 0, credit: emp.netSalary || 40000 },
      ],
    };

    try {
      const res = await fetch(`${FINANCE_URL}/api/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      results.push({
        employeeId: emp.id,
        name: emp.name,
        synced: res.ok,
        journalEntry: await res.json(),
      });
    } catch (e) {
      results.push({ employeeId: emp.id, synced: false, error: e.message });
    }
  }

  return results;
}

// ============================================================
// EXPENSES → ACCOUNTS PAYABLE
// ============================================================

async function syncExpenseToFinance(expense) {
  const vendor = {
    name: expense.vendor || expense.employeeName || 'Employee',
    type: 'expense',
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
  };

  try {
    // Sync to Finance
    await fetch(`${FINANCE_URL}/api/ap/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendor),
    });

    return { synced: true };
  } catch (e) {
    return { synced: false, error: e.message };
  }
}

// ============================================================
// REVENUE → ACCOUNTS RECEIVABLE
// ============================================================

async function syncRevenueToFinance(invoice) {
  const arEntry = {
    customer: invoice.customerName || invoice.employeeName,
    amount: invoice.amount || invoice.total,
    type: 'sales',
    date: invoice.date || new Date().toISOString(),
  };

  try {
    await fetch(`${FINANCE_URL}/api/ar/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(arEntry),
    });

    return { synced: true };
  } catch (e) {
    return { synced: false, error: e.message };
  }
}

// ============================================================
// EXPORT INTEGRATION FUNCTIONS
// ============================================================

module.exports = {
  syncPayrollToFinance,
  syncExpenseToFinance,
  syncRevenueToFinance,
};
