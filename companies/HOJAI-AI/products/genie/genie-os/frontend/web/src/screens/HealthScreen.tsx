import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Metric { id: string; type: string; value: number; unit: string; date: string; }
interface Dashboard {
  date: string;
  metrics: Record<string, { value: number; unit: string }>;
  meals: { count: number; calories: number };
  workouts: { count: number; calories: number };
  netCalories: number;
}
interface Insights {
  tips: string[];
  source: string;
  workoutsCount: number;
  mealsCount: number;
  caloriesIn: number;
}

type Tab = 'overview' | 'sleep' | 'body';

export default function HealthScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [d, m, i] = await Promise.allSettled([
        apiGet<Dashboard>(`${specialists.wellness}/dashboard/${USER_ID}`),
        apiGet<{ metrics: Metric[] }>(`${specialists.wellness}/metrics/${USER_ID}`),
        apiGet<{ data: Insights }>(`${specialists.wellness}/insights/${USER_ID}`),
      ]);
      if (d.status === 'fulfilled') setDashboard(d.value);
      if (m.status === 'fulfilled') setMetrics(m.value.metrics || []);
      if (i.status === 'fulfilled') setInsights(i.value.data);
    } finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>💚 Health</h1>
        </div>
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>💚 Health</h1>
        <button onClick={() => navigate('/wellness')} className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Full →</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', overflowX: 'auto' }}>
        {(['overview', 'sleep', 'body'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'btn' : 'btn-secondary'}
            style={{ fontSize: 11, padding: '6px 12px', flexShrink: 0, textTransform: 'capitalize' }}
          >
            {t === 'overview' ? 'Overview' : t === 'sleep' ? '😴 Sleep' : '⚖️ Body'}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab dashboard={dashboard} metrics={metrics} insights={insights} />}
      {tab === 'sleep' && <SleepTab metrics={metrics} />}
      {tab === 'body' && <BodyTab metrics={metrics} />}
    </div>
  );
}

function OverviewTab({ dashboard, metrics, insights }: {
  dashboard: Dashboard | null;
  metrics: Metric[];
  insights: Insights | null;
}) {
  const sleepMetrics = metrics.filter(m => m.type === 'sleep').slice(0, 7);
  const avgSleep = sleepMetrics.length > 0 ? sleepMetrics.reduce((s, m) => s + m.value, 0) / sleepMetrics.length : 0;
  const moodMetrics = metrics.filter(m => m.type === 'mood').slice(0, 7);
  const avgMood = moodMetrics.length > 0 ? moodMetrics.reduce((s, m) => s + m.value, 0) / moodMetrics.length : 0;
  const todaySleep = sleepMetrics.find(m => m.date === new Date().toISOString().slice(0, 10));
  const todayMood = moodMetrics.find(m => m.date === new Date().toISOString().slice(0, 10));

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {/* Today's health KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{todaySleep ? `${todaySleep.value}h` : avgSleep > 0 ? `${avgSleep.toFixed(1)}h` : '—'}</div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>Sleep today</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{todayMood ? todayMood.value : avgMood > 0 ? avgMood.toFixed(1) : '—'}</div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>/10 Mood</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{dashboard?.workouts.count ?? 0}</div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>Workouts</div>
        </div>
      </div>

      {/* All today's metrics */}
      {dashboard && Object.keys(dashboard.metrics).length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">📊 Today's Metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            {Object.entries(dashboard.metrics).map(([type, m]) => (
              <MetricTile key={type} type={type} value={m.value} unit={m.unit} />
            ))}
          </div>
        </div>
      )}

      {/* 7-day trend bars */}
      {sleepMetrics.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">📈 7-Day Trends</div>
          <div style={{ marginTop: 10 }}>
            {['sleep', 'mood', 'steps', 'water'].map((type) => {
              const typeMetrics = metrics.filter(m => m.type === type).slice(0, 7).reverse();
              if (typeMetrics.length === 0) return null;
              const max = Math.max(...typeMetrics.map(m => m.value), 1);
              const icons: Record<string, string> = { sleep: '😴', mood: '😊', steps: '👟', water: '💧' };
              const colors: Record<string, string> = { sleep: '#06b6d4', mood: '#ec4899', steps: '#22c55e', water: '#3b82f6' };
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span>{icons[type]} {type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    <span style={{ opacity: 0.5 }}>{typeMetrics[typeMetrics.length - 1]?.value || 0} {typeMetrics[0]?.unit}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 32 }}>
                    {typeMetrics.map((m, i) => (
                      <div key={m.id} style={{
                        flex: 1, height: `${Math.max(8, (m.value / max) * 100)}%`,
                        background: colors[type], borderRadius: 3, minHeight: 4,
                      }} title={`${m.date}: ${m.value}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly insights */}
      {insights && insights.tips.length > 0 && (
        <div className="card">
          <div className="card-title">💡 Weekly Insights</div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {insights.tips.map((t, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.5, padding: 10, background: 'rgba(126,211,33,0.1)', borderRadius: 8, borderLeft: '3px solid #7ed321' }}>
                {t}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 8, textAlign: 'right' }}>{insights.source}</div>
        </div>
      )}
    </div>
  );
}

function SleepTab({ metrics }: { metrics: Metric[] }) {
  const sleepMetrics = metrics.filter(m => m.type === 'sleep').slice(0, 30).reverse();

  const avgHours = sleepMetrics.length > 0 ? sleepMetrics.reduce((s, m) => s + m.value, 0) / sleepMetrics.length : 0;
  const todaySleep = sleepMetrics[sleepMetrics.length - 1];
  const qualityMetrics = metrics.filter(m => m.type === 'sleep_quality').slice(0, 30).reverse();

  // Weekly averages
  const weeklyGroups: Metric[][] = [];
  for (let i = 0; i < sleepMetrics.length; i += 7) {
    weeklyGroups.push(sleepMetrics.slice(i, i + 7));
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {/* Sleep score */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', borderRadius: 16, padding: 20, marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Average Sleep Duration</div>
        <div style={{ fontSize: 48, fontWeight: 800 }}>{avgHours > 0 ? avgHours.toFixed(1) : '—'}<span style={{ fontSize: 24 }}>h</span></div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{sleepMetrics.length} nights tracked</div>
        {todaySleep && (
          <div style={{ marginTop: 8, fontSize: 13 }}>
            Last night: <strong>{todaySleep.value}h</strong> — {todaySleep.value >= 7 ? '✅ Great!' : todaySleep.value >= 6 ? '⚠️ Could be better' : '❌ Need more rest'}
          </div>
        )}
      </div>

      {/* Sleep recommendation */}
      <div className="card" style={{ marginBottom: 12, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>💡 Sleep Tip</div>
        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>
          {avgHours < 7 ? 'You\'re averaging less than 7 hours. Try going to bed 30 minutes earlier to improve recovery and focus.' :
           avgHours >= 8 ? 'Great sleep habits! Consistency is key — keep your sleep schedule regular.' :
           'You\'re close to the recommended 7-8 hours. A slightly earlier bedtime could help.'}
        </div>
      </div>

      {/* 30-day chart */}
      {sleepMetrics.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">😴 30-Day Sleep Chart</div>
          <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 60, marginTop: 10 }}>
            {sleepMetrics.map((m) => {
              const pct = (m.value / 10) * 100;
              const color = m.value >= 7 ? '#22c55e' : m.value >= 6 ? '#f59e0b' : '#ef4444';
              return (
                <div key={m.id} style={{
                  flex: 1, height: `${Math.max(4, pct)}%`,
                  background: color, borderRadius: 2, minWidth: 2,
                }} title={`${m.date}: ${m.value}h`} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, opacity: 0.4, marginTop: 4 }}>
            <span>{sleepMetrics[0]?.date?.slice(5)}</span>
            <span>{sleepMetrics[sleepMetrics.length - 1]?.date?.slice(5)}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10 }}>
            <span style={{ color: '#22c55e' }}>● 7h+ good</span>
            <span style={{ color: '#f59e0b' }}>● 6-7h ok</span>
            <span style={{ color: '#ef4444' }}>● &lt;6h low</span>
          </div>
        </div>
      )}

      {/* Weekly breakdown */}
      {weeklyGroups.length > 0 && (
        <div className="card">
          <div className="card-title">📅 Weekly Averages</div>
          {weeklyGroups.slice(-4).reverse().map((week, i) => {
            const avg = week.reduce((s, m) => s + m.value, 0) / week.length;
            const color = avg >= 7 ? '#22c55e' : avg >= 6 ? '#f59e0b' : '#ef4444';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < weeklyGroups.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 12 }}>Week {weeklyGroups.length - i}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (avg / 10) * 100)}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, width: 32, textAlign: 'right' }}>{avg.toFixed(1)}h</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BodyTab({ metrics }: { metrics: Metric[] }) {
  const bodyMetrics = ['weight', 'steps', 'water', 'heart_rate'].flatMap(type =>
    metrics.filter(m => m.type === type).slice(0, 30).reverse()
  );
  const latestByType: Record<string, Metric> = {};
  metrics.forEach(m => {
    if (['weight', 'steps', 'water', 'heart_rate'].includes(m.type)) {
      if (!latestByType[m.type] || new Date(m.date) > new Date(latestByType[m.type].date)) {
        latestByType[m.type] = m;
      }
    }
  });

  const icons: Record<string, string> = { weight: '⚖️', steps: '👟', water: '💧', heart_rate: '❤️' };
  const colors: Record<string, string> = { weight: '#8b5cf6', steps: '#22c55e', water: '#3b82f6', heart_rate: '#ef4444' };

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {/* Latest body stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {Object.entries(latestByType).map(([type, m]) => (
          <div key={type} style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, borderLeft: `3px solid ${colors[type]}` }}>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{icons[type]} {type.replace('_', ' ')}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{m.value}<span style={{ fontSize: 12, opacity: 0.6 }}> {m.unit}</span></div>
            <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>{new Date(m.date).toLocaleDateString()}</div>
          </div>
        ))}
        {['weight', 'steps', 'water', 'heart_rate'].filter(t => !latestByType[t]).map(type => (
          <div key={type} style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 20, opacity: 0.3 }}>{icons[type]}</div>
            <div style={{ fontSize: 12, opacity: 0.4, marginTop: 4 }}>No data for {type}</div>
          </div>
        ))}
      </div>

      {/* Steps chart */}
      {metrics.filter(m => m.type === 'steps').length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">👟 Steps (7 days)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginTop: 10 }}>
            {metrics.filter(m => m.type === 'steps').slice(0, 7).reverse().map((m) => {
              const goal = 10000;
              const pct = Math.min(100, (m.value / goal) * 100);
              return (
                <div key={m.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 8, opacity: 0.5 }}>{m.value >= 1000 ? `${(m.value / 1000).toFixed(1)}k` : m.value}</div>
                  <div style={{ width: '100%', height: `${Math.max(4, pct * 0.8)}%`, background: pct >= 100 ? '#22c55e' : '#3b82f6', borderRadius: 3 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, opacity: 0.4, marginTop: 4 }}>
            <span>{metrics.filter(m => m.type === 'steps')[0]?.date?.slice(5)}</span>
            <span>Goal: 10k</span>
          </div>
        </div>
      )}

      {/* Water intake chart */}
      {metrics.filter(m => m.type === 'water').length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">💧 Water (7 days)</div>
          <div style={{ display: 'flex', gap: 4, height: 60, alignItems: 'flex-end', marginTop: 10 }}>
            {metrics.filter(m => m.type === 'water').slice(0, 7).reverse().map((m) => {
              const goal = 8;
              const pct = Math.min(100, (m.value / goal) * 100);
              return (
                <div key={m.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 8, opacity: 0.5 }}>{m.value}</div>
                  <div style={{ width: '100%', height: `${Math.max(4, pct * 0.6)}%`, background: '#3b82f6', borderRadius: 3 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, opacity: 0.4, marginTop: 4 }}>
            <span>{metrics.filter(m => m.type === 'water')[0]?.date?.slice(5)}</span>
            <span>Goal: 8 glasses</span>
          </div>
        </div>
      )}

      {/* Heart rate trend */}
      {metrics.filter(m => m.type === 'heart_rate').length > 0 && (
        <div className="card">
          <div className="card-title">❤️ Heart Rate (7 days)</div>
          <div style={{ display: 'flex', gap: 4, height: 60, alignItems: 'flex-end', marginTop: 10 }}>
            {metrics.filter(m => m.type === 'heart_rate').slice(0, 7).reverse().map((m) => {
              const resting = 72;
              const pct = Math.min(100, (m.value / 120) * 100);
              const color = m.value < 60 ? '#3b82f6' : m.value > 100 ? '#ef4444' : '#22c55e';
              return (
                <div key={m.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 8, opacity: 0.5 }}>{m.value}</div>
                  <div style={{ width: '100%', height: `${Math.max(4, pct * 0.6)}%`, background: color, borderRadius: 3 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, opacity: 0.4, marginTop: 4 }}>
            <span>Resting ~72bpm</span>
            <span style={{ color: '#22c55e' }}>● 60-100 normal</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({ type, value, unit }: { type: string; value: number; unit: string }) {
  const icons: Record<string, string> = { weight: '⚖️', sleep: '😴', steps: '👟', water: '💧', mood: '😊', energy: '⚡', heart_rate: '❤️', blood_pressure: '🩺' };
  const colors: Record<string, string> = { weight: '#8b5cf6', sleep: '#06b6d4', steps: '#22c55e', water: '#3b82f6', mood: '#ec4899', energy: '#f59e0b', heart_rate: '#ef4444', blood_pressure: '#ef4444' };

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 20 }}>{icons[type] || '📊'}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: colors[type] || 'var(--text)', marginTop: 4 }}>
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        <span style={{ fontSize: 10, opacity: 0.6 }}> {unit}</span>
      </div>
      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2, textTransform: 'capitalize' }}>{type.replace('_', ' ')}</div>
    </div>
  );
}
