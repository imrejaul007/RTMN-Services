import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPatch, apiDelete, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Todo { id: string; title: string; priority: string; status: string; due: string | null; tags: string[]; completedAt?: string; }
interface Habit { id: string; title: string; icon: string; frequency: string; todayDone: boolean; currentStreak: number; totalLogs: number; }
interface Block { id: string; title: string; start: string; end: string; type: string; }
interface Today { date: string; todos: { count: number; list: Todo[] }; habits: { total: number; done: number; list: Habit[] }; blocks: { count: number; list: Block[] }; }
interface Stats { totalTodos: number; todosByStatus: Record<string, number>; totalHabits: number; habitCompletion7d: number; overdueTodos: number; }

type Tab = 'today' | 'todos' | 'habits' | 'blocks';

const PRIORITY_COLOR: Record<string, string> = { high: '#ff6b6b', medium: '#ffa500', low: '#4a90e2' };
const BLOCK_COLOR: Record<string, string> = { focus: '#4a90e2', meeting: '#9b59b6', break: '#2ecc71', health: '#e74c3c', personal: '#f39c12', other: '#95a5a6' };

export default function PlannerScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('today');
  const [today, setToday] = useState<Today | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [t, td, h, b, s] = await Promise.allSettled([
        apiGet<Today>(`${specialists.planner}/today/${USER_ID}`),
        apiGet<{ todos: Todo[] }>(`${specialists.planner}/todos/by-user/${USER_ID}`),
        apiGet<{ habits: Habit[] }>(`${specialists.planner}/habits/by-user/${USER_ID}`),
        apiGet<{ blocks: Block[] }>(`${specialists.planner}/blocks/by-user/${USER_ID}`),
        apiGet<{ data: Stats }>(`${specialists.planner}/stats/${USER_ID}`),
      ]);
      if (t.status === 'fulfilled') setToday(t.value);
      if (td.status === 'fulfilled') setTodos(td.value.todos || []);
      if (h.status === 'fulfilled') setHabits(h.value.habits || []);
      if (b.status === 'fulfilled') setBlocks(b.value.blocks || []);
      if (s.status === 'fulfilled') setStats(s.value.data);
    } finally { setLoading(false); }
  }

  if (loading) return (
    <div className="screen">
      <div className="header"><button onClick={() => navigate('/')} className="back-btn">←</button><h1>📋 Planner</h1></div>
      <div className="loading">Loading…</div>
    </div>
  );

  return (
    <div className="screen">
      <div className="header"><button onClick={() => navigate('/')} className="back-btn">←</button><h1>📋 Planner</h1></div>
      {stats && (
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          <Kpi label="📋 Todos" value={`${stats.todosByStatus.pending || 0}`} />
          <Kpi label="✅ Done" value={`${stats.todosByStatus.completed || 0}`} />
          <Kpi label="🧘 Habits" value={`${habits.filter(h => h.todayDone).length}/${habits.length}`} />
          <Kpi label="🔥 Streak" value={`${habits[0]?.currentStreak || 0}d`} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px', overflowX: 'auto' }}>
        {(['today', 'todos', 'habits', 'blocks'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn' : 'btn-secondary'} style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0, textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>
      {tab === 'today' && today && <TodayTab today={today} onToggleHabit={toggleHabit} onToggleTodo={toggleTodo} />}
      {tab === 'todos' && <TodosTab todos={todos} onChanged={load} />}
      {tab === 'habits' && <HabitsTab habits={habits} onToggle={toggleHabit} onDelete={deleteHabit} onAdd={addHabit} />}
      {tab === 'blocks' && <BlocksTab blocks={blocks} onDelete={deleteBlock} onAdd={addBlock} />}
    </div>
  );

  async function toggleHabit(id: string) {
    await apiPost(`${specialists.planner}/habits/${id}/log`);
    await load();
  }
  async function toggleTodo(id: string) {
    await apiPost(`${specialists.planner}/todos/${id}/complete`);
    await load();
  }
  async function deleteHabit(id: string) {
    await apiDelete(`${specialists.planner}/habits/${id}`);
    await load();
  }
  async function addHabit(title: string, icon: string) {
    await apiPost(`${specialists.planner}/habits/by-user/${USER_ID}`, { title, icon });
    await load();
  }
  async function deleteBlock(id: string) {
    await apiDelete(`${specialists.planner}/blocks/${id}`);
    await load();
  }
  async function addBlock(title: string, start: string, end: string, type: string) {
    await apiPost(`${specialists.planner}/blocks/by-user/${USER_ID}`, { title, start, end, type });
    await load();
  }
}

function TodayTab({ today, onToggleHabit, onToggleTodo }: { today: Today; onToggleHabit: (id: string) => void; onToggleTodo: (id: string) => void }) {
  const { date, todos, habits, blocks } = today;
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card"><div className="card-title">📅 {date}</div></div>
      <div className="card">
        <div className="card-title">📋 Today's todos ({todos.count})</div>
        {todos.list.length === 0 ? <div className="muted small" style={{ marginTop: 8 }}>All clear!</div> : (
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {todos.list.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLOR[t.priority] || '#888', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13 }}>{t.title}</span>
                <button onClick={() => onToggleTodo(t.id)} style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(126,211,33,0.15)', border: '1px solid rgba(126,211,33,0.3)', color: '#aaffaa', borderRadius: 6, cursor: 'pointer' }}>Done</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-title">🧘 Habits ({habits.done}/{habits.total})</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {habits.list.map((h) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <span style={{ fontSize: 16 }}>{h.icon}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{h.title}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{h.currentStreak}d 🔥</span>
              {h.todayDone
                ? <span style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(126,211,33,0.2)', color: '#aaffaa', borderRadius: 12 }}>Done</span>
                : <button onClick={() => onToggleHabit(h.id)} style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(74,144,226,0.2)', color: '#7eb0ff', border: '1px solid rgba(74,144,226,0.3)', borderRadius: 6, cursor: 'pointer' }}>Log</button>
              }
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title">⏰ Time blocks ({blocks.count})</div>
        {blocks.list.length === 0 ? <div className="muted small" style={{ marginTop: 8 }}>No blocks scheduled.</div> : (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {blocks.list.map((b) => {
              const start = new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: `${BLOCK_COLOR[b.type] || '#888'}15`, borderLeft: `3px solid ${BLOCK_COLOR[b.type] || '#888'}`, borderRadius: 6 }}>
                  <span style={{ fontSize: 10, color: BLOCK_COLOR[b.type] || '#888', width: 50 }}>{start}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{b.title}</span>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{b.type}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TodosTab({ todos, onChanged }: { todos: Todo[]; onChanged: () => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [busy, setBusy] = useState(false);
  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await apiPost(`${specialists.planner}/todos/by-user/${USER_ID}`, { title: title.trim(), priority });
      setTitle('');
      await onChanged();
    } finally { setBusy(false); }
  }
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ New todo</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?"
            style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }} />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }}>
            {['low', 'medium', 'high'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn" disabled={busy} onClick={add}>Add</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">📋 All todos ({todos.length})</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {todos.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLOR[t.priority] || '#888', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, textDecoration: t.status === 'completed' ? 'line-through' : 'none', opacity: t.status === 'completed' ? 0.5 : 1 }}>{t.title}</div>
                {t.due && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Due: {t.due}</div>}
              </div>
              {t.status !== 'completed' && <button onClick={() => apiPost(`${specialists.planner}/todos/${t.id}/complete`).then(onChanged)} style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(126,211,33,0.15)', border: '1px solid rgba(126,211,33,0.3)', color: '#aaffaa', borderRadius: 6, cursor: 'pointer' }}>Done</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitsTab({ habits, onToggle, onDelete, onAdd }: { habits: Habit[]; onToggle: (id: string) => void; onDelete: (id: string) => void; onAdd: (title: string, icon: string) => void }) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('✨');
  const [busy, setBusy] = useState(false);
  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    try { await onAdd(title.trim(), icon); setTitle(''); } finally { setBusy(false); }
  }
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ New habit</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: 40, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, textAlign: 'center' }} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meditate, Exercise…"
            style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }} />
          <button className="btn" disabled={busy} onClick={add}>Add</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">🧘 Habits ({habits.length})</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {habits.map((h) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>{h.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{h.title}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>🔥 {h.currentStreak} day streak · {h.totalLogs} total logs</div>
              </div>
              {h.todayDone ? <span style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(126,211,33,0.2)', color: '#aaffaa', borderRadius: 12 }}>Done</span>
                : <button onClick={() => onToggle(h.id)} style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(74,144,226,0.2)', color: '#7eb0ff', border: '1px solid rgba(74,144,226,0.3)', borderRadius: 6, cursor: 'pointer' }}>Log</button>
              }
              <button onClick={() => { if (confirm('Delete habit?')) onDelete(h.id); }} style={{ fontSize: 10, padding: '4px 6px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#ffaaaa', borderRadius: 6, cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlocksTab({ blocks, onDelete, onAdd }: { blocks: Block[]; onDelete: (id: string) => void; onAdd: (title: string, start: string, end: string, type: string) => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('focus');
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onAdd(title.trim(), `${today}T09:00:00.000Z`, `${today}T10:00:00.000Z`, type);
      setTitle('');
    } finally { setBusy(false); }
  }
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">⏰ New time block</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deep work, Meeting…"
            style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }}>
            {['focus', 'meeting', 'break', 'health', 'personal', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn" disabled={busy} onClick={add}>Add</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">⏰ Time blocks ({blocks.length})</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {blocks.map((b) => {
            const start = new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const end = new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderLeft: `3px solid ${BLOCK_COLOR[b.type] || '#888'}`, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 10, color: BLOCK_COLOR[b.type] || '#888', width: 45, flexShrink: 0 }}>{start}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{b.title}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: `${BLOCK_COLOR[b.type] || '#888'}20`, color: BLOCK_COLOR[b.type] || '#888' }}>{b.type}</span>
                <button onClick={() => onDelete(b.id)} style={{ fontSize: 10, padding: '4px 6px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#ffaaaa', borderRadius: 6, cursor: 'pointer' }}>✕</button>
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
    <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, textAlign: 'center', flexShrink: 0 }}>
      <div style={{ fontSize: 9, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{value}</div>
    </div>
  );
}
