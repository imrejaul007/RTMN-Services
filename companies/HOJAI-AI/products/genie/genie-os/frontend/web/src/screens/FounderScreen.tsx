import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

const USER_ID = 'user-001';

interface FounderProfile {
  id: string;
  companyName: string;
  stage: string;
  industry: string;
  mission: string;
  vision: string;
  values: string[];
  runwayMonths: number;
  arr: number;
  customers: number;
  teamSize: number;
}

interface Dashboard {
  profile: FounderProfile;
  kpis: { arr: number; mrr: number; customers: number; runwayMonths: number; teamSize: number };
  milestones: { total: number; done: number; inProgress: number; todo: number; list: Milestone[] };
  okrs: { total: number; averageProgress: number; list: OKR[] };
  team: { size: number; totalEquity: number; list: TeamMember[] };
}

interface Milestone { id: string; title: string; status: string; targetDate?: string; completedAt?: string; notes?: string; }
interface OKR { id: string; objective: string; quarter?: string; keyResults: { id: string; text: string; progress: number }[]; }
interface TeamMember { id: string; name: string; role: string; equity: number; }

interface BoardPersona { id: string; name: string; icon: string; color: string; lens: string; context: string; }
interface Briefing {
  text?: string;
  structured: { state: string; wins: string[]; inProgress: string[]; risks: string[]; next7Days: string[] };
  type: string;
}
interface BoardAdvice { id: string; persona: string; personaName: string; icon: string; color: string; question: string; advice: string; source: string; createdAt: string; }

type Tab = 'dashboard' | 'briefing' | 'board' | 'milestones';

export default function FounderScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [personas, setPersonas] = useState<BoardPersona[]>([]);
  const [history, setHistory] = useState<BoardAdvice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [d, brd] = await Promise.allSettled([
        apiGet<Dashboard>(`${specialists.founder}/founder/dashboard/${USER_ID}`),
        apiGet<{ board: BoardPersona[] }>(`${specialists.founder}/founder/board/${USER_ID}`),
      ]);
      if (d.status === 'fulfilled') setDashboard(d.value);
      if (brd.status === 'fulfilled') setPersonas(brd.value.board || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadBriefing() {
    const res = await apiGet<Briefing>(`${specialists.founder}/founder/briefing/${USER_ID}?type=weekly`);
    setBriefing(res);
  }

  async function loadHistory() {
    try {
      const res = await apiGet<{ advice: BoardAdvice[] }>(`${specialists.founder}/founder/board/history/${USER_ID}`);
      setHistory(res.advice || []);
    } catch {}
  }

  useEffect(() => {
    if (tab === 'briefing' && !briefing) loadBriefing();
    if (tab === 'board' && history.length === 0) loadHistory();
  }, [tab]);

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>🚀 Founder OS</h1>
        </div>
        <div className="loading">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>🚀 {dashboard?.profile.companyName || 'Founder'}</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px', overflowX: 'auto' }}>
        {(['dashboard', 'briefing', 'board', 'milestones'] as Tab[]).map((t) => (
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

      {tab === 'dashboard' && dashboard && <DashboardTab dashboard={dashboard} />}
      {tab === 'briefing' && <BriefingTab briefing={briefing} onRefresh={loadBriefing} />}
      {tab === 'board' && <BoardTab personas={personas} history={history} onAsk={loadHistory} />}
      {tab === 'milestones' && dashboard && <MilestonesTab dashboard={dashboard} onChange={load} />}
    </div>
  );
}

function DashboardTab({ dashboard }: { dashboard: Dashboard }) {
  const { profile, kpis, milestones, okrs, team } = dashboard;
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">🏢 {profile.companyName} <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>({profile.stage})</span></div>
        <div className="muted small">{profile.industry}</div>
        <div style={{ marginTop: 8, fontSize: 13 }}>"{profile.mission}"</div>
      </div>

      <div className="card">
        <div className="card-title">📊 KPIs</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <Kpi label="ARR" value={`$${kpis.arr.toLocaleString()}`} />
          <Kpi label="MRR" value={`$${kpis.mrr.toLocaleString()}`} />
          <Kpi label="Customers" value={`${kpis.customers}`} />
          <Kpi label="Runway" value={`${kpis.runwayMonths}mo`} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">🎯 Milestones ({milestones.done}/{milestones.total})</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, fontSize: 12 }}>
          <Pill color="#7ed321" label={`${milestones.done} done`} />
          <Pill color="#f5a623" label={`${milestones.inProgress} in progress`} />
          <Pill color="#888" label={`${milestones.todo} todo`} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">🎯 OKRs ({okrs.total}) — {okrs.averageProgress}% avg</div>
        {okrs.list.map((o) => (
          <div key={o.id} style={{ marginTop: 10, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{o.objective}</div>
            {o.quarter && <div style={{ fontSize: 11, opacity: 0.6 }}>{o.quarter}</div>}
            <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
              {o.keyResults.map((kr) => (
                <div key={kr.id} style={{ fontSize: 12 }}>
                  <span style={{ opacity: 0.7 }}>• {kr.text}</span> <span style={{ float: 'right', opacity: 0.8 }}>{kr.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">👥 Team ({team.size}) — {team.totalEquity}% allocated</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {team.list.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{m.name} <span style={{ opacity: 0.6 }}>• {m.role}</span></span>
              <span style={{ opacity: 0.7 }}>{m.equity}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BriefingTab({ briefing, onRefresh }: { briefing: Briefing | null; onRefresh: () => Promise<void> }) {
  if (!briefing) {
    return <div className="loading">Generating briefing…</div>;
  }
  const { structured, text, type } = briefing;
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>{type} briefing</div>
        <button onClick={onRefresh} className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>↻ Refresh</button>
      </div>

      {text && (
        <div className="card">
          <div className="card-title">🤖 AI Brief</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 8 }}>{text}</div>
        </div>
      )}

      <Section title="📍 STATE" body={structured.state} />
      <ListSection title="✅ WINS" items={structured.wins} />
      <ListSection title="🔨 IN PROGRESS" items={structured.inProgress} />
      <ListSection title="⚠️ RISKS" items={structured.risks} />
      <ListSection title="🎯 NEXT 7 DAYS" items={structured.next7Days} />
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>{body}</div>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ fontSize: 13 }}>{it}</div>
        ))}
      </div>
    </div>
  );
}

function BoardTab({ personas, history, onAsk }: { personas: BoardPersona[]; history: BoardAdvice[]; onAsk: () => Promise<void> }) {
  const [question, setQuestion] = useState('');
  const [activePersona, setActivePersona] = useState<string>('operator');
  const [asking, setAsking] = useState(false);
  const [latest, setLatest] = useState<BoardAdvice | null>(null);

  async function ask() {
    if (!question.trim()) return;
    setAsking(true);
    try {
      const res = await apiPost<BoardAdvice>(`${specialists.founder}/founder/board/ask/${USER_ID}`, {
        question: question.trim(),
        persona: activePersona,
      });
      setLatest(res);
      setQuestion('');
      await onAsk();
    } catch (e: any) {
      alert(e.message || 'Ask failed');
    } finally {
      setAsking(false);
    }
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">🦉 AI Board of Advisors</div>
        <div className="muted small" style={{ marginTop: 4 }}>Pick a persona, ask a question, get tailored advice.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePersona(p.id)}
              style={{
                padding: 10, borderRadius: 8, cursor: 'pointer',
                background: activePersona === p.id ? p.color : 'rgba(255,255,255,0.05)',
                color: 'white', border: activePersona === p.id ? `2px solid ${p.color}` : '1px solid rgba(255,255,255,0.1)',
                fontSize: 12, textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 18 }}>{p.icon}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{p.name}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{p.lens}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">💬 Ask the board</div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Should I raise now or wait? How do I reduce churn? When should I hire?"
          rows={3}
          style={{
            width: '100%', padding: 10, borderRadius: 8,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'white', fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <button className="btn btn-block" style={{ marginTop: 8 }} disabled={asking} onClick={ask}>
          {asking ? 'Asking…' : `Ask ${personas.find(p => p.id === activePersona)?.name || 'the board'}`}
        </button>
      </div>

      {latest && (
        <div className="card" style={{ borderLeft: `4px solid ${latest.color}` }}>
          <div className="card-title">{latest.icon} {latest.personaName} <span style={{ fontSize: 10, opacity: 0.6 }}>({latest.source})</span></div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Q: {latest.question}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 10, whiteSpace: 'pre-wrap' }}>{latest.advice}</div>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <div className="card-title">📜 History ({history.length})</div>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {history.slice(0, 5).map((h) => (
              <div key={h.id} style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: `3px solid ${h.color}` }}>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{h.icon} {h.personaName} • {new Date(h.createdAt).toLocaleDateString()}</div>
                <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>{h.question}</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8, lineHeight: 1.5 }}>{h.advice.slice(0, 200)}{h.advice.length > 200 ? '…' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MilestonesTab({ dashboard, onChange }: { dashboard: Dashboard; onChange: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await apiPost(`${specialists.founder}/founder/milestones/add/${USER_ID}`, { title: title.trim(), status: 'todo' });
      setTitle('');
      await onChange();
    } finally { setBusy(false); }
  }

  async function complete(id: string) {
    setBusy(true);
    try {
      await apiPost(`${specialists.founder}/founder/milestones/complete/${id}/${USER_ID}`, {});
      await onChange();
    } finally { setBusy(false); }
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ Add milestone</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Hit $5K MRR…"
            style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14 }}
          />
          <button className="btn" disabled={busy} onClick={add}>Add</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">🎯 All milestones</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {dashboard.milestones.list.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, opacity: m.status === 'done' ? 0.6 : 1 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, textDecoration: m.status === 'done' ? 'line-through' : 'none' }}>{m.title}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {m.status === 'done' && '✅ done'}
                  {m.status === 'in_progress' && '🔨 in progress'}
                  {m.status === 'todo' && '⏳ todo'}
                  {m.targetDate && ` • target ${m.targetDate}`}
                </div>
              </div>
              {m.status !== 'done' && (
                <button onClick={() => complete(m.id)} style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', border: '1px solid rgba(140,255,180,0.4)', color: 'rgba(140,255,180,0.85)', borderRadius: 8, cursor: 'pointer' }}>
                  ✓ Done
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ padding: '4px 10px', background: `${color}33`, color, borderRadius: 12, fontSize: 11 }}>{label}</span>
  );
}