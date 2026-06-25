import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense';
}

interface Budget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  spent: number;
  period: string;
}

interface Goal {
  id: string;
  userId: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
}

interface BudgetProgress {
  monthlyIncome: number;
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  daysRemaining: number;
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    amount: number;
    spent: number;
    remaining: number;
    percentUsed: number;
    status: string;
    type: string;
  }>;
}

type View = 'overview' | 'budgets' | 'goals' | 'add';

export default function FinanceScreen() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // Add budget form
  const [bCategory, setBCategory] = useState('');
  const [bAmount, setBAmount] = useState('');
  const [addingBudget, setAddingBudget] = useState(false);

  // Add goal form
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gDeadline, setGDeadline] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [tx, bd, bdProg, gl] = await Promise.allSettled([
        apiGet<{ transactions: Transaction[] }>(`${specialists.money}/api/money/transactions?userId=${USER_ID}`),
        apiGet<{ budgets: Budget[] }>(`${specialists.money}/api/money/budgets?userId=${USER_ID}`),
        apiGet<{ data: BudgetProgress }>(`${specialists.money}/budget/${USER_ID}/progress`),
        apiGet<{ goals: Goal[] }>(`${specialists.money}/api/money/goals?userId=${USER_ID}`),
      ]);
      if (tx.status === 'fulfilled') setTransactions(tx.value.transactions || []);
      if (bd.status === 'fulfilled') setBudgets(bd.value.budgets || []);
      if (bdProg.status === 'fulfilled') setBudgetProgress(bdProg.value.data);
      if (gl.status === 'fulfilled') {
        const allGoals: Goal[] = [];
        (gl.value.goals || []).forEach((g: any) => {
          if (Array.isArray(g)) allGoals.push(...g);
          else allGoals.push(g);
        });
        setGoals(allGoals.filter((g: any) => g.userId === USER_ID));
      }
    } finally {
      setLoading(false);
    }
  }

  async function addBudget() {
    if (!bCategory || !bAmount) return;
    setAddingBudget(true);
    try {
      await apiPost(`${specialists.money}/budget/${USER_ID}/allocate`, {
        categoryId: bCategory.toLowerCase(),
        amount: parseFloat(bAmount),
        description: 'Manual allocation',
      });
      setBCategory('');
      setBAmount('');
      load();
    } catch {
      // Budget not set up yet — create it first
      await apiPost(`${specialists.money}/budget/${USER_ID}`, {
        monthlyIncome: 100000,
        period: 'monthly',
      });
      await apiPost(`${specialists.money}/budget/${USER_ID}/allocate`, {
        categoryId: bCategory.toLowerCase(),
        amount: parseFloat(bAmount),
      });
      setBCategory('');
      setBAmount('');
      load();
    } finally {
      setAddingBudget(false);
    }
  }

  async function addGoal() {
    if (!gName || !gTarget) return;
    setAddingGoal(true);
    try {
      await apiPost(`${specialists.money}/goals`, {
        userId: USER_ID,
        name: gName.trim(),
        target: parseFloat(gTarget),
        deadline: gDeadline || undefined,
      });
      setGName('');
      setGTarget('');
      setGDeadline('');
      load();
    } finally {
      setAddingGoal(false);
    }
  }

  const userTransactions = transactions.filter((t) => t.userId === USER_ID);
  const totalIncome = userTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = userTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const goalColors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>💰 Finance</h1>
        <button onClick={() => setView('add')} className="btn" style={{ fontSize: 12, padding: '6px 12px' }}>+ Track</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', overflowX: 'auto' }}>
        {(['overview', 'budgets', 'goals', 'add'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={view === v ? 'btn' : 'btn-secondary'}
            style={{ fontSize: 11, padding: '6px 12px', flexShrink: 0, textTransform: 'capitalize' }}
          >
            {v === 'add' ? '+ Track' : v}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading…</div>}

      {!loading && view === 'overview' && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Balance card */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: 16,
            padding: '20px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Net Balance</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>₹{netBalance.toLocaleString()}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>Income</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#86efac' }}>+₹{totalIncome.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>Expenses</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5' }}>-₹{totalExpenses.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* 50/30/20 Rule card */}
          {budgetProgress && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">📊 50/30/20 Rule</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
                {[
                  { label: 'Needs', pct: 50, color: '#6366f1', amount: Math.round(budgetProgress.monthlyIncome * 0.5) },
                  { label: 'Wants', pct: 30, color: '#f59e0b', amount: Math.round(budgetProgress.monthlyIncome * 0.3) },
                  { label: 'Savings', pct: 20, color: '#22c55e', amount: Math.round(budgetProgress.monthlyIncome * 0.2) },
                ].map((r) => {
                  const spent = r.label === 'Needs'
                    ? budgetProgress.categories.filter((c) => ['housing', 'utilities', 'food', 'transportation', 'healthcare'].includes(c.id)).reduce((s, c) => s + c.spent, 0)
                    : r.label === 'Wants'
                    ? budgetProgress.categories.filter((c) => ['entertainment', 'personal', 'shopping'].includes(c.id)).reduce((s, c) => s + c.spent, 0)
                    : budgetProgress.categories.filter((c) => ['savings', 'investments'].includes(c.id)).reduce((s, c) => s + c.spent, 0);
                  const pct = r.amount > 0 ? Math.min(100, Math.round((spent / r.amount) * 100)) : 0;
                  return (
                    <div key={r.label} style={{ textAlign: 'center', padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: r.color }}>{pct}%</div>
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 9, opacity: 0.5, marginTop: 2 }}>₹{spent.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Goals mini */}
          {goals.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">🎯 Goals</div>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {goals.slice(0, 3).map((g, i) => {
                  const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
                  return (
                    <div key={g.id} style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{g.name}</span>
                        <span style={{ opacity: 0.6 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: goalColors[i % goalColors.length], transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>₹{g.saved.toLocaleString()} of ₹{g.target.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          <div className="card">
            <div className="card-title">Recent Transactions</div>
            {userTransactions.length === 0 && <div className="muted small" style={{ marginTop: 8 }}>No transactions yet</div>}
            {userTransactions.slice(0, 10).map((t) => (
              <div key={t.id} className="list-item" style={{ padding: '8px 0' }}>
                <div className="list-item-main">
                  <div className="list-item-title">{t.description || t.category}</div>
                  <div className="list-item-sub">{t.category} · {new Date(t.date).toLocaleDateString()}</div>
                </div>
                <div style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--success)' : 'var(--text)' }}>
                  {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && view === 'budgets' && (
        <div style={{ padding: '0 16px 16px' }}>
          {budgetProgress && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Monthly Budget</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                ₹{budgetProgress.totalSpent.toLocaleString()} of ₹{budgetProgress.totalBudgeted.toLocaleString()} spent · {budgetProgress.daysRemaining} days left
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, budgetProgress.percentUsed)}%`,
                  background: budgetProgress.percentUsed > 90 ? 'var(--danger)' : budgetProgress.percentUsed > 75 ? 'var(--warning)' : 'var(--success)',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}

          {budgetProgress?.categories.map((cat) => {
            const pct = cat.amount > 0 ? Math.min(100, Math.round((cat.spent / cat.amount) * 100)) : 0;
            const color = cat.status === 'over' ? 'var(--danger)' : cat.status === 'warning' ? 'var(--warning)' : 'var(--success)';
            return (
              <div key={cat.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>₹{cat.spent.toLocaleString()} of ₹{cat.amount.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color }}>{pct}%</div>
                    {cat.status === 'over' && <div style={{ fontSize: 10, color: 'var(--danger)' }}>Over by ₹{(cat.spent - cat.amount).toLocaleString()}</div>}
                  </div>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}

          {(!budgetProgress || budgetProgress.categories.length === 0) && (
            <div className="empty">
              <div style={{ fontSize: 48 }}>📊</div>
              <div style={{ marginTop: 12 }}>No budgets yet</div>
            </div>
          )}
        </div>
      )}

      {!loading && view === 'goals' && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="card">
            <div className="card-title">🎯 Financial Goals</div>
            {goals.length === 0 && <div className="muted small" style={{ marginTop: 8 }}>No goals yet. Add one below.</div>}
            {goals.map((g, i) => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
              const remaining = g.target - g.saved;
              const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={g.id} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{g.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>₹{g.saved.toLocaleString()} saved of ₹{g.target.toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: goalColors[i % goalColors.length] }}>{pct}%</div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>{daysLeft}d left</div>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: goalColors[i % goalColors.length], transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>₹{remaining.toLocaleString()} remaining</div>
                </div>
              );
            })}
          </div>

          {/* Add goal form */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-title">Add Goal</div>
            <input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Goal name"
              style={{ width: '100%', marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={gTarget} onChange={(e) => setGTarget(e.target.value)} type="number" placeholder="Target amount (₹)"
                style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
              <input value={gDeadline} onChange={(e) => setGDeadline(e.target.value)} type="date"
                style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <button className="btn btn-block" style={{ marginTop: 8 }} disabled={addingGoal || !gName || !gTarget} onClick={addGoal}>
              {addingGoal ? 'Adding…' : 'Add Goal'}
            </button>
          </div>
        </div>
      )}

      {!loading && view === 'add' && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="card">
            <div className="card-title">Log Transaction</div>
            <ExpenseForm onAdded={load} userId={USER_ID} />
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-title">Quick Budget Allocation</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={bCategory} onChange={(e) => setBCategory(e.target.value)} placeholder="Category"
                style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
              <input value={bAmount} onChange={(e) => setBAmount(e.target.value)} type="number" placeholder="₹"
                style={{ width: 100, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <button className="btn btn-block" style={{ marginTop: 8 }} disabled={addingBudget || !bCategory || !bAmount} onClick={addBudget}>
              {addingBudget ? 'Adding…' : 'Allocate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseForm({ onAdded, userId }: { onAdded: () => void; userId: string }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('groceries');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const categories = [
    { id: 'groceries', label: 'Groceries', icon: '🛒' },
    { id: 'dining', label: 'Dining', icon: '🍽️' },
    { id: 'transport', label: 'Transport', icon: '🚗' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { id: 'shopping', label: 'Shopping', icon: '🛍️' },
    { id: 'utilities', label: 'Utilities', icon: '💡' },
    { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { id: 'other', label: 'Other', icon: '📦' },
  ];

  async function addExpense() {
    if (!amount) return;
    setBusy(true);
    try {
      await apiPost(`${specialists.money}/budget/${userId}/allocate`, {
        categoryId: category,
        amount: parseFloat(amount),
        description: description.trim() || category,
      });
      setAmount('');
      setDescription('');
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            style={{
              fontSize: 11, padding: '6px 10px', borderRadius: 20, flexShrink: 0,
              background: category === c.id ? 'var(--primary-soft)' : 'rgba(255,255,255,0.05)',
              border: category === c.id ? '1px solid var(--primary)' : '1px solid var(--border)',
              color: category === c.id ? 'var(--primary)' : 'var(--text)',
            }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount (₹)"
          style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
          style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
      </div>
      <button className="btn btn-block" style={{ marginTop: 8 }} disabled={busy || !amount} onClick={addExpense}>
        {busy ? 'Adding…' : 'Log Expense'}
      </button>
    </div>
  );
}
