import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, specialists, getUser, clearToken } from '../services/api';

export default function MeTab() {
  const navigate = useNavigate();
  const user = getUser();
  const userId = user?.id || 'default';

  const [twin, setTwin] = useState<any>(null);
  const [graph, setGraph] = useState<any>(null);
  const [mood, setMood] = useState<any>(null);
  const [money, setMoney] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [t, g, m, mn] = await Promise.allSettled([
        apiGet(`${specialists.memorygraph}/api/identity/${userId}`),
        apiGet(`${specialists.memorygraph}/api/user/${userId}/graph`),
        apiGet(`${specialists.wellness}/api/mood?limit=1`),
        apiGet(`${specialists.money}/api/summary`)
      ]);
      if (t.status === 'fulfilled') setTwin(t.value);
      if (g.status === 'fulfilled') setGraph(g.value);
      if (m.status === 'fulfilled') setMood((m.value as any)?.entries?.[0]);
      if (mn.status === 'fulfilled') setMoney(mn.value);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearToken();
    navigate('/genie');
    window.location.reload();
  }

  if (!user) {
    return (
      <div>
        <h2 className="section-title">👤 Me</h2>
        <div className="card">
          <div className="card-title">Sign in</div>
          <p className="muted small">Sign in to see your twin, scores, and preferences.</p>
          <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => navigate('/onboarding')}>
            Sign in / Sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">👤 Me</h2>

      {/* Profile card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', border: 'none', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700
          }}>
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{user.email}</div>
          </div>
        </div>
      </div>

      {/* Twin summary */}
      {graph && (
        <div className="card">
          <div className="card-title">🪞 My Twin</div>
          <div className="row" style={{ gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div className="muted tiny">Knowledge</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{graph.knowledgeCount || 0}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="muted tiny">Relationships</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{graph.relationshipsCount || 0}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="muted tiny">Active goals</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{graph.activeGoals || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Scores */}
      <div className="card">
        <div className="card-title">📊 Scores</div>
        <div className="list-item">
          <div className="list-item-main">
            <div className="list-item-title">Mood</div>
            <div className="list-item-sub">last 7 days</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {mood?.score ?? '—'} / 10
          </div>
        </div>
        <div className="list-item">
          <div className="list-item-main">
            <div className="list-item-title">Money</div>
            <div className="list-item-sub">this month</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            ${money?.spent ?? '—'}
          </div>
        </div>
        <div className="list-item">
          <div className="list-item-main">
            <div className="list-item-title">Memory</div>
            <div className="list-item-sub">total captured</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {graph?.knowledgeCount ?? '—'}
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 0 }}>
        <div className="card" onClick={() => navigate('/calendar')} style={{ cursor: 'pointer', textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 24 }}>📅</div>
          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>Calendar</div>
        </div>
        <div className="card" onClick={() => navigate('/finance')} style={{ cursor: 'pointer', textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 24 }}>💰</div>
          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>Finance</div>
        </div>
        <div className="card" onClick={() => navigate('/learning')} style={{ cursor: 'pointer', textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 24 }}>🎓</div>
          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>Learning</div>
        </div>
      </div>

      {/* Personal Twin — the avatar that knows you */}
      <div className="card" onClick={() => navigate('/personaltwin')} style={{ cursor: 'pointer' }}>
        <div className="card-title">👤 Personal Twin</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Your digital avatar — the source of truth for every Genie specialist
        </div>
        <button className="btn btn-block">Open Personal Twin</button>
      </div>

      {/* Spiritual Practice — quick link to Spiritual OS */}
      <div className="card" onClick={() => navigate('/spiritual')} style={{ cursor: 'pointer' }}>
        <div className="card-title">🕊️ Spiritual Practice</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Track prayers, gratitude, reflections, and meditation
        </div>
        <button className="btn btn-block">Open Spiritual OS</button>
      </div>

      {/* Life Replay — AI-generated monthly/yearly reviews */}
      <div className="card" onClick={() => navigate('/replay')} style={{ cursor: 'pointer' }}>
        <div className="card-title">🎬 Life Replay</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          AI-generated reviews of your month, year, and life
        </div>
        <button className="btn btn-block">See Your Replays</button>
      </div>

      {/* Future Self — time-shifted advice */}
      <div className="card" onClick={() => navigate('/futureself')} style={{ cursor: 'pointer' }}>
        <div className="card-title">🔮 Future Self</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Get advice from 2035-you, write letters from your future self
        </div>
        <button className="btn btn-block">Ask Your Future Self</button>
      </div>

      {/* Simulation — what-if scenarios */}
      <div className="card" onClick={() => navigate('/simulation')} style={{ cursor: 'pointer' }}>
        <div className="card-title">🧭 What-If Simulator</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Test decisions before you make them — move, job, marriage, kid
        </div>
        <button className="btn btn-block">Run a Simulation</button>
      </div>

      {/* Lock-screen widgets — pinned glanceable Genie */}
      <div className="card" onClick={() => navigate('/widgets')} style={{ cursor: 'pointer' }}>
        <div className="card-title">📱 Lock-Screen Widgets</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Pin glanceable Genie to your phone's home screen
        </div>
        <button className="btn btn-block">Manage Widgets</button>
      </div>

      {/* Personal AI Team — your roster of specialists */}
      <div className="card" onClick={() => navigate('/aiteam')} style={{ cursor: 'pointer' }}>
        <div className="card-title">👥 Personal AI Team</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Your coach, doctor, lawyer, therapist, tutor — all on call
        </div>
        <button className="btn btn-block">Open AI Team</button>
      </div>

      {/* Connected accounts */}
      <div className="card" onClick={() => navigate('/accounts')} style={{ cursor: 'pointer' }}>
        <div className="card-title">🔗 Connected Accounts</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Connect Gmail, Calendar, Photos, Health, Banking
        </div>
        <button className="btn btn-block">Manage Accounts</button>
      </div>

      {/* Household */}
      <div className="card" onClick={() => navigate('/household')} style={{ cursor: 'pointer' }}>
        <div className="card-title">🏠 Household</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Shared lists, meals, chores, and events with your family
        </div>
        <button className="btn btn-block">Open Household</button>
      </div>

      {/* Founder OS */}
      <div className="card" onClick={() => navigate('/founder')} style={{ cursor: 'pointer' }}>
        <div className="card-title">🚀 Founder OS</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          AI co-founder: dashboard, weekly briefing, AI board of advisors
        </div>
        <button className="btn btn-block">Open Founder OS</button>
      </div>

      {/* Teacher */}
      <div className="card" onClick={() => navigate('/teacher')} style={{ cursor: 'pointer' }}>
        <div className="card-title">📚 Teacher</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Real LMS with courses, lessons, quizzes, and progress
        </div>
        <button className="btn btn-block">Start Learning</button>
      </div>

      {/* Research */}
      <div className="card" onClick={() => navigate('/research')} style={{ cursor: 'pointer' }}>
        <div className="card-title">🔬 Research</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Personal research analyst: queries, sources, synthesis
        </div>
        <button className="btn btn-block">Open Research</button>
      </div>

      {/* Wellness */}
      <div className="card" onClick={() => navigate('/wellness')} style={{ cursor: 'pointer' }}>
        <div className="card-title">💪 Wellness</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Health HQ: metrics, workouts, meals, goals, insights
        </div>
        <button className="btn btn-block">Open Wellness</button>
      </div>

      {/* Learner */}
      <div className="card" onClick={() => navigate('/learner')} style={{ cursor: 'pointer' }}>
        <div className="card-title">🎓 Learner</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Spaced repetition flashcards + curated learning paths
        </div>
        <button className="btn btn-block">Open Learner</button>
      </div>

      {/* Creator */}
      <div className="card" onClick={() => navigate('/creator')} style={{ cursor: 'pointer' }}>
        <div className="card-title">✍️ Creator</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Content studio: drafts, templates, and a publishing calendar
        </div>
        <button className="btn btn-block">Open Creator</button>
      </div>

      {/* Planner */}
      <div className="card" onClick={() => navigate('/planner')} style={{ cursor: 'pointer' }}>
        <div className="card-title">📋 Planner</div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Todos, habits, time-blocks, and daily planning
        </div>
        <button className="btn btn-block">Open Planner</button>
      </div>

      {/* Preferences */}
      <div className="card">
        <div className="card-title">⚙️ Preferences</div>
        <button className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => alert('Coming soon')}>
          <div className="list-item-main">
            <div className="list-item-title">Listening mode</div>
            <div className="list-item-sub">Manual · Continuous · Smart</div>
          </div>
          <div className="muted">→</div>
        </button>
        <button className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => alert('Coming soon')}>
          <div className="list-item-main">
            <div className="list-item-title">Notification preferences</div>
            <div className="list-item-sub">Briefings · reminders · insights</div>
          </div>
          <div className="muted">→</div>
        </button>
        <button className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => alert('Coming soon')}>
          <div className="list-item-main">
            <div className="list-item-title">Privacy & data</div>
            <div className="list-item-sub">Export · delete · retention</div>
          </div>
          <div className="muted">→</div>
        </button>
      </div>

      <button className="btn btn-danger btn-block" onClick={logout}>
        Sign out
      </button>

      {loading && <div className="empty"><div className="spinner" /></div>}
    </div>
  );
}