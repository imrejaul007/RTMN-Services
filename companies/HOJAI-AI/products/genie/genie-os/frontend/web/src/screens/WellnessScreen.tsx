import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Metric { id: string; type: string; value: number; unit: string; date: string; }
interface Workout { id: string; type: string; title: string; duration: number; calories: number; date: string; intensity: string; }
interface Meal { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; meal: string; date: string; }
interface Goal { id: string; title: string; metric: string; target: number; unit: string; period: string; progress: number; }
interface Dashboard {
  date: string;
  metrics: Record<string, { value: number; unit: string }>;
  meals: { count: number; calories: number; list: Meal[] };
  workouts: { count: number; calories: number; list: Workout[] };
  netCalories: number;
}
interface Insights {
  period: { from: string; to: string };
  metrics: Record<string, { avg: number; days: number; unit: string }>;
  workoutsCount: number;
  workoutsCalories: number;
  mealsCount: number;
  caloriesIn: number;
  tips: string[];
  source: string;
}

type Tab = 'today' | 'trends' | 'workouts' | 'goals';

export default function WellnessScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('today');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [d, m, w, g, i] = await Promise.allSettled([
        apiGet<Dashboard>(`${specialists.wellness}/dashboard/${USER_ID}`),
        apiGet<{ metrics: Metric[] }>(`${specialists.wellness}/metrics/${USER_ID}`),
        apiGet<{ workouts: Workout[] }>(`${specialists.wellness}/workouts/${USER_ID}`),
        apiGet<{ goals: Goal[] }>(`${specialists.wellness}/goals/${USER_ID}`),
        apiGet<{ data: Insights }>(`${specialists.wellness}/insights/${USER_ID}`),
      ]);
      if (d.status === 'fulfilled') setDashboard(d.value);
      if (m.status === 'fulfilled') setMetrics(m.value.metrics || []);
      if (w.status === 'fulfilled') setWorkouts(w.value.workouts || []);
      if (g.status === 'fulfilled') setGoals(g.value.goals || []);
      if (i.status === 'fulfilled') setInsights(i.value.data);
    } finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>💪 Wellness</h1>
        </div>
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>💪 Wellness</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px', overflowX: 'auto' }}>
        {(['today', 'trends', 'workouts', 'goals'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'btn' : 'btn-secondary'}
            style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0, textTransform: 'capitalize' }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'today' && dashboard && <TodayTab dashboard={dashboard} insights={insights} />}
      {tab === 'trends' && <TrendsTab metrics={metrics} />}
      {tab === 'workouts' && <WorkoutsTab workouts={workouts} onAdded={load} />}
      {tab === 'goals' && <GoalsTab goals={goals} onChanged={load} />}
    </div>
  );
}

function TodayTab({ dashboard, insights }: { dashboard: Dashboard; insights: Insights | null }) {
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">📅 Today ({dashboard.date})</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
          <Kpi label="🔥 Net cal" value={`${dashboard.netCalories}`} />
          <Kpi label="🍽️ In" value={`${dashboard.meals.calories}`} />
          <Kpi label="🏃 Out" value={`${dashboard.workouts.calories}`} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">📊 Today's metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          {Object.entries(dashboard.metrics).map(([type, m]) => (
            <Kpi key={type} label={iconFor(type) + ' ' + capitalize(type)} value={`${Math.round(m.value * 10) / 10} ${m.unit}`} />
          ))}
          {Object.keys(dashboard.metrics).length === 0 && <div className="muted small">No metrics logged yet today.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-title">🍽️ Meals ({dashboard.meals.count})</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {dashboard.meals.list.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{m.name} <span style={{ opacity: 0.6 }}>({m.meal})</span></span>
              <span style={{ opacity: 0.7 }}>{m.calories} cal</span>
            </div>
          ))}
          {dashboard.meals.list.length === 0 && <div className="muted small">No meals logged yet today.</div>}
        </div>
      </div>

      {dashboard.workouts.list.length > 0 && (
        <div className="card">
          <div className="card-title">🏃 Workouts ({dashboard.workouts.count})</div>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {dashboard.workouts.list.map((w) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{w.title} <span style={{ opacity: 0.6 }}>({w.intensity})</span></span>
                <span style={{ opacity: 0.7 }}>{w.duration}min · {w.calories}cal</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights && insights.tips.length > 0 && (
        <div className="card">
          <div className="card-title">💡 Weekly insights <span style={{ fontSize: 10, opacity: 0.6 }}>({insights.source})</span></div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {insights.tips.map((t, i) => (
              <div key={i} style={{ fontSize: 12, lineHeight: 1.5, padding: 8, background: 'rgba(126,211,33,0.1)', borderRadius: 8, borderLeft: '3px solid #7ed321' }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendsTab({ metrics }: { metrics: Metric[] }) {
  const types = Array.from(new Set(metrics.map(m => m.type)));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {types.map((type) => {
        const recent = metrics.filter(m => m.type === type).slice(0, 7).reverse();
        const todayValue = recent.find(m => m.date === today)?.value;
        const avg = recent.length > 0 ? recent.reduce((a, m) => a + m.value, 0) / recent.length : 0;
        const max = Math.max(...recent.map(m => m.value), 1);
        const min = Math.min(...recent.map(m => m.value));

        return (
          <div key={type} className="card">
            <div className="card-title">{iconFor(type)} {capitalize(type)}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>7-day avg: {Math.round(avg * 10) / 10} {recent[0]?.unit}</div>
            {todayValue !== undefined && (
              <div style={{ fontSize: 13, marginTop: 6 }}><strong>Today:</strong> {todayValue} {recent[0]?.unit}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 50, marginTop: 12 }}>
              {recent.map((m) => {
                const pct = max === min ? 50 : ((m.value - min) / (max - min)) * 100;
                return (
                  <div key={m.id} title={`${m.date}: ${m.value} ${m.unit}`} style={{
                    flex: 1, height: `${Math.max(10, pct)}%`, background: '#4a90e2', borderRadius: 2, minHeight: 4,
                  }} />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, opacity: 0.5, marginTop: 4 }}>
              <span>{recent[0]?.date?.slice(5)}</span>
              <span>{recent[recent.length - 1]?.date?.slice(5)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkoutsTab({ workouts, onAdded }: { workouts: Workout[]; onAdded: () => Promise<void> }) {
  const [type, setType] = useState('cardio');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('30');
  const [calories, setCalories] = useState('200');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await apiPost(`${specialists.wellness}/workouts/${USER_ID}`, {
        type, title: title.trim(), duration: parseInt(duration, 10), calories: parseInt(calories, 10),
      });
      setTitle('');
      await onAdded();
    } finally { setBusy(false); }
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ Log workout</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Morning run, Push day…"
          style={{ width: '100%', padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, marginTop: 10, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }}>
            {['cardio', 'strength', 'yoga', 'swimming', 'cycling', 'walking', 'sports', 'other'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" placeholder="min"
            style={{ width: 70, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }} />
          <input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" placeholder="cal"
            style={{ width: 70, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }} />
        </div>
        <button className="btn btn-block" style={{ marginTop: 8 }} disabled={busy} onClick={add}>Log it</button>
      </div>

      <div className="card">
        <div className="card-title">🏋️ All workouts ({workouts.length})</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {workouts.map((w) => (
            <div key={w.id} style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{w.title}</span>
                <span style={{ opacity: 0.6, fontSize: 11 }}>{w.date}</span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{w.type} · {w.duration}min · {w.calories}cal · {w.intensity}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoalsTab({ goals, onChanged }: { goals: Goal[]; onChanged: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('30');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (title.trim().length < 3) return;
    setBusy(true);
    try {
      await apiPost(`${specialists.wellness}/goals/${USER_ID}`, { title: title.trim(), target: parseFloat(target) });
      setTitle('');
      await onChanged();
    } finally { setBusy(false); }
  }

  async function bump(goalId: string, amount: number) {
    await apiPost(`${specialists.wellness}/goals/${goalId}/progress/${USER_ID}?amount=${amount}`, {});
    await onChanged();
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ Add goal</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sleep 8h, Run 5km…"
            style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }} />
          <input value={target} onChange={(e) => setTarget(e.target.value)} type="number"
            style={{ width: 70, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }} />
        </div>
        <button className="btn btn-block" style={{ marginTop: 8 }} disabled={busy} onClick={add}>Add</button>
      </div>

      <div className="card">
        <div className="card-title">🎯 Goals ({goals.length})</div>
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0;
            return (
              <div key={g.id} style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{g.title}</span>
                  <span style={{ opacity: 0.7, fontSize: 11 }}>{g.progress}/{g.target} {g.unit}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#7ed321' : '#4a90e2', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button onClick={() => bump(g.id, 1)} style={{ flex: 1, fontSize: 11, padding: '4px 8px', background: 'rgba(126,211,33,0.15)', border: '1px solid rgba(126,211,33,0.3)', color: '#aaffaa', borderRadius: 6, cursor: 'pointer' }}>+1</button>
                  <button onClick={() => bump(g.id, -1)} style={{ flex: 1, fontSize: 11, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6, cursor: 'pointer' }}>-1</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
      <div style={{ fontSize: 10, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function iconFor(type: string): string {
  const icons: Record<string, string> = {
    weight: '⚖️', sleep: '😴', steps: '👟', water: '💧',
    mood: '😊', energy: '⚡', heart_rate: '❤️', blood_pressure: '🩺', custom: '📊',
  };
  return icons[type] || '📊';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}