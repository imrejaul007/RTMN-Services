const { test } = require('node:test');
const assert = require('node:assert/strict');

const { projectRunway, computeVariance, generateBoardReport, CATEGORIES } = require('../index.js');

// ─── projectRunway ─────────────────────────────────────────────────────

test('projectRunway: healthy when revenue > expenses', () => {
  const r = projectRunway(1_000_000, 50_000, 30_000, 12);
  assert.equal(r.monthlyBurn, -20000);
  assert.equal(r.status, 'profitable');
  assert.ok(r.runwayMonths === Infinity);
});

test('projectRunway: critical when runway < 3 months', () => {
  const r = projectRunway(20_000, 10_000, 25_000, 12);
  assert.equal(r.monthlyBurn, 15000);
  assert.ok(r.runwayMonths < 3, `expected < 3, got ${r.runwayMonths}`);
  assert.equal(r.status, 'critical');
});

test('projectRunway: warning when runway 3-6 months', () => {
  const r = projectRunway(80_000, 10_000, 25_000, 12);
  // 80k / 15k = 5.33 months
  assert.ok(r.runwayMonths >= 3 && r.runwayMonths < 6, `expected 3-6, got ${r.runwayMonths}`);
  assert.equal(r.status, 'warning');
});

test('projectRunway: healthy when runway > 6 months', () => {
  const r = projectRunway(1_000_000, 50_000, 80_000, 12);
  assert.ok(r.runwayMonths > 6);
  assert.equal(r.status, 'healthy');
});

test('projectRunway: produces month-by-month projection', () => {
  const r = projectRunway(100_000, 0, 10_000, 6);
  assert.equal(r.projection.length, 6);
  assert.ok(r.projection[0].month === 1);
  assert.ok(r.projection[5].month === 6);
});

test('projectRunway: projection cash decreases over time', () => {
  const r = projectRunway(100_000, 0, 10_000, 5);
  for (let i = 1; i < r.projection.length; i++) {
    assert.ok(r.projection[i].cashUsd < r.projection[i - 1].cashUsd);
  }
});

test('projectRunway: gives critical recommendation when runway low', () => {
  const r = projectRunway(50_000, 5_000, 25_000, 12);
  assert.ok(r.recommendation.toLowerCase().includes('cut') || r.recommendation.toLowerCase().includes('raise'));
});

// ─── computeVariance ───────────────────────────────────────────────────

test('computeVariance: on-track when within 5%', () => {
  const r = computeVariance(
    [{ category: 'Marketing', amountUsd: 1000 }],
    [{ category: 'Marketing', amountUsd: 1020 }]
  );
  assert.equal(r.variance[0].status, 'on-track');
});

test('computeVariance: minor when 5-15% over', () => {
  const r = computeVariance(
    [{ category: 'Marketing', amountUsd: 1000 }],
    [{ category: 'Marketing', amountUsd: 1100 }]
  );
  assert.equal(r.variance[0].status, 'minor');
});

test('computeVariance: major when >15% over', () => {
  const r = computeVariance(
    [{ category: 'Marketing', amountUsd: 1000 }],
    [{ category: 'Marketing', amountUsd: 1500 }]
  );
  assert.equal(r.variance[0].status, 'major');
});

test('computeVariance: total variance aggregates', () => {
  const r = computeVariance(
    [{ category: 'A', amountUsd: 1000 }, { category: 'B', amountUsd: 500 }],
    [{ category: 'A', amountUsd: 1200 }, { category: 'B', amountUsd: 600 }]
  );
  assert.equal(r.totalPlanned, 1500);
  assert.equal(r.totalActual, 1800);
  assert.equal(r.totalDiff, 300);
});

test('computeVariance: handles missing categories (actual only)', () => {
  const r = computeVariance(
    [{ category: 'Marketing', amountUsd: 1000 }],
    [{ category: 'Marketing', amountUsd: 1200 }, { category: 'NewCat', amountUsd: 500 }]
  );
  assert.equal(r.variance.length, 2);
  const newCat = r.variance.find((v) => v.category === 'NewCat');
  assert.equal(newCat.planned, 0);
  assert.equal(newCat.actual, 500);
});

test('computeVariance: sorts by absolute deviation', () => {
  const r = computeVariance(
    [{ category: 'A', amountUsd: 100 }, { category: 'B', amountUsd: 100 }],
    [{ category: 'A', amountUsd: 105 }, { category: 'B', amountUsd: 150 }]
  );
  assert.equal(r.variance[0].category, 'B'); // bigger deviation first
});

// ─── generateBoardReport ──────────────────────────────────────────────

test('generateBoardReport: computes net income correctly', () => {
  const tx = [
    { type: 'revenue', category: 'Product Sales', amountUsd: 100000 },
    { type: 'expense', category: 'Marketing', amountUsd: 30000 }
  ];
  const r = generateBoardReport('test-co', 'Q1', tx);
  assert.equal(r.summary.totalRevenueUsd, 100000);
  assert.equal(r.summary.totalExpensesUsd, 30000);
  assert.equal(r.summary.netIncomeUsd, 70000);
  assert.equal(r.summary.marginPct, 70);
});

test('generateBoardReport: identifies top category by net', () => {
  const tx = [
    { type: 'revenue', category: 'Product Sales', amountUsd: 100000 },
    { type: 'expense', category: 'Marketing', amountUsd: 50000 },
    { type: 'expense', category: 'Payroll', amountUsd: 30000 }
  ];
  const r = generateBoardReport('test-co', 'Q1', tx);
  assert.equal(r.topCategories[0].category, 'Product Sales');
});

test('generateBoardReport: includes highlights and next steps', () => {
  const r = generateBoardReport('c', 'Q1', [
    { type: 'revenue', category: 'Sales', amountUsd: 1000 },
    { type: 'expense', category: 'Ops', amountUsd: 500 }
  ]);
  assert.ok(Array.isArray(r.highlights));
  assert.ok(Array.isArray(r.nextSteps));
  assert.ok(r.highlights.length > 0);
});

test('generateBoardReport: loss triggers cost-reduction next steps', () => {
  const r = generateBoardReport('c', 'Q1', [
    { type: 'revenue', category: 'Sales', amountUsd: 1000 },
    { type: 'expense', category: 'Ops', amountUsd: 5000 }
  ]);
  assert.ok(r.nextSteps.some((s) => /spending|cost|receiv/i.test(s)));
});

test('generateBoardReport: profit triggers growth next steps', () => {
  const r = generateBoardReport('c', 'Q1', [
    { type: 'revenue', category: 'Sales', amountUsd: 100000 },
    { type: 'expense', category: 'Ops', amountUsd: 50000 }
  ]);
  assert.ok(r.nextSteps.some((s) => /reinvest|growth|revenue/i.test(s)));
});

// ─── Categories ────────────────────────────────────────────────────────

test('CATEGORIES has both revenue and expense buckets', () => {
  assert.ok(Array.isArray(CATEGORIES.revenue));
  assert.ok(Array.isArray(CATEGORIES.expense));
  assert.ok(CATEGORIES.revenue.length > 0);
  assert.ok(CATEGORIES.expense.length > 0);
});

test('CATEGORIES.revenue includes Subscription', () => {
  assert.ok(CATEGORIES.revenue.includes('Subscription'));
});

test('CATEGORIES.expense includes Payroll', () => {
  assert.ok(CATEGORIES.expense.includes('Payroll'));
});